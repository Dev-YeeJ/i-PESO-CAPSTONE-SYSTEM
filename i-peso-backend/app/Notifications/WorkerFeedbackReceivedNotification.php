<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Tells a worker an employer left private feedback about them. It shows on
 * their My Reviews page once they've reviewed that workplace, or after the
 * waiting period, so neither side writes in reaction to the other.
 */
class WorkerFeedbackReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(public string $companyName, public string $visibleFrom) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'worker_feedback_received',
            'title' => "{$this->companyName} left feedback about you",
            'message' => "Only you and PESO can read the comments. Review your workplace to read it now, or it opens on {$this->visibleFrom}.",
            'action_url' => '/seeker/reviews',
        ];
    }
}
