<?php

namespace App\Services\Feedback;

use App\Models\Employer;
use App\Models\EmployerReview;
use App\Support\FeedbackAspects;
use Illuminate\Support\Collection;

/**
 * What job seekers see about an employer: recruitment and employment shown
 * separately, built only from published, verified reviews.
 *
 *  - Each person counts once per employer and type (their latest review), so
 *    applying to five jobs doesn't give five votes.
 *  - Averages, strengths and areas to improve only appear once MIN_REVIEWS
 *    people have reviewed; below that the page says there aren't enough yet.
 */
class ReputationSummary
{
    public const MIN_REVIEWS = 3;

    public const STRENGTH_AT = 4.0;

    public const IMPROVE_AT = 3.0;

    public static function for(Employer $employer): array
    {
        $reviews = EmployerReview::query()
            ->published()
            ->where('employer_id', $employer->employer_id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return [
            'min_reviews' => self::MIN_REVIEWS,
            'recruitment' => self::section($reviews->where('type', FeedbackAspects::RECRUITMENT), FeedbackAspects::RECRUITMENT_ASPECTS),
            'employment' => self::section($reviews->where('type', FeedbackAspects::EMPLOYMENT), FeedbackAspects::EMPLOYMENT_ASPECTS),
        ];
    }

    private static function section(Collection $reviews, array $aspects): array
    {
        // Latest review per person.
        $counted = $reviews->unique('seeker_id')->values();
        $people = $counted->count();
        $enough = $people >= self::MIN_REVIEWS;

        if (! $enough) {
            return ['reviewers' => $people, 'enough' => false];
        }

        $averages = [];
        foreach ($aspects as $key => $label) {
            $values = $counted->map(fn (EmployerReview $review) => $review->ratings[$key] ?? null)->filter(fn ($value) => $value !== null);
            if ($values->isNotEmpty()) {
                $averages[$key] = ['label' => $label, 'average' => round($values->avg(), 1), 'ratings' => $values->count()];
            }
        }

        $overall = collect($averages)->avg('average');

        // How many people gave each overall star rating (their review's average, rounded).
        $stars = $counted->map(fn (EmployerReview $review) => (int) round((float) $review->averageRating()))->countBy();
        $distribution = collect([5, 4, 3, 2, 1])->map(fn (int $star) => ['stars' => $star, 'count' => (int) ($stars[$star] ?? 0)])->all();

        return [
            'reviewers' => $people,
            'enough' => true,
            'average' => $overall !== null ? round($overall, 1) : null,
            'recommend_percent' => (int) round($counted->where('recommend', true)->count() / $people * 100),
            'aspects' => $averages,
            'distribution' => $distribution,
            'strengths' => collect($averages)->filter(fn ($aspect) => $aspect['average'] >= self::STRENGTH_AT)->keys()->values(),
            'to_improve' => collect($averages)->filter(fn ($aspect) => $aspect['average'] <= self::IMPROVE_AT)->keys()->values(),
        ];
    }

    /**
     * The small rating on job cards, for many employers in one query. Only
     * employers with MIN_REVIEWS different reviewers (either type) get one.
     *
     * @return array<int, array{average: float, reviewers: int}>
     */
    public static function badges(array $employerIds): array
    {
        $employerIds = array_values(array_unique(array_map('intval', $employerIds)));
        if ($employerIds === []) {
            return [];
        }

        return EmployerReview::query()
            ->published()
            ->whereIn('employer_id', $employerIds)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get(['id', 'employer_id', 'seeker_id', 'type', 'ratings', 'limited', 'created_at'])
            ->groupBy('employer_id')
            ->map(function (Collection $reviews) {
                // Latest review per person and type, then each review's own average.
                $counted = $reviews->unique(fn (EmployerReview $review) => $review->seeker_id.'|'.$review->type);
                $people = $counted->unique('seeker_id')->count();
                $average = $counted->map(fn (EmployerReview $review) => $review->averageRating())->filter()->avg();

                return $people >= self::MIN_REVIEWS && $average !== null
                    ? ['average' => round($average, 1), 'reviewers' => $people]
                    : null;
            })
            ->filter()
            ->all();
    }

    /** How a review appears to the public: anonymous, month only, no job title or outcome. */
    public static function publicReview(EmployerReview $review): array
    {
        $reply = $review->relationLoaded('reply') ? $review->reply : null;

        return [
            'id' => $review->id,
            'type' => $review->type,
            'reviewer' => $review->type === FeedbackAspects::EMPLOYMENT ? 'Verified employee' : 'Verified applicant',
            'month' => $review->created_at?->format('F Y'),
            'limited' => $review->limited,
            'ratings' => collect($review->aspects())->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'value' => $review->ratings[$key] ?? null])->values(),
            'average' => $review->averageRating(),
            'recommend' => $review->recommend,
            'comment' => $review->comment,
            'edited' => $review->edited_at !== null,
            'reply' => $reply && $reply->status === 'published'
                ? ['body' => $reply->body, 'date' => $reply->created_at?->format('F Y'), 'edited' => $reply->edited_at !== null]
                : null,
        ];
    }
}
