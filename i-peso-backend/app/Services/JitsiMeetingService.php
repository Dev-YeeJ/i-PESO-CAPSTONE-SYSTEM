<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Generates instant Jitsi Meet video-call links for online interviews.
 *
 * Replaces the earlier Google Calendar/Meet integration: a Jitsi room needs
 * no API call, no OAuth token, and no connected account — visiting the URL
 * is what creates the room. That also means every employer gets a working
 * link immediately, with no "connect your calendar" step first.
 */
class JitsiMeetingService
{
    private const BASE_URL = 'https://meet.jit.si';

    /**
     * @return array{meet_link: string}
     */
    public function createRoom(): array
    {
        // Opaque, unguessable room name — an interview link should not be
        // discoverable by anyone who doesn't already have it, and it must
        // not leak the applicant's or employer's name into a URL that may
        // end up copy-pasted into chat apps, email threads, or logs.
        $room = 'iPESO-' . Str::lower(Str::random(20));

        return ['meet_link' => self::BASE_URL . '/' . $room];
    }
}
