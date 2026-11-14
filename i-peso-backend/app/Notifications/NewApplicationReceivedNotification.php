<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Tells the employer a job seeker applied to one of their vacancies.
 *
 * Bell only (database channel): mail is sent synchronously on this host (no
 * queue worker), and an email on every application would slow down the
 * seeker's Apply button and flood a busy employer's inbox. The sidebar's
 * "Applicants" badge carries the running count of who still needs review.
 */
class NewApplicationReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(protected Application $application)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $match = (int) round((float) $this->application->match_percentage);

        return [
            'title' => 'New applicant',
            'message' => sprintf(
                '%s applied for %s.%s',
                $this->applicantName(),
                $this->application->jobVacancy?->job_title ?? 'your vacancy',
                $match > 0 ? " Match score: {$match}%." : ''
            ),
            'status' => 'pending',
            'type' => 'application_received',
            'application_id' => $this->application->apply_id,
            'post_id' => $this->application->post_id,
            'action_url' => '/employer/ats?vacancy_id='.$this->application->post_id,
        ];
    }

    private function applicantName(): string
    {
        $seeker = $this->application->jobSeeker;

        return trim("{$seeker?->first_name} {$seeker?->last_name}") ?: 'A job seeker';
    }
}
