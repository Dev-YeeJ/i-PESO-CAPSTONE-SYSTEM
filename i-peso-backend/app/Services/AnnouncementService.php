<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Notifications\AnnouncementPublished;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Audience sizing, reach and the optional bell/push delivery for announcements.
 *
 * Delivery is the only per-user work in the module and it never runs inside
 * the admin's request: publish/update hand it to defer() (after the response,
 * like JobFairController::publish), and scheduled announcements are picked up
 * by `announcements:deliver-due`. A conditional UPDATE on notified_at claims an
 * announcement before sending, so the publish click, an edit and the scheduler
 * racing each other still deliver exactly once.
 */
class AnnouncementService
{
    private const CHUNK = 200;

    /** @return array<string, int> head-count per audience value */
    public function audienceCounts(): array
    {
        $seekers = JobSeeker::query()->count();
        $employers = Employer::query()->count();

        return [
            Announcement::AUDIENCE_PUBLIC => $seekers + $employers,
            Announcement::AUDIENCE_ALL => $seekers + $employers,
            Announcement::AUDIENCE_SEEKERS => $seekers,
            Announcement::AUDIENCE_EMPLOYERS => $employers,
        ];
    }

    /** Which reader groups an audience value reaches. */
    public function reachesSeekers(string $audience): bool
    {
        return $audience !== Announcement::AUDIENCE_EMPLOYERS;
    }

    public function reachesEmployers(string $audience): bool
    {
        return $audience !== Announcement::AUDIENCE_SEEKERS;
    }

    /**
     * "Seen by X of Y": opens per reader type against the current audience size.
     *
     * @return array{targeted: int, seen: int, seen_seekers: int, seen_employers: int, dismissed: int, rate: int}
     */
    public function reach(Announcement $announcement): array
    {
        $targeted = $this->audienceCounts()[$announcement->audience] ?? 0;

        $reads = AnnouncementRead::query()
            ->where('announcement_id', $announcement->id)
            ->whereNotNull('read_at')
            ->selectRaw('reader_type, COUNT(*) as total')
            ->groupBy('reader_type')
            ->pluck('total', 'reader_type');

        $seenSeekers = (int) ($reads[(new JobSeeker)->getMorphClass()] ?? 0);
        $seenEmployers = (int) ($reads[(new Employer)->getMorphClass()] ?? 0);
        $seen = $seenSeekers + $seenEmployers;

        return [
            'targeted' => $targeted,
            'seen' => $seen,
            'seen_seekers' => $seenSeekers,
            'seen_employers' => $seenEmployers,
            'dismissed' => AnnouncementRead::query()->where('announcement_id', $announcement->id)->whereNotNull('dismissed_at')->count(),
            'rate' => $targeted > 0 ? (int) round(min(100, $seen / $targeted * 100)) : 0,
        ];
    }

    /** Seen counts for a page of announcements in one query (admin list). @return array<int, int> */
    public function seenCounts(iterable $announcementIds): array
    {
        $ids = collect($announcementIds)->filter()->values();
        if ($ids->isEmpty()) {
            return [];
        }

        return AnnouncementRead::query()
            ->whereIn('announcement_id', $ids)
            ->whereNotNull('read_at')
            ->selectRaw('announcement_id, COUNT(*) as total')
            ->groupBy('announcement_id')
            ->pluck('total', 'announcement_id')
            ->map(fn ($total) => (int) $total)
            ->all();
    }

    /** Hand delivery off to after the response if this announcement is due one. */
    public function deliverAfterResponse(Announcement $announcement): void
    {
        if (! $this->isDueForDelivery($announcement)) {
            return;
        }

        $id = $announcement->id;
        defer(function () use ($id) {
            set_time_limit(0);
            $fresh = Announcement::find($id);
            if ($fresh) {
                $this->deliver($fresh);
            }
        });
    }

    public function isDueForDelivery(Announcement $announcement): bool
    {
        return $announcement->notify_users && $announcement->notified_at === null && $announcement->isLive();
    }

    /** Live announcements with "Also notify" on that haven't been delivered (scheduled ones whose time came). */
    public function dueForDelivery(): Builder
    {
        return Announcement::query()->live()->where('notify_users', true)->whereNull('notified_at');
    }

    /**
     * Send the bell notification (+ push for seekers) to the audience, once.
     *
     * @return int number of users notified (0 if another process already claimed it)
     */
    public function deliver(Announcement $announcement): int
    {
        $now = now();

        // Atomic claim — only one caller can flip notified_at from null.
        $claimed = Announcement::query()
            ->whereKey($announcement->id)
            ->where('notify_users', true)
            ->whereNull('notified_at')
            ->where('status', Announcement::STATUS_PUBLISHED)
            ->where('publish_at', '<=', $now)
            ->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now))
            ->update(['notified_at' => $now]);

        if ($claimed !== 1) {
            return 0;
        }

        $announcement->refresh();
        $notification = new AnnouncementPublished($announcement);
        $notified = 0;

        $send = function (Model $user) use ($notification, &$notified) {
            try {
                $user->notify($notification);
                $notified++;
            } catch (\Throwable $exception) {
                // One bad push token or row must not stop the rest of the audience.
                Log::warning('Announcement notification failed for one recipient.', [
                    'announcement_id' => $notification->announcementId(),
                    'recipient' => $user::class.'#'.$user->getKey(),
                    'error_type' => class_basename($exception),
                ]);
            }
        };

        if ($this->reachesSeekers($announcement->audience)) {
            JobSeeker::query()->chunkById(self::CHUNK, fn ($seekers) => $seekers->each($send), 'seeker_id');
        }

        if ($this->reachesEmployers($announcement->audience)) {
            Employer::query()->chunkById(self::CHUNK, fn ($employers) => $employers->each($send), 'employer_id');
        }

        $announcement->forceFill(['notified_count' => $notified])->save();

        return $notified;
    }

    /** The reader's read/dismiss rows for a set of announcements, keyed by announcement id. */
    public function readRowsFor(Model $reader, iterable $announcementIds)
    {
        return AnnouncementRead::query()
            ->where('reader_type', $reader->getMorphClass())
            ->where('reader_id', $reader->getKey())
            ->whereIn('announcement_id', collect($announcementIds)->all())
            ->get()
            ->keyBy('announcement_id');
    }

    public function markRead(Announcement $announcement, Model $reader): AnnouncementRead
    {
        $row = AnnouncementRead::firstOrNew([
            'announcement_id' => $announcement->id,
            'reader_type' => $reader->getMorphClass(),
            'reader_id' => $reader->getKey(),
        ]);
        $row->read_at ??= now();
        $row->save();

        return $row;
    }

    public function dismiss(Announcement $announcement, Model $reader): AnnouncementRead
    {
        $row = AnnouncementRead::firstOrNew([
            'announcement_id' => $announcement->id,
            'reader_type' => $reader->getMorphClass(),
            'reader_id' => $reader->getKey(),
        ]);
        $row->dismissed_at ??= now();
        $row->save();

        return $row;
    }

    /** Where a reader opens an announcement in the web app. */
    public static function readerPath(Model $reader, int $announcementId): string
    {
        $base = $reader instanceof Employer ? '/employer/announcements' : '/seeker/announcements';

        return $base.'?open='.$announcementId;
    }
}
