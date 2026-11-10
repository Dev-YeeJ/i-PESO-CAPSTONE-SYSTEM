<?php

namespace App\Notifications;

use App\Models\Application;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the employer that an applicant withdrew. Always shows in the bell;
 * also emailed when an interview had been scheduled, because then the
 * employer has a slot on their calendar that is no longer happening.
 *
 * Not ShouldQueue: there is no persistent queue worker on this host
 * (see the other notifications), so it is sent synchronously.
 */
class ApplicationWithdrawnNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Application $application,
        /** Start time of the interview this withdrawal cancelled, if any. */
        protected ?CarbonInterface $cancelledInterviewAt = null,
    ) {
    }

    public function via(object $notifiable): array
    {
        return $this->cancelledInterviewAt ? ['database', 'mail'] : ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("{$this->applicantName()} withdrew from the {$this->jobTitle()} interview")
            ->greeting('Hello '.($notifiable->company_name ?: 'Employer').',')
            ->line($this->message())
            ->line('You do not need to do anything. The interview has been removed from your i-PESO calendar.')
            ->action('View applicants', rtrim((string) config('app.frontend_url', config('app.url')), '/').$this->actionUrl());
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->cancelledInterviewAt ? 'Applicant withdrew before the interview' : 'Applicant withdrew',
            'message' => $this->message(),
            'status' => 'withdrawn',
            'type' => 'application_withdrawn',
            'application_id' => $this->application->apply_id,
            'post_id' => $this->application->post_id,
            'interview_cancelled' => (bool) $this->cancelledInterviewAt,
            'action_url' => $this->actionUrl(),
        ];
    }

    private function message(): string
    {
        $base = "{$this->applicantName()} withdrew their application for {$this->jobTitle()}.";

        if (! $this->cancelledInterviewAt) {
            return $base;
        }

        return $base.' Their interview on '.$this->cancelledInterviewAt->copy()->timezone('Asia/Manila')->format('F j, Y \a\t g:i A').' is cancelled.';
    }

    private function applicantName(): string
    {
        $seeker = $this->application->jobSeeker;

        return trim("{$seeker?->first_name} {$seeker?->last_name}") ?: 'An applicant';
    }

    private function jobTitle(): string
    {
        return $this->application->jobVacancy?->job_title ?? 'your vacancy';
    }

    private function actionUrl(): string
    {
        return '/employer/ats?vacancy_id='.$this->application->post_id;
    }
}
