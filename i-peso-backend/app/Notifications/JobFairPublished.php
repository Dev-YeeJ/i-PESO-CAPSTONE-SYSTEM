<?php

namespace App\Notifications;

use App\Models\JobFair;
use App\Notifications\Channels\ExpoPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Tells job seekers a job fair just went public — the seeker-side mirror of
 * JobFairNotification's employer invitation email, fired at the same moment
 * (JobFairController::publish()). In-app + mobile push only, no email: unlike
 * the employer letter (a business workflow employers check email for), this
 * is exactly the kind of "something new to see" nudge GovernmentProgramNotification
 * already uses this same channel pair for.
 */
class JobFairPublished extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly JobFair $fair)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', ExpoPushChannel::class];
    }

    public function toExpoPush(object $notifiable): array
    {
        $data = $this->toArray($notifiable);

        return [
            'title' => $data['title'],
            'body' => $data['message'],
            'data' => [
                'type' => 'job_fair',
                'job_fair_id' => $data['job_fair_id'],
            ],
        ];
    }

    public function toArray(object $notifiable): array
    {
        $when = $this->fair->start_date?->format('F j, Y') ?? 'a date to be announced';

        return [
            'type' => 'job_fair',
            'event' => 'published',
            'title' => 'New Job Fair announced',
            'message' => "{$this->fair->title} is happening {$when} at {$this->fair->venue}. Tap to see the details.",
            'job_fair_id' => $this->fair->job_fair_id,
            'action_url' => '/seeker/job-fairs',
        ];
    }
}
