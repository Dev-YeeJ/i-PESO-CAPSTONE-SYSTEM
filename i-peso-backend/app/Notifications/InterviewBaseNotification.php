<?php

namespace App\Notifications;

use App\Models\Application;
use App\Models\Employer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

abstract class InterviewBaseNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(protected Application $application, protected ?string $reminderWindow = null)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toArray(object $notifiable): array
    {
        $isEmployer = $notifiable instanceof Employer;
        $companyName = $this->application->jobVacancy?->employer?->company_name ?? 'the employer';
        $jobTitle = $this->application->jobVacancy?->job_title ?? 'the position';
        $applicantName = trim("{$this->application->jobSeeker?->first_name} {$this->application->jobSeeker?->last_name}");
        $recipientName = $this->recipientName($notifiable);
        $interview = $this->application->interviewSchedule;
        $scheduledAt = $interview?->schedule ? $interview->schedule->format('F j, Y \a\t g:i A') : 'TBD';
        $mode = $interview ? ucfirst(str_replace('_', ' ', $interview->mode_of_interview)) : 'TBD';
        $location = $interview?->venue_or_link ?: 'Venue to follow';

        $title = $this->buildTitle($isEmployer);
        $message = $this->buildMessage($isEmployer, $companyName, $jobTitle, $applicantName, $scheduledAt, $location, $recipientName);

        return [
            'title' => $title,
            'message' => $message,
            'status' => 'interview',
            'type' => $this->notificationType(),
            'application_id' => $this->application->apply_id,
            'action_url' => $isEmployer ? '/employer/ats' : '/seeker/applications',
            'reminder_window' => $this->reminderWindow,
            'interview_schedule' => $scheduledAt,
            'interview_mode' => $mode,
            'interview_location' => $location,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $isEmployer = $notifiable instanceof Employer;
        $companyName = $this->application->jobVacancy?->employer?->company_name ?? 'the employer';
        $jobTitle = $this->application->jobVacancy?->job_title ?? 'the position';
        $applicantName = trim("{$this->application->jobSeeker?->first_name} {$this->application->jobSeeker?->last_name}");
        $recipientName = $this->recipientName($notifiable);
        $interview = $this->application->interviewSchedule;
        $scheduledAt = $interview?->schedule ? $interview->schedule->format('F j, Y \a\t g:i A') : 'TBD';
        $mode = $interview ? ucfirst(str_replace('_', ' ', $interview->mode_of_interview)) : 'TBD';
        $location = $interview?->venue_or_link ?: 'Venue to follow';
        $notes = $interview?->instructions ?: 'Please be ready with your resume, certificates, and valid ID.';
        $url = rtrim((string) config('app.frontend_url', 'http://localhost'), '/') . ($isEmployer ? '/employer/ats' : '/seeker/applications');

        return (new MailMessage)
            ->subject($this->buildSubject($isEmployer, $jobTitle))
            ->view('emails.interview-notification', [
                'recipientName' => $recipientName,
                'bodyMessage' => $this->buildMessage($isEmployer, $companyName, $jobTitle, $applicantName, $scheduledAt, $location, $recipientName),
                'jobTitle' => $jobTitle,
                'companyName' => $companyName,
                'applicantName' => $applicantName,
                'scheduledAt' => $scheduledAt,
                'mode' => $mode,
                'location' => $location,
                'notes' => $notes,
                'url' => $url,
            ]);
    }

    protected function buildTitle(bool $isEmployer): string
    {
        return $isEmployer ? 'Interview Scheduled' : 'Interview Scheduled';
    }

    protected function buildSubject(bool $isEmployer, string $jobTitle): string
    {
        return $isEmployer ? "Interview scheduled for {$jobTitle}" : "Interview scheduled for {$jobTitle}";
    }

    protected function buildMessage(bool $isEmployer, string $companyName, string $jobTitle, string $applicantName, string $scheduledAt, string $location, string $recipientName): string
    {
        if ($isEmployer) {
            return "You scheduled an interview with {$applicantName} for {$jobTitle} on {$scheduledAt}.";
        }

        return "Your interview for {$jobTitle} at {$companyName} is scheduled on {$scheduledAt}.";
    }

    protected function recipientName(object $notifiable): string
    {
        if ($notifiable instanceof Employer) {
            return $notifiable->company_name ?: $notifiable->representative_name ?: $notifiable->email;
        }

        return trim("{$notifiable->first_name} {$notifiable->last_name}") ?: ($notifiable->name ?? $notifiable->email);
    }

    abstract protected function notificationType(): string;
}
