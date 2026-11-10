<?php

namespace App\Notifications;

use App\Support\FeedbackAspects;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * "How was your experience with …?" — sent once per interaction when a job
 * seeker can review an employer. In-app only for now; the mobile app gets
 * push once it has the review screens.
 */
class ReviewInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $reviewType,
        public string $companyName,
        public ?string $jobTitle,
        public ?int $applicationId = null,
        public ?int $placementRecordId = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $employment = $this->reviewType === FeedbackAspects::EMPLOYMENT;
        $source = $this->applicationId ? "application-{$this->applicationId}" : "placement-{$this->placementRecordId}";

        return [
            'type' => 'review_invitation',
            'review_type' => $this->reviewType,
            'application_id' => $this->applicationId,
            'placement_record_id' => $this->placementRecordId,
            'title' => $employment ? "How is working at {$this->companyName}?" : "How was applying to {$this->companyName}?",
            'message' => $employment
                ? 'Share your experience as a verified employee. Your name is never shown.'
                : 'Rate how the hiring was handled'.($this->jobTitle ? " for {$this->jobTitle}" : '').'. Your name is never shown.',
            'action_url' => "/seeker/reviews?review={$source}-{$this->reviewType}",
        ];
    }
}
