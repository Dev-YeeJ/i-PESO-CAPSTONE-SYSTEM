<?php

namespace App\Support;

use App\Models\Administrator;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use Illuminate\Support\Str;

/** JSON shapes for announcements — admin, signed-in reader and public visitor. */
class AnnouncementPresenter
{
    /** Fields every surface shares. */
    public static function base(Announcement $announcement): array
    {
        return [
            'id' => $announcement->id,
            'title' => $announcement->title,
            'body' => $announcement->body,
            'excerpt' => Str::limit(preg_replace('/\s+/', ' ', trim((string) $announcement->body)), 180),
            'category' => $announcement->category,
            'category_label' => Announcement::CATEGORIES[$announcement->category] ?? Str::headline((string) $announcement->category),
            'priority' => $announcement->priority,
            'priority_label' => Announcement::PRIORITIES[$announcement->priority] ?? Str::headline((string) $announcement->priority),
            'is_pinned' => (bool) $announcement->is_pinned,
            'publish_at' => $announcement->publish_at?->toISOString(),
            'expires_at' => $announcement->expires_at?->toISOString(),
            'link_label' => $announcement->link_label,
            'link_url' => $announcement->link_url,
            'has_attachment' => $announcement->attachment_path !== null,
            'attachment_name' => $announcement->attachment_name,
            'attachment_is_image' => str_starts_with((string) $announcement->attachment_mime, 'image/'),
        ];
    }

    public static function forReader(Announcement $announcement, ?AnnouncementRead $read = null): array
    {
        return self::base($announcement) + [
            'is_read' => $read?->read_at !== null,
            'is_dismissed' => $read?->dismissed_at !== null,
        ];
    }

    public static function forPublic(Announcement $announcement): array
    {
        return self::base($announcement);
    }

    public static function forAdmin(Announcement $announcement, ?int $seen = null, ?array $reach = null): array
    {
        $state = $announcement->state();

        return self::base($announcement) + [
            'audience' => $announcement->audience,
            'audience_label' => Announcement::AUDIENCES[$announcement->audience] ?? Str::headline((string) $announcement->audience),
            'status' => $announcement->status,
            'state' => $state,
            'state_label' => Announcement::STATE_LABELS[$state] ?? Str::headline($state),
            'first_published_at' => $announcement->first_published_at?->toISOString(),
            'attachment_mime' => $announcement->attachment_mime,
            'notify_users' => (bool) $announcement->notify_users,
            'notified_at' => $announcement->notified_at?->toISOString(),
            'notified_count' => (int) $announcement->notified_count,
            'created_by' => self::adminName($announcement->creator),
            'updated_by' => self::adminName($announcement->editor),
            'published_by' => self::adminName($announcement->publisher),
            'created_at' => $announcement->created_at?->toISOString(),
            'updated_at' => $announcement->updated_at?->toISOString(),
            'can_delete' => $announcement->canBeDeleted(),
            'seen' => $seen,
            'reach' => $reach,
        ];
    }

    private static function adminName(?Administrator $admin): ?string
    {
        if (! $admin) {
            return null;
        }

        return trim($admin->first_name.' '.$admin->last_name) ?: null;
    }
}
