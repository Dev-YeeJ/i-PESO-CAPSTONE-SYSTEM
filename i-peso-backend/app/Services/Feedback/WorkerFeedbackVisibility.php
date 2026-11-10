<?php

namespace App\Services\Feedback;

use App\Models\EmployerReview;
use App\Models\JobSeeker;
use App\Models\WorkerFeedback;
use App\Support\FeedbackAspects;
use Illuminate\Support\Carbon;

/**
 * The mutual reveal: a worker sees an employer's feedback about them once
 * they've written their own Employment review of that employer, or
 * REVEAL_AFTER_DAYS after the employer wrote it, whichever comes first. So
 * neither side writes in reaction to the other. Feedback PESO hid is never shown.
 */
class WorkerFeedbackVisibility
{
    public const REVEAL_AFTER_DAYS = 14;

    public static function visibleFrom(WorkerFeedback $feedback): Carbon
    {
        return $feedback->created_at->copy()->addDays(self::REVEAL_AFTER_DAYS);
    }

    /** What the worker sees on their My Reviews page. */
    public static function forWorker(JobSeeker $seeker): array
    {
        $reviewedEmployers = EmployerReview::query()
            ->where('seeker_id', $seeker->seeker_id)
            ->where('type', FeedbackAspects::EMPLOYMENT)
            ->pluck('employer_id')
            ->unique();

        return WorkerFeedback::query()
            ->with(['employer', 'application.jobVacancy'])
            ->where('seeker_id', $seeker->seeker_id)
            ->where('status', 'visible')
            ->latest()
            ->get()
            ->map(function (WorkerFeedback $feedback) use ($reviewedEmployers) {
                $from = self::visibleFrom($feedback);
                $open = $reviewedEmployers->contains($feedback->employer_id) || $from->isPast();

                $base = [
                    'id' => $feedback->id,
                    'employer' => ['id' => $feedback->employer_id, 'name' => $feedback->employer?->company_name],
                    'job_title' => $feedback->application?->jobVacancy?->job_title,
                    'locked' => ! $open,
                    'visible_from' => $from->toDateString(),
                ];

                if (! $open) {
                    return $base;
                }

                return $base + [
                    'ratings' => collect(FeedbackAspects::WORKER_ASPECTS)
                        ->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'value' => $feedback->ratings[$key] ?? null])
                        ->values(),
                    'would_rehire' => FeedbackAspects::WOULD_REHIRE[$feedback->would_rehire] ?? $feedback->would_rehire,
                    'comment' => $feedback->comment,
                    'updated_at' => $feedback->updated_at,
                ];
            })
            ->values()
            ->all();
    }
}
