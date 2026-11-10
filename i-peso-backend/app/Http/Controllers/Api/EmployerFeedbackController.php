<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Employer;
use App\Models\EmployerReview;
use App\Models\EmployerReviewFlag;
use App\Models\EmployerReviewReply;
use App\Models\PlacementRecord;
use App\Models\PlacementReportUpload;
use App\Models\WorkerFeedback;
use App\Services\ActivityLogger;
use App\Services\Feedback\ContentScreen;
use App\Services\Feedback\ReputationSummary;
use App\Services\Feedback\WorkerFeedbackVisibility;
use App\Notifications\WorkerFeedbackReceivedNotification;
use App\Support\FeedbackAspects;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The employer's side of the Verified Mutual Feedback System:
 *  - reviews of their company (anonymous; they can never edit, hide or delete them),
 *  - one public reply per review,
 *  - disputing a review to PESO,
 *  - private feedback about people they hired (only PESO and the worker can read it).
 */
class EmployerFeedbackController extends Controller
{
    // ── Reviews of the company ──────────────────────────────────────────────

    public function reviews(Request $request): JsonResponse
    {
        $employer = $this->employer($request);

        $filters = $request->validate([
            'type' => ['nullable', Rule::in([FeedbackAspects::RECRUITMENT, FeedbackAspects::EMPLOYMENT])],
        ]);

        $reviews = EmployerReview::query()
            ->published()
            ->with(['reply', 'flags' => fn ($query) => $query->where('reporter_type', EmployerReviewFlag::BY_EMPLOYER)->latest()])
            ->where('employer_id', $employer->employer_id)
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->latest()
            ->paginate(10);

        return response()->json([
            'summary' => ReputationSummary::for($employer),
            'reviews' => $reviews->through(fn (EmployerReview $review) => $this->employerView($review)),
            'dispute_reasons' => FeedbackAspects::FLAG_REASONS,
        ]);
    }

    /** One public reply per review; saving again edits it. */
    public function reply(Request $request, EmployerReview $review): JsonResponse
    {
        $employer = $this->employer($request);
        $this->ownReview($employer, $review);

        $data = $request->validate([
            'body' => ['required', 'string', 'min:10', 'max:1500'],
        ], [
            'body.min' => 'Write at least a short sentence.',
        ]);

        $this->screenOrFail('body', $data['body']);

        $existing = $review->loadMissing('reply')->reply;
        EmployerReviewReply::updateOrCreate(
            ['review_id' => $review->id],
            [
                'employer_id' => $employer->employer_id,
                'body' => trim($data['body']),
                'status' => $existing?->status === 'hidden' ? 'hidden' : 'published',
                'edited_at' => $existing ? now() : null,
            ]
        );

        ActivityLogger::logAs($employer, $existing ? 'edited_review_reply' : 'replied_to_review', sprintf(
            '%s a reply to review #%d.', $existing ? 'Edited' : 'Posted', $review->id
        ));

        return response()->json([
            'message' => $existing ? 'Your reply was updated.' : 'Your reply is now shown under the review.',
            'review' => $this->employerView($review->fresh(['reply', 'flags'])),
        ]);
    }

    public function deleteReply(Request $request, EmployerReview $review): JsonResponse
    {
        $employer = $this->employer($request);
        $this->ownReview($employer, $review);

        $review->reply()->delete();
        ActivityLogger::logAs($employer, 'deleted_review_reply', "Removed their reply to review #{$review->id}.");

        return response()->json(['message' => 'Your reply was removed.', 'review' => $this->employerView($review->fresh(['reply', 'flags']))]);
    }

    /** Ask PESO to look at a review the employer believes breaks the guidelines. It stays up meanwhile. */
    public function dispute(Request $request, EmployerReview $review): JsonResponse
    {
        $employer = $this->employer($request);
        $this->ownReview($employer, $review);

        $data = $request->validate([
            'reason' => ['required', Rule::in(array_keys(FeedbackAspects::FLAG_REASONS))],
            'details' => ['required', 'string', 'min:20', 'max:2000'],
        ], [
            'details.required' => 'Explain what is wrong, so PESO can check it.',
            'details.min' => 'Explain what is wrong in a bit more detail (at least 20 characters).',
        ]);

        $open = $review->flags()
            ->where('reporter_type', EmployerReviewFlag::BY_EMPLOYER)
            ->where('status', EmployerReviewFlag::OPEN)
            ->exists();
        abort_if($open, 422, 'You already disputed this review. PESO is looking into it.');

        $review->flags()->create([
            'reporter_type' => EmployerReviewFlag::BY_EMPLOYER,
            'reporter_id' => $employer->employer_id,
            'reason' => $data['reason'],
            'details' => $data['details'],
        ]);

        ActivityLogger::logAs($employer, 'disputed_review', sprintf(
            'Disputed review #%d to PESO (%s).', $review->id, FeedbackAspects::FLAG_REASONS[$data['reason']]
        ));

        return response()->json([
            'message' => 'Sent to PESO. The review stays up while they look into it.',
            'review' => $this->employerView($review->fresh(['reply', 'flags'])),
        ]);
    }

    // ── Feedback about hires (private) ──────────────────────────────────────

    /** Everyone this employer hired (tracker or approved placement report), and any feedback given. */
    public function hires(Request $request): JsonResponse
    {
        $employer = $this->employer($request);
        $feedback = WorkerFeedback::query()->where('employer_id', $employer->employer_id)->get();

        $applications = Application::query()
            ->with(['jobSeeker', 'jobVacancy'])
            ->where('status', 'hired')
            ->whereHas('jobVacancy', fn ($query) => $query->where('employer_id', $employer->employer_id))
            ->latest('status_changed_at')
            ->get()
            ->filter(fn (Application $application) => $application->jobSeeker !== null)
            ->map(fn (Application $application) => $this->hireView(
                'application', $application->apply_id, $application->jobSeeker, $application->jobVacancy?->job_title,
                $application->placement_start_date, $feedback->firstWhere('application_id', $application->apply_id)
            ));

        $hiredSeekers = $applications->pluck('seeker_id');

        $placements = PlacementRecord::query()
            ->with('seeker')
            ->where('employer_id', $employer->employer_id)
            ->whereNotNull('seeker_id')
            ->whereHas('upload', fn ($query) => $query->where('status', PlacementReportUpload::STATUS_APPROVED))
            ->get()
            ->reject(fn (PlacementRecord $record) => $record->seeker === null || $hiredSeekers->contains($record->seeker_id))
            ->map(fn (PlacementRecord $record) => $this->hireView(
                'placement', $record->id, $record->seeker, $record->position,
                $record->date_hired, $feedback->firstWhere('placement_record_id', $record->id)
            ));

        return response()->json([
            'hires' => $applications->concat($placements)->values(),
            'aspects' => FeedbackAspects::WORKER_ASPECTS,
            'would_rehire' => FeedbackAspects::WOULD_REHIRE,
        ]);
    }

    public function saveWorkerFeedback(Request $request): JsonResponse
    {
        $employer = $this->employer($request);

        $data = $request->validate([
            'application_id' => ['nullable', 'integer', 'required_without:placement_record_id'],
            'placement_record_id' => ['nullable', 'integer'],
            'ratings' => ['required', 'array'],
            'would_rehire' => ['required', Rule::in(array_keys(FeedbackAspects::WOULD_REHIRE))],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        [$seekerId, $startDate, $source] = $this->resolveHire($employer, $data);

        if ($startDate && Carbon::parse($startDate)->toDateString() > Carbon::now('Asia/Manila')->toDateString()) {
            throw ValidationException::withMessages(['application_id' => 'You can give feedback from their start date.']);
        }

        $ratings = [];
        $errors = [];
        foreach (FeedbackAspects::WORKER_ASPECTS as $key => $label) {
            $value = $data['ratings'][$key] ?? null;
            if (! is_numeric($value) || (int) $value != $value || $value < 1 || $value > 5) {
                $errors["ratings.{$key}"] = "Rate {$label} from 1 to 5 stars.";

                continue;
            }
            $ratings[$key] = (int) $value;
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $comment = trim((string) ($data['comment'] ?? '')) ?: null;
        $this->screenOrFail('comment', $comment);

        $existing = WorkerFeedback::query()->where($source)->first();
        $feedback = WorkerFeedback::updateOrCreate($source, [
            'employer_id' => $employer->employer_id,
            'seeker_id' => $seekerId,
            'ratings' => $ratings,
            'would_rehire' => $data['would_rehire'],
            'comment' => $comment,
            'edited_at' => $existing ? now() : null,
        ]);

        if (! $existing) {
            try {
                $feedback->loadMissing('seeker')->seeker?->notify(new WorkerFeedbackReceivedNotification(
                    $employer->company_name,
                    WorkerFeedbackVisibility::visibleFrom($feedback)->timezone('Asia/Manila')->format('F j, Y'),
                ));
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        ActivityLogger::logAs($employer, $existing ? 'edited_worker_feedback' : 'gave_worker_feedback', sprintf(
            '%s private feedback about a hire (worker feedback #%d).', $existing ? 'Edited' : 'Gave', $feedback->id
        ));

        return response()->json([
            'message' => 'Saved. Only PESO and the worker can see this feedback.',
            'feedback' => $this->feedbackView($feedback),
        ], $existing ? 200 : 201);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function employerView(EmployerReview $review): array
    {
        $dispute = $review->relationLoaded('flags')
            ? $review->flags->where('reporter_type', EmployerReviewFlag::BY_EMPLOYER)->sortByDesc('id')->first()
            : null;

        return ReputationSummary::publicReview($review) + [
            'own_reply' => $review->reply ? [
                'body' => $review->reply->body,
                'status' => $review->reply->status,
                'edited' => $review->reply->edited_at !== null,
            ] : null,
            'dispute' => $dispute ? [
                'status' => $dispute->status,
                'reason' => FeedbackAspects::FLAG_REASONS[$dispute->reason] ?? $dispute->reason,
                'resolution_note' => $dispute->resolution_note,
            ] : null,
        ];
    }

    private function hireView(string $source, int $id, $seeker, ?string $title, $startDate, ?WorkerFeedback $feedback): array
    {
        $start = $startDate ? Carbon::parse($startDate)->toDateString() : null;

        return [
            'source' => $source,
            'source_id' => $id,
            'seeker_id' => $seeker->seeker_id,
            'name' => trim("{$seeker->first_name} {$seeker->last_name}"),
            'job_title' => $title,
            'start_date' => $start,
            'can_give_feedback' => $start === null || $start <= Carbon::now('Asia/Manila')->toDateString(),
            'feedback' => $feedback ? $this->feedbackView($feedback) : null,
        ];
    }

    private function feedbackView(WorkerFeedback $feedback): array
    {
        return [
            'id' => $feedback->id,
            'ratings' => $feedback->ratings,
            'would_rehire' => $feedback->would_rehire,
            'comment' => $feedback->comment,
            'status' => $feedback->status,
            'updated_at' => $feedback->updated_at,
        ];
    }

    /** @return array{0: int, 1: mixed, 2: array} [seeker id, start date, source columns] */
    private function resolveHire(Employer $employer, array $data): array
    {
        if (! empty($data['application_id'])) {
            $application = Application::query()
                ->with('jobVacancy')
                ->where('apply_id', $data['application_id'])
                ->where('status', 'hired')
                ->first();

            abort_unless($application && $application->jobVacancy?->employer_id === $employer->employer_id, 404, 'That hire was not found.');

            return [$application->seeker_id, $application->placement_start_date, ['application_id' => $application->apply_id]];
        }

        $record = PlacementRecord::query()
            ->where('id', $data['placement_record_id'] ?? 0)
            ->where('employer_id', $employer->employer_id)
            ->whereNotNull('seeker_id')
            ->whereHas('upload', fn ($query) => $query->where('status', PlacementReportUpload::STATUS_APPROVED))
            ->first();

        abort_unless($record, 404, 'That hire was not found.');

        return [$record->seeker_id, $record->date_hired, ['placement_record_id' => $record->id]];
    }

    /** Employers write their own text, so a failed check is sent back to fix rather than held. */
    private function screenOrFail(string $field, ?string $text): void
    {
        $reasons = ContentScreen::check($text);
        if ($reasons !== []) {
            throw ValidationException::withMessages([
                $field => 'Please remove this from your text: '.strtolower((string) ContentScreen::describe($reasons)).'.',
            ]);
        }
    }

    private function ownReview(Employer $employer, EmployerReview $review): void
    {
        abort_unless(
            $review->employer_id === $employer->employer_id && $review->status === EmployerReview::PUBLISHED,
            404,
            'Review not found.'
        );
    }

    private function employer(Request $request): Employer
    {
        $user = $request->user();
        abort_unless($user instanceof Employer, 403, 'Employer account required.');

        return $user;
    }
}
