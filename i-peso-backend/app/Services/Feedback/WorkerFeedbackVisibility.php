<?php

namespace App\Services\Feedback;

use App\Models\JobSeeker;
use App\Models\WorkerFeedback;
use App\Support\FeedbackAspects;

/**
 * An employer's feedback about someone they hired, as that worker sees it on
 * their My Reviews page. It is shown straight away (there is no waiting
 * period any more). Feedback PESO hid is never shown.
 */
class WorkerFeedbackVisibility
{
    /** What the worker sees on their My Reviews page. */
    public static function forWorker(JobSeeker $seeker): array
    {
        return WorkerFeedback::query()
            ->with(['employer', 'application.jobVacancy'])
            ->where('seeker_id', $seeker->seeker_id)
            ->where('status', 'visible')
            ->latest()
            ->get()
            ->map(function (WorkerFeedback $feedback) {
                return [
                    'id' => $feedback->id,
                    'employer' => ['id' => $feedback->employer_id, 'name' => $feedback->employer?->company_name, 'logo' => $feedback->employer?->company_logo],
                    'job_title' => $feedback->application?->jobVacancy?->job_title,
                    // Kept for app builds that still check them: never locked now.
                    'locked' => false,
                    'visible_from' => $feedback->created_at?->toDateString(),
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
