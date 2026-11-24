<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\EmployerReview;
use App\Models\EmployerReviewFlag;
use App\Models\JobSeeker;
use App\Notifications\NewEmployerReviewNotification;
use App\Services\ActivityLogger;
use App\Services\Feedback\FeedbackEligibility;
use App\Services\Feedback\ReputationSummary;
use App\Services\Feedback\ReviewService;
use App\Services\Feedback\WorkerFeedbackVisibility;
use App\Support\FeedbackAspects;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Job seekers' reviews of employers (Verified Mutual Feedback System). */
class SeekerReviewController extends Controller
{
    public function __construct(
        private readonly FeedbackEligibility $eligibility,
        private readonly ReviewService $reviews,
    ) {}

    /** What they can review, and the reviews they've written. */
    public function index(Request $request): JsonResponse
    {
        $seeker = $this->seeker($request);

        return response()->json([
            'opportunities' => $this->eligibility->opportunitiesFor($seeker),
            'reviews' => EmployerReview::query()
                ->with(['employer', 'reply', 'application.jobVacancy', 'placementRecord'])
                ->where('seeker_id', $seeker->seeker_id)
                ->latest()
                ->get()
                ->map(fn (EmployerReview $review) => $this->ownReview($review)),
            // Employers' private feedback about this seeker (mutual reveal applies).
            'employer_feedback' => WorkerFeedbackVisibility::forWorker($seeker),
            'aspects' => [
                'recruitment' => FeedbackAspects::RECRUITMENT_ASPECTS,
                'limited_recruitment' => FeedbackAspects::LIMITED_RECRUITMENT_ASPECTS,
                // For editing a review written about working there before reviews were unified.
                'employment' => FeedbackAspects::EMPLOYMENT_ASPECTS,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $seeker = $this->seeker($request);

        $data = $request->validate([
            // Reviews are about the hiring process; "working here" reviews are no longer written.
            'type' => ['nullable', Rule::in([FeedbackAspects::RECRUITMENT])],
            'application_id' => ['required', 'integer'],
            'ratings' => ['required', 'array'],
            'recommend' => ['required', 'boolean'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'agree_guidelines' => ['accepted'],
        ], [
            'type.in' => 'Reviews are about the company\'s hiring process.',
            'agree_guidelines.accepted' => 'Please confirm your review follows the community guidelines.',
        ]);
        $data['type'] = FeedbackAspects::RECRUITMENT;

        $review = $this->reviews->submit($seeker, $data, $request->ip());
        $review->load(['employer', 'reply', 'application.jobVacancy', 'placementRecord']);

        if ($review->status === EmployerReview::PUBLISHED) {
            $this->notifyEmployer($review);
        }

        ActivityLogger::logAs($seeker, 'submitted_employer_review', sprintf(
            'Submitted a %s review of %s%s.',
            $review->type,
            $review->employer?->company_name ?? 'an employer',
            $review->status === EmployerReview::HELD ? ' (held for PESO: '.$review->hold_reason.')' : ''
        ));

        return response()->json([
            'message' => $review->status === EmployerReview::HELD
                ? 'Thanks. PESO will check your review before it appears, because of: '.strtolower((string) $review->hold_reason).'.'
                : 'Thanks for your review. It now appears on the company profile.',
            'review' => $this->ownReview($review),
        ], 201);
    }

    public function update(Request $request, EmployerReview $review): JsonResponse
    {
        $seeker = $this->seeker($request);
        abort_unless($review->seeker_id === $seeker->seeker_id, 404);

        $data = $request->validate([
            'type' => ['nullable', Rule::in([FeedbackAspects::RECRUITMENT, FeedbackAspects::EMPLOYMENT])],
            'ratings' => ['required', 'array'],
            'recommend' => ['required', 'boolean'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $this->reviews->update($review, $data);
        $review->load(['employer', 'reply', 'application.jobVacancy', 'placementRecord']);

        ActivityLogger::logAs($seeker, 'edited_employer_review', sprintf(
            'Edited their %s review of %s.', $review->type, $review->employer?->company_name ?? 'an employer'
        ));

        return response()->json([
            'message' => $review->status === EmployerReview::HELD
                ? 'Saved. PESO will check your review before it appears again.'
                : 'Your review was updated.',
            'review' => $this->ownReview($review),
        ]);
    }

    /** Taking a review back removes it from the company profile for good. */
    public function destroy(Request $request, EmployerReview $review): JsonResponse
    {
        $seeker = $this->seeker($request);
        abort_unless($review->seeker_id === $seeker->seeker_id, 404);

        $company = $review->employer?->company_name ?? 'an employer';
        $type = $review->type;
        $review->delete();

        ActivityLogger::logAs($seeker, 'deleted_employer_review', "Took back their {$type} review of {$company}.");

        return response()->json(['message' => 'Your review was removed.']);
    }

    /** A company's reputation: summary plus published reviews, anonymous. */
    public function employerReviews(Request $request, Employer $employer): JsonResponse
    {
        $this->seeker($request);
        abort_unless($employer->verification_status === 'verified', 404, 'Employer is not publicly visible.');

        // One list of every published review. A `type` sent by older app builds is
        // ignored, so their "Hiring process" tab shows the whole unified list.
        $reviews = EmployerReview::query()
            ->published()
            ->with('reply')
            ->where('employer_id', $employer->employer_id)
            ->latest()
            ->paginate(10);

        return response()->json([
            'summary' => ReputationSummary::for($employer),
            'reviews' => $reviews->through(fn (EmployerReview $review) => ReputationSummary::publicReview($review)),
        ]);
    }

    /** Ratings for the job cards on screen: GET /seeker/employer-ratings?ids[]=1&ids[]=2 */
    public function ratings(Request $request): JsonResponse
    {
        $this->seeker($request);

        $data = $request->validate([
            'ids' => ['required', 'array', 'max:100'],
            'ids.*' => ['integer'],
        ]);

        return response()->json(['ratings' => (object) ReputationSummary::badges($data['ids'])]);
    }

    /** The employer hears about a new review (never who wrote it). */
    private function notifyEmployer(EmployerReview $review): void
    {
        try {
            $review->employer?->notify(new NewEmployerReviewNotification($review->type, $review->averageRating()));
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    /** The reviewer's own view: includes status and PESO's note if it was held or hidden. */
    private function ownReview(EmployerReview $review): array
    {
        return ReputationSummary::publicReview($review) + [
            'status' => $review->status,
            'hold_reason' => $review->status === EmployerReview::HELD ? $review->hold_reason : null,
            'moderation_note' => $review->status === EmployerReview::HIDDEN ? $review->moderation_note : null,
            'employer' => ['id' => $review->employer_id, 'name' => $review->employer?->company_name, 'logo' => $review->employer?->company_logo],
            'job_title' => $review->application?->jobVacancy?->job_title ?? $review->placementRecord?->position,
            'application_id' => $review->application_id,
            'placement_record_id' => $review->placement_record_id,
            'ratings_map' => $review->ratings,
            // What this review may be about when edited (hiring process and/or working there).
            'allowed_types' => $this->eligibility->allowedTypes($review->application, $review->placementRecord),
            'created_at' => $review->created_at,
            'edited_at' => $review->edited_at,
        ];
    }

    private function seeker(Request $request): JobSeeker
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker, 403, 'Job seeker account required.');

        return $user;
    }
}
