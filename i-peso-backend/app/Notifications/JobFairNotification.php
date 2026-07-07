<?php

namespace App\Notifications;

use App\Models\JobFair;
use App\Models\JobFairEmployer;
use App\Notifications\Channels\JobFairLogOnlySmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class JobFairNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly JobFair $fair,
        private readonly string $event,
        private readonly ?JobFairEmployer $participation = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', JobFairLogOnlySmsChannel::class];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'job_fair', 'event' => $this->event, 'title' => $this->title(),
            'message' => $this->message(), 'job_fair_id' => $this->fair->job_fair_id,
            'participation_id' => $this->participation?->id,
            'action_url' => $notifiable instanceof \App\Models\Administrator
                ? '/admin/job-fairs/'.$this->fair->job_fair_id
                : '/employer/job-fairs',
        ];
    }

    public function toSms(object $notifiable): array
    {
        return [
            'phone_number' => $notifiable->mobile_number ?? $notifiable->representative_contact_number ?? null,
            'content' => $this->message(), 'purpose' => 'job_fair_'.$this->event,
            'metadata' => ['job_fair_id' => $this->fair->job_fair_id],
        ];
    }

    private function title(): string
    {
        return match ($this->event) {
            'invited' => 'Job Fair invitation', 'interest_submitted' => 'Employer expressed interest',
            'requirements_submitted' => 'Job Fair requirements submitted', 'results_submitted' => 'Job Fair results submitted',
            'participation_approved' => 'Job Fair participation approved', 'participation_rejected' => 'Job Fair participation update',
            default => 'Job Fair update',
        };
    }

    private function message(): string
    {
        return match ($this->event) {
            'invited' => "You are invited to {$this->fair->title}. Review the event requirements in i-PESO.",
            'interest_submitted' => "An employer expressed interest in {$this->fair->title}.",
            'requirements_submitted' => "Employer requirements were submitted for {$this->fair->title}.",
            'results_submitted' => "Post-event results were submitted for {$this->fair->title}.",
            'participation_approved' => "Your participation in {$this->fair->title} was approved.",
            'participation_rejected' => "Your participation in {$this->fair->title} requires review. Check PESO remarks.",
            default => "There is an update for {$this->fair->title}.",
        };
    }
}
