<?php

namespace App\Console\Commands;

use App\Services\AnnouncementService;
use Illuminate\Console\Command;

/**
 * Sends the optional bell/push for scheduled announcements once their publish
 * time arrives. (Going live itself needs no job — visibility is time-based.)
 * Immediate publishes are delivered by the controller after its response;
 * this also catches any of those that were cut off, since AnnouncementService
 * only ever marks an announcement delivered by claiming it atomically.
 */
class DeliverDueAnnouncements extends Command
{
    protected $signature = 'announcements:deliver-due';

    protected $description = 'Send bell and push notifications for announcements that just went live.';

    public function __construct(private readonly AnnouncementService $announcements)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $delivered = 0;

        foreach ($this->announcements->dueForDelivery()->orderBy('publish_at')->get() as $announcement) {
            $count = $this->announcements->deliver($announcement);
            if ($count > 0 || $announcement->fresh()->notified_at !== null) {
                $delivered++;
                $this->line("Announcement #{$announcement->id}: notified {$count} user(s).");
            }
        }

        $this->info("Delivered {$delivered} announcement(s).");

        return self::SUCCESS;
    }
}
