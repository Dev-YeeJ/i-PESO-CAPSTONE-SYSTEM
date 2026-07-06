<?php

namespace App\Notifications;

use App\Models\Application;
use App\Notifications\Channels\SmsChannel;
use App\Services\Sms\SmsMessageTemplates;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $application;

    /**
     * Create a new notification instance.
     */
    public function __construct(Application $application)
    {
        $this->application = $application;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['mail', 'database'];

        // Interview notifications have their own richer SMS and must not be duplicated.
        $interviewWasCancelled = $this->application->interviewSchedule?->status === 'cancelled';

        if ($this->application->status !== 'interview' && ! $interviewWasCancelled) {
            $channels[] = SmsChannel::class;
        }

        return $channels;
    }

    public function toSms(object $notifiable): array
    {
        return [
            'phone_number' => $notifiable->mobile_number ?? null,
            'content' => SmsMessageTemplates::applicationStatus(
                $this->application->jobVacancy?->job_title ?? 'a position',
                $this->application->status,
            ),
            'purpose' => 'application_status',
            'metadata' => [
                'application_status' => $this->application->status,
            ],
        ];
    }

    /**
     * Get the array representation of the notification for the database.
     */
    public function toArray(object $notifiable): array
    {
        $status = $this->application->status;
        $companyName = $this->application->jobVacancy->employer->company_name ?? 'An employer';
        $jobTitle = $this->application->jobVacancy->job_title ?? 'a position';
        
        $titleMap = [
            'pending' => "Application Sent",
            'reviewed' => "Application Reviewed",
            'shortlisted' => "You're Shortlisted!",
            'interview' => "Interview Scheduled",
            'hired' => "You're Hired!",
            'rejected' => "Status Update",
            'withdrawn' => "Application Withdrawn",
        ];

        $messageMap = [
            'pending' => "Your profile was sent to $companyName for $jobTitle.",
            'reviewed' => "$companyName is reviewing your profile for $jobTitle.",
            'shortlisted' => "You were shortlisted by $companyName for $jobTitle.",
            'interview' => "$companyName scheduled an interview for $jobTitle.",
            'hired' => "Congratulations! $companyName hired you for $jobTitle.",
            'rejected' => "$companyName updated your application for $jobTitle.",
            'withdrawn' => "You withdrew your application for $jobTitle.",
        ];

        return [
            'status' => $status,
            'title' => $titleMap[$status] ?? "Application Update",
            'message' => $messageMap[$status] ?? "There is an update on your application.",
            'application_id' => $this->application->apply_id,
            'action_url' => '/seeker/applications'
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $status = $this->application->status;
        $seekerName = collect([
            $notifiable->first_name ?? null,
            $notifiable->middle_name ?? null,
            $notifiable->last_name ?? null,
        ])->filter()->join(' ') ?: ($notifiable->name ?? 'Job Seeker');
        $companyName = $this->application->jobVacancy->employer->company_name ?? 'the employer';
        $jobTitle = $this->application->jobVacancy->job_title ?? 'the position';
        
        $matchScore = $this->application->match_percentage ? number_format((float)$this->application->match_percentage, 1) : '95';
        $url = rtrim((string) config('app.frontend_url'), '/')
            .($status === 'rejected' ? '/seeker/job-map' : '/seeker/applications');

        $interview = $this->application->interviewSchedule;
        $interviewDate = $interview && $interview->schedule ? \Carbon\Carbon::parse($interview->schedule)->format('F j, Y \a\t g:i A') : 'TBD';
        $interviewMode = $interview ? ucfirst(str_replace('_', ' ', $interview->mode_of_interview)) : 'TBD';
        $interviewVenue = $interview ? $interview->venue_or_link : null;
        $interviewInstructions = $interview ? $interview->instructions : null;

        $subjectMap = [
            'pending' => "Application Sent: $jobTitle",
            'reviewed' => "Application Reviewed: $jobTitle",
            'shortlisted' => "You're Shortlisted: $jobTitle",
            'interview' => "Interview Scheduled: $jobTitle",
            'hired' => "🎉 You're Hired: $jobTitle",
            'rejected' => "Update on your application: $jobTitle",
            'withdrawn' => "Application Withdrawn: $jobTitle",
        ];

        return (new MailMessage)
            ->subject($subjectMap[$status] ?? "Application Update: $jobTitle")
            ->view('emails.ats-status', [
                'status' => $status,
                'seekerName' => $seekerName,
                'companyName' => $companyName,
                'jobTitle' => $jobTitle,
                'matchScore' => $matchScore,
                'url' => $url,
                'interviewDate' => $interviewDate,
                'interviewMode' => $interviewMode,
                'interviewVenue' => $interviewVenue,
                'interviewInstructions' => $interviewInstructions,
            ]);
    }
}
