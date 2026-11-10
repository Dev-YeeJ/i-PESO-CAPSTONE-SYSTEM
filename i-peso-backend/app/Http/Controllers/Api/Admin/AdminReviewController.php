<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\EmployerReport;
use App\Models\EmployerReview;
use App\Models\EmployerReviewFlag;
use App\Models\JobSeeker;
use App\Models\WorkerFeedback;
use App\Notifications\NewEmployerReviewNotification;
use App\Notifications\ReviewModeratedNotification;
use App\Services\ActivityLogger;
use App\Services\Feedback\ReputationSummary;
use App\Support\FeedbackAspects;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * PESO's moderation of the Verified Mutual Feedback System (Constituent CRM).
 * Viewing needs CRM access; publishing, hiding and escalating need full CRM
 * access (enforced by the module middleware on non-GET requests).
 *
 * Honest negative reviews stay up: staff act on guideline breaches, not on
 * whether a review is flattering.
 */
class AdminReviewController extends Controller
{
    private const QUEUES = ['attention', 'held', 'disputed', 'reported', 'hidden', 'published', 'all'];

    public function summary(): JsonResponse
    {
        return response()->json([
            'attention' => $this->queue('attention')->count(),
            'held' => EmployerReview::where('status', EmployerReview::HELD)->count(),
            'disputed' => $this->queue('disputed')->count(),
            'reported' => $this->queue('reported')->count(),
            'hidden' => EmployerReview::where('status', EmployerReview::HIDDEN)->count(),
            'published' => EmployerReview::where('status', EmployerReview::PUBLISHED)->count(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'queue' => ['nullable', Rule::in(self::QUEUES)],
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $reviews = $this->queue($filters['queue'] ?? 'attention')
            ->with(['employer', 'seeker', 'flags' => fn ($query) => $query->where('status', EmployerReviewFlag::OPEN)])
            ->when($filters['search'] ?? null, function (Builder $query, string $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $query->where(fn (Builder $nested) => $nested
                    ->where('comment', 'like', $like)
                    ->orWhereHas('employer', fn ($employer) => $employer->where('company_name', 'like', $like))
                    ->orWhereHas('seeker', fn ($seeker) => $seeker->where('first_name', 'like', $like)->orWhere('last_name', 'like', $like)->orWhere('email', 'like', $like)));
            })
            ->latest()
            ->paginate(15);

        return response()->json([
            'reviews' => $reviews->through(fn (EmployerReview $review) => $this->row($review)),
            'flag_reasons' => FeedbackAspects::FLAG_REASONS,
        ]);
    }

    public function show(EmployerReview $review): JsonResponse
    {
        $review->load(['employer', 'seeker', 'reply', 'flags', 'application.jobVacancy', 'placementRecord']);

        return response()->json([
            'review' => $this->row($review) + [
                'public' => ReputationSummary::publicReview($review),
                'hold_reason' => $review->hold_reason,
                'moderation_note' => $review->moderation_note,
                'interaction' => [
                    'source' => $review->application_id ? 'Application' : 'Placement report hire',
                    'job_title' => $review->application?->jobVacancy?->job_title ?? $review->placementRecord?->position,
                    'application_status' => $review->application?->status,
                    'start_date' => ($review->application?->placement_start_date ?? $review->placementRecord?->date_hired)?->toDateString(),
                ],
                'reply' => $review->reply ? [
                    'body' => $review->reply->body,
                    'status' => $review->reply->status,
                    'edited' => $review->reply->edited_at !== null,
                ] : null,
                'flags' => $review->flags->sortByDesc('id')->values()->map(fn (EmployerReviewFlag $flag) => [
                    'id' => $flag->id,
                    'from' => match ($flag->reporter_type) {
                        EmployerReviewFlag::BY_EMPLOYER => 'Employer (dispute)',
                        EmployerReviewFlag::BY_SEEKER => 'Another job seeker',
                        default => 'Automatic check',
                    },
                    'reporter_type' => $flag->reporter_type,
                    'reason' => FeedbackAspects::FLAG_REASONS[$flag->reason] ?? $flag->reason,
                    'details' => $flag->details,
                    'status' => $flag->status,
                    'resolution_note' => $flag->resolution_note,
                    'created_at' => $flag->created_at,
                ]),
                'signals' => $this->signals($review),
            ],
        ]);
    }

    /** Keep or put a review on the company profile; closes the open flags as dismissed. */
    public function publish(Request $request, EmployerReview $review): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);
        $wasPublished = $review->status === EmployerReview::PUBLISHED;
        $review->loadMissing(['employer', 'seeker']);

        $review->update([
            'status' => EmployerReview::PUBLISHED,
            'hold_reason' => null,
            'moderation_note' => $data['note'] ?? null,
            'moderated_by' => $this->admin($request)->admin_id,
            'moderated_at' => now(),
        ]);
        $closed = $this->closeFlags($review, 'dismissed', $data['note'] ?? 'Reviewed by PESO; the review follows the guidelines.', $request);

        if (! $wasPublished) {
            $this->notify($review->seeker, new ReviewModeratedNotification('published', $review->employer?->company_name ?? 'the employer'));
            $this->notify($review->employer, new NewEmployerReviewNotification($review->type, $review->averageRating()));
        }

        ActivityLogger::log('published_employer_review', sprintf(
            '%s review #%d of %s%s.',
            $wasPublished ? 'Kept' : 'Published',
            $review->id,
            $review->employer?->company_name ?? 'an employer',
            $closed ? " and dismissed {$closed} report(s)/dispute(s)" : ''
        ));

        return $this->show($review);
    }

    /** Take a review off the company profile; the reviewer is told why and can edit it. */
    public function hide(Request $request, EmployerReview $review): JsonResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'min:10', 'max:1000']], [
            'note.required' => 'Tell the reviewer which guideline it breaks.',
            'note.min' => 'Tell the reviewer which guideline it breaks (at least 10 characters).',
        ]);
        $review->loadMissing(['employer', 'seeker']);

        $review->update([
            'status' => EmployerReview::HIDDEN,
            'moderation_note' => $data['note'],
            'moderated_by' => $this->admin($request)->admin_id,
            'moderated_at' => now(),
        ]);
        $this->closeFlags($review, 'upheld', $data['note'], $request);

        $this->notify($review->seeker, new ReviewModeratedNotification('hidden', $review->employer?->company_name ?? 'the employer', $data['note']));

        ActivityLogger::log('hid_employer_review', sprintf(
            'Hid review #%d of %s. Reason: %s', $review->id, $review->employer?->company_name ?? 'an employer', $data['note']
        ));

        return $this->show($review);
    }

    /** Hide or restore the employer's reply (e.g. it insults or identifies the reviewer). */
    public function setReplyVisibility(Request $request, EmployerReview $review): JsonResponse
    {
        $data = $request->validate(['visible' => ['required', 'boolean']]);
        $reply = $review->reply()->firstOrFail();

        $reply->update(['status' => $data['visible'] ? 'published' : 'hidden']);

        ActivityLogger::log($data['visible'] ? 'restored_review_reply' : 'hid_review_reply', sprintf(
            '%s the employer reply on review #%d.', $data['visible'] ? 'Restored' : 'Hid', $review->id
        ));

        return $this->show($review);
    }

    /**
     * A review describing misconduct (illegal fees, a fake job, abuse) also
     * goes to Employer Reports so it's investigated, not just displayed.
     */
    public function escalate(Request $request, EmployerReview $review): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', Rule::in(EmployerReport::REASONS)],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
        $review->loadMissing('employer');

        $report = EmployerReport::create([
            'employer_id' => $review->employer_id,
            'seeker_id' => $review->seeker_id,
            'reason' => $data['reason'],
            'description' => trim(sprintf(
                "Opened by PESO from review #%d (%s experience).\n\n%s%s",
                $review->id,
                $review->type,
                $review->comment ?: '(No written comment.)',
                ! empty($data['note']) ? "\n\nStaff note: {$data['note']}" : ''
            )),
            'status' => 'investigating',
        ]);

        ActivityLogger::log('escalated_employer_review', sprintf(
            'Turned review #%d of %s into employer report #%d (%s).',
            $review->id, $review->employer?->company_name ?? 'an employer', $report->id, $data['reason']
        ));

        return response()->json(['message' => "Employer report #{$report->id} opened.", 'report_id' => $report->id]);
    }

    // ── Worker feedback (shown on the admin job seeker profile) ─────────────

    public function seekerWorkerFeedback(int $id): JsonResponse
    {
        $seeker = JobSeeker::findOrFail($id);

        $feedback = WorkerFeedback::query()
            ->with(['employer', 'application.jobVacancy'])
            ->where('seeker_id', $seeker->seeker_id)
            ->latest()
            ->get()
            ->map(fn (WorkerFeedback $item) => [
                'id' => $item->id,
                'employer' => $item->employer?->company_name,
                'job_title' => $item->application?->jobVacancy?->job_title,
                'ratings' => collect(FeedbackAspects::WORKER_ASPECTS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'value' => $item->ratings[$key] ?? null])->values(),
                'would_rehire' => FeedbackAspects::WOULD_REHIRE[$item->would_rehire] ?? $item->would_rehire,
                'comment' => $item->comment,
                'status' => $item->status,
                'moderation_note' => $item->moderation_note,
                'updated_at' => $item->updated_at,
            ]);

        ActivityLogger::log('viewed_worker_feedback', "Opened employers' feedback about job seeker #{$seeker->seeker_id}.");

        return response()->json(['feedback' => $feedback]);
    }

    /** Hide feedback that's discriminatory or not job-related; the worker no longer sees it either. */
    public function setWorkerFeedbackVisibility(Request $request, WorkerFeedback $feedback): JsonResponse
    {
        $data = $request->validate([
            'visible' => ['required', 'boolean'],
            'note' => ['required_if:visible,false', 'nullable', 'string', 'max:1000'],
        ], ['note.required_if' => 'Say why it is being hidden.']);

        $feedback->update([
            'status' => $data['visible'] ? 'visible' : 'hidden',
            'moderation_note' => $data['visible'] ? null : $data['note'],
            'moderated_by' => $this->admin($request)->admin_id,
            'moderated_at' => now(),
        ]);

        ActivityLogger::log($data['visible'] ? 'restored_worker_feedback' : 'hid_worker_feedback', sprintf(
            '%s worker feedback #%d.%s', $data['visible'] ? 'Restored' : 'Hid', $feedback->id, $data['visible'] ? '' : " Reason: {$data['note']}"
        ));

        return response()->json(['message' => $data['visible'] ? 'Feedback restored.' : 'Feedback hidden.']);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function queue(string $queue): Builder
    {
        $openFlag = fn (?string $by = null) => fn (Builder $flags) => $flags
            ->where('status', EmployerReviewFlag::OPEN)
            ->when($by, fn (Builder $query) => $query->where('reporter_type', $by));

        $query = EmployerReview::query();

        return match ($queue) {
            // Held reviews, plus published ones with an open report or dispute.
            'attention' => $query->where(fn (Builder $nested) => $nested
                ->where('status', EmployerReview::HELD)
                ->orWhereHas('flags', $openFlag())),
            'held' => $query->where('status', EmployerReview::HELD),
            'disputed' => $query->whereHas('flags', $openFlag(EmployerReviewFlag::BY_EMPLOYER)),
            'reported' => $query->whereHas('flags', $openFlag(EmployerReviewFlag::BY_SEEKER)),
            'hidden' => $query->where('status', EmployerReview::HIDDEN),
            'published' => $query->where('status', EmployerReview::PUBLISHED),
            default => $query,
        };
    }

    private function row(EmployerReview $review): array
    {
        $openFlags = $review->relationLoaded('flags') ? $review->flags->where('status', EmployerReviewFlag::OPEN) : collect();

        return [
            'id' => $review->id,
            'type' => $review->type,
            'status' => $review->status,
            'employer' => ['id' => $review->employer_id, 'name' => $review->employer?->company_name],
            'reviewer' => [
                'id' => $review->seeker_id,
                'name' => $review->seeker ? trim("{$review->seeker->first_name} {$review->seeker->last_name}") : 'Deleted account',
                'email' => $review->seeker?->email,
            ],
            'average' => $review->averageRating(),
            'recommend' => $review->recommend,
            'comment' => $review->comment,
            'hold_reason' => $review->hold_reason,
            'open_flags' => $openFlags->count(),
            'disputed' => $openFlags->contains('reporter_type', EmployerReviewFlag::BY_EMPLOYER),
            'created_at' => $review->created_at,
            'edited_at' => $review->edited_at,
        ];
    }

    /** Patterns worth a second look; they don't decide anything by themselves. */
    private function signals(EmployerReview $review): array
    {
        $signals = [];

        if ($review->submitted_ip) {
            $sameDevice = EmployerReview::query()
                ->where('employer_id', $review->employer_id)
                ->where('submitted_ip', $review->submitted_ip)
                ->where('seeker_id', '!=', $review->seeker_id)
                ->where('created_at', '>=', $review->created_at->copy()->subDays(2))
                ->count();
            if ($sameDevice > 0) {
                $signals[] = "{$sameDevice} other review(s) of this employer came from the same network within 2 days.";
            }
        }

        $sameDay = EmployerReview::query()
            ->where('seeker_id', $review->seeker_id)
            ->where('employer_id', '!=', $review->employer_id)
            ->whereBetween('created_at', [$review->created_at->copy()->subDay(), $review->created_at->copy()->addDay()])
            ->count();
        if ($sameDay >= 3) {
            $signals[] = "This person reviewed {$sameDay} other employers within a day.";
        }

        return $signals;
    }

    private function closeFlags(EmployerReview $review, string $status, ?string $note, Request $request): int
    {
        return $review->flags()->where('status', EmployerReviewFlag::OPEN)->update([
            'status' => $status,
            'resolution_note' => $note,
            'resolved_by' => $this->admin($request)->admin_id,
            'resolved_at' => now(),
        ]);
    }

    private function notify(?object $notifiable, object $notification): void
    {
        if (! $notifiable) {
            return;
        }

        try {
            $notifiable->notify($notification);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function admin(Request $request): Administrator
    {
        return $request->user();
    }
}
