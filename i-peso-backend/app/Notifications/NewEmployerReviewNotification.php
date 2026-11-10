<?php

namespace App\Notifications;

use App\Support\FeedbackAspects;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Tells an employer a new verified review of their company is up (never who wrote it). */
class NewEmployerReviewNotification extends Notification
{
    use Queueable;

    public function __construct(public string $reviewType, public ?float $average) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $what = $this->reviewType === FeedbackAspects::EMPLOYMENT ? 'a verified employee' : 'a verified applicant';

        return [
            'type' => 'new_employer_review',
            'title' => 'New review of your company',
            'message' => "You received a review from {$what}".($this->average ? " ({$this->average} of 5)" : '').'. You can reply once, publicly.',
            'action_url' => '/employer/reviews',
        ];
    }
}
