<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Tells a job seeker PESO published or hid their review, with PESO's note. */
class ReviewModeratedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $outcome, // published | hidden
        public string $companyName,
        public ?string $note = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $published = $this->outcome === 'published';

        return [
            'type' => 'review_moderated',
            'title' => $published ? 'Your review is now published' : 'PESO hid your review',
            'message' => $published
                ? "Your review of {$this->companyName} now appears on the company profile."
                : "Your review of {$this->companyName} was hidden".($this->note ? ": {$this->note}" : '.').' You can edit it and PESO will check it again.',
            'action_url' => '/seeker/reviews',
        ];
    }
}
