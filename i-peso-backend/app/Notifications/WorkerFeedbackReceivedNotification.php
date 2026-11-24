<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Tells a worker an employer left private feedback about them; it shows on their My Reviews page straight away. */
class WorkerFeedbackReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(public string $companyName) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'worker_feedback_received',
            'title' => "{$this->companyName} left feedback about you",
            'message' => 'Only you and PESO can read the comments. Open My Reviews to read it.',
            'action_url' => '/seeker/reviews',
        ];
    }
}
