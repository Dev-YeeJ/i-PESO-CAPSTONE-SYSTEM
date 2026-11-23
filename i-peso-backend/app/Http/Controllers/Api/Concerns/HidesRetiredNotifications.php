<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Keeps notifications from features that no longer exist out of the bell.
 *
 * The Announcements module was removed (Nov 2026). Notifications it already
 * sent stay in the database untouched, but they point to pages that are gone,
 * so they are left out of the list and the unread count.
 */
trait HidesRetiredNotifications
{
    /** Notification classes of removed features. Stored as strings: the classes no longer exist. */
    private const RETIRED_NOTIFICATION_TYPES = [
        'App\\Notifications\\AnnouncementPublished',
    ];

    /** @param  MorphMany  $notifications  a user's notifications() or unreadNotifications() */
    protected function visible(MorphMany $notifications): MorphMany
    {
        return $notifications->whereNotIn('type', self::RETIRED_NOTIFICATION_TYPES);
    }
}
