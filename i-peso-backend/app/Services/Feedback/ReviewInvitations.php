<?php

namespace App\Services\Feedback;

use App\Models\Application;
use App\Models\EmployerReview;
use App\Notifications\ReviewInvitationNotification;
use App\Support\FeedbackAspects;
use Illuminate\Support\Facades\DB;

/**
 * Sends the "rate your experience" invitation at most once per application
 * and review type, and never for something already reviewed.
 */
class ReviewInvitations
{
    public function __construct(private readonly FeedbackEligibility $eligibility) {}

    public function inviteForApplication(Application $application, string $type): bool
    {
        $application->loadMissing(['jobSeeker', 'jobVacancy.employer']);
        $seeker = $application->jobSeeker;
        $employer = $application->jobVacancy?->employer;

        if (! $seeker || ! $employer) {
            return false;
        }

        $rule = $type === FeedbackAspects::EMPLOYMENT
            ? $this->eligibility->employmentFromApplication($application)
            : $this->eligibility->recruitment($application);

        if (! $rule['allowed'] || $this->alreadyHandled($seeker->getKey(), $application->apply_id, $type)) {
            return false;
        }

        try {
            $seeker->notify(new ReviewInvitationNotification(
                $type,
                $employer->company_name,
                $application->jobVacancy->job_title,
                $application->apply_id,
            ));
        } catch (\Throwable $exception) {
            // A notification failure must never fail the hiring action that triggered it.
            report($exception);

            return false;
        }

        return true;
    }

    private function alreadyHandled(int $seekerId, int $applicationId, string $type): bool
    {
        $reviewed = EmployerReview::query()
            ->where('application_id', $applicationId)
            ->where('type', $type)
            ->exists();

        if ($reviewed) {
            return true;
        }

        // Look for an earlier invitation in the notifications table without
        // relying on JSON column support (works the same on MySQL and SQLite).
        return DB::table('notifications')
            ->where('notifiable_type', \App\Models\JobSeeker::class)
            ->where('notifiable_id', $seekerId)
            ->where('type', ReviewInvitationNotification::class)
            ->where('data', 'like', '%"application_id":'.$applicationId.',%')
            ->where('data', 'like', '%"review_type":"'.$type.'"%')
            ->exists();
    }
}
