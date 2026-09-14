<?php

namespace App\Notifications;

use App\Models\JobVacancy;
use App\Notifications\Channels\ExpoPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Tells every job seeker a new vacancy was just posted — the seeker-side mirror of
 * JobFairPublished, same "something new to see" FYI-nudge channel pair (in-app + mobile push,
 * no email), fired once per vacancy the first time it goes active
 * (EmployerJobVacancyController broadcastToSeekers(), guarded by seekers_notified_at so a later
 * edit never re-sends).
 */
class NewJobVacancyPosted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly JobVacancy $vacancy)
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
                'type' => 'job_vacancy',
                'post_id' => $data['post_id'],
            ],
        ];
    }

    public function toArray(object $notifiable): array
    {
        $companyName = $this->vacancy->employer->company_name ?? 'An employer';

        return [
            'type' => 'job_vacancy',
            'event' => 'posted',
            'title' => 'New job posted',
            'message' => "{$companyName} is hiring for {$this->vacancy->job_title}. Tap to see the details.",
            'post_id' => $this->vacancy->post_id,
            // Web has no standalone job-detail route (only /seeker/job-map, which resolves a
            // job by id client-side) — a /seeker/jobs/{id} URL here would 404 on web even
            // though mobile has that exact route. post_id above is what both clients should
            // actually navigate on; this is just the best-effort fallback.
            'action_url' => '/seeker/job-map',
        ];
    }
}
