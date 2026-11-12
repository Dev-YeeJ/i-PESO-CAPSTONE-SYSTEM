<?php

namespace App\Notifications;

use App\Models\Announcement;
use App\Models\JobSeeker;
use App\Notifications\Channels\ExpoPushChannel;
use App\Services\AnnouncementService;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * The optional "Also notify" half of an announcement: a bell entry for every
 * reader in the audience, plus a mobile push for job seekers (the only role
 * with the app). No email/SMS by decision — see docs/announcement-module-plan.md.
 *
 * Not ShouldQueue, like JobFairPublished: AnnouncementService::deliver() is
 * already running after the response / from the scheduler, so it sends inline.
 */
class AnnouncementPublished extends Notification
{
    use Queueable;

    public function __construct(private readonly Announcement $announcement)
    {
    }

    public function announcementId(): int
    {
        return (int) $this->announcement->id;
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable instanceof JobSeeker) {
            $channels[] = ExpoPushChannel::class;
        }

        return $channels;
    }

    public function toExpoPush(object $notifiable): array
    {
        return [
            'title' => $this->title(),
            'body' => $this->excerpt(),
            'data' => [
                'type' => 'announcement',
                'announcement_id' => $this->announcementId(),
            ],
        ];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'announcement',
            'title' => $this->title(),
            'message' => $this->excerpt(),
            'announcement_id' => $this->announcementId(),
            'category' => $this->announcement->category,
            'priority' => $this->announcement->priority,
            'action_url' => AnnouncementService::readerPath($notifiable, $this->announcementId()),
        ];
    }

    private function title(): string
    {
        $prefix = $this->announcement->priority === 'urgent' ? 'Urgent PESO announcement' : 'PESO announcement';

        return $prefix.': '.$this->announcement->title;
    }

    private function excerpt(): string
    {
        return Str::limit(preg_replace('/\s+/', ' ', trim($this->announcement->body)), 140);
    }
}
