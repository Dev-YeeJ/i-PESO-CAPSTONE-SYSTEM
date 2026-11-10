<?php

namespace App\Services\Feedback;

use App\Models\WorkerFeedback;
use App\Support\FeedbackAspects;

/**
 * The summary employers see on an applicant's profile: average stars across
 * all employers' feedback, how many employers gave it, and the would-rehire
 * count. No comments and no company names. Feedback PESO hid isn't counted.
 */
class WorkerRating
{
    /** @return array{average: float, employers: int, would_rehire: array{yes: int, maybe: int, no: int}}|null */
    public static function forSeeker(int $seekerId): ?array
    {
        $feedback = WorkerFeedback::query()
            ->where('seeker_id', $seekerId)
            ->where('status', 'visible')
            ->latest('updated_at')
            ->get(['employer_id', 'ratings', 'would_rehire', 'updated_at'])
            // One entry per employer (their latest), so one company can't count twice.
            ->unique('employer_id')
            ->values();

        if ($feedback->isEmpty()) {
            return null;
        }

        $averages = $feedback->map(function (WorkerFeedback $item) {
            $values = collect(array_keys(FeedbackAspects::WORKER_ASPECTS))
                ->map(fn ($key) => $item->ratings[$key] ?? null)
                ->filter(fn ($value) => is_numeric($value));

            return $values->isEmpty() ? null : $values->avg();
        })->filter(fn ($value) => $value !== null);

        if ($averages->isEmpty()) {
            return null;
        }

        return [
            'average' => round($averages->avg(), 1),
            'employers' => $feedback->count(),
            'would_rehire' => [
                'yes' => $feedback->where('would_rehire', 'yes')->count(),
                'maybe' => $feedback->where('would_rehire', 'maybe')->count(),
                'no' => $feedback->where('would_rehire', 'no')->count(),
            ],
        ];
    }
}
