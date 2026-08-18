<?php

namespace App\Services;

use App\Models\Employer;
use Google\Client;
use Google\Service\Calendar;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Exception;

class GoogleCalendarService
{
    /**
     * Initializes the Google Client with the Employer's token.
     */
    public function getClient(?Employer $employer = null): Client
    {
        $client = new Client();
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setRedirectUri(config('services.google.calendar_redirect'));
        $client->addScope(Calendar::CALENDAR_EVENTS);
        $client->setAccessType('offline');
        $client->setPrompt('consent');

        if ($employer && $employer->google_access_token) {
            $client->setAccessToken([
                'access_token' => $employer->google_access_token,
                'refresh_token' => $employer->google_refresh_token,
                'expires_in' => $employer->google_token_expires_at ? $employer->google_token_expires_at->diffInSeconds(now()) : 3600,
            ]);

            // Refresh token if expired
            if ($client->isAccessTokenExpired() && $employer->google_refresh_token) {
                $client->fetchAccessTokenWithRefreshToken($employer->google_refresh_token);
                $newToken = $client->getAccessToken();
                if (!isset($newToken['error'])) {
                    $employer->forceFill([
                        'google_access_token' => $newToken['access_token'],
                        'google_refresh_token' => $newToken['refresh_token'] ?? $employer->google_refresh_token,
                        'google_token_expires_at' => isset($newToken['expires_in']) ? now()->addSeconds($newToken['expires_in']) : null,
                    ])->save();
                }
            }
        }

        return $client;
    }

    /**
     * Creates a Google Meet link event.
     */
    public function createMeetEvent(Employer $employer, string $schedule, string $summary, string $description = 'Interview details.')
    {
        if (!$employer->google_access_token) {
            throw new Exception('Google Calendar not connected.', 403);
        }

        $client = $this->getClient($employer);
        
        // If token failed to refresh or is still expired
        if ($client->isAccessTokenExpired()) {
             throw new Exception('Google Calendar token expired.', 403);
        }

        $service = new Calendar($client);

        $event = new Calendar\Event([
            'summary' => $summary,
            'description' => $description,
            'start' => [
                'dateTime' => Carbon::parse($schedule)->toRfc3339String(),
                'timeZone' => config('app.timezone'),
            ],
            'end' => [
                'dateTime' => Carbon::parse($schedule)->addHour()->toRfc3339String(),
                'timeZone' => config('app.timezone'),
            ],
            'conferenceData' => [
                'createRequest' => [
                    'requestId' => uniqid('interview_'),
                    'conferenceSolutionKey' => [
                        'type' => 'hangoutsMeet'
                    ]
                ]
            ]
        ]);

        // Always the authorizing employer's own calendar — never a shared/fixed
        // calendar ID, which would require every employer's Google account to
        // have write access to someone else's calendar.
        $calendarId = 'primary';
        $event = $service->events->insert($calendarId, $event, ['conferenceDataVersion' => 1]);

        $meetLink = null;
        if ($event->getConferenceData() && $event->getConferenceData()->getEntryPoints()) {
            foreach ($event->getConferenceData()->getEntryPoints() as $entryPoint) {
                if ($entryPoint->getEntryPointType() === 'video') {
                    $meetLink = $entryPoint->getUri();
                    break;
                }
            }
        }

        // Add the Meet link to the location and description so it's visible in the Google iframe embed!
        if ($meetLink) {
            $event->setLocation($meetLink);
            $event->setDescription($event->getDescription() . "\n\nGoogle Meet Link: " . $meetLink);
            $service->events->update($calendarId, $event->getId(), $event);
        }

        return [
            'meet_link' => $meetLink ?? $event->getHangoutLink(),
            'event_id' => $event->getId(),
        ];
    }

    /**
     * Fetches events from the employer's Google Calendar.
     */
    public function getEvents(Employer $employer, string $timeMin, string $timeMax)
    {
        if (!$employer->google_access_token) {
            throw new Exception('Google Calendar not connected.', 403);
        }

        $client = $this->getClient($employer);
        
        if ($client->isAccessTokenExpired()) {
             throw new Exception('Google Calendar token expired.', 403);
        }

        $service = new Calendar($client);
        $calendarId = 'primary';
        $optParams = array(
            'maxResults' => 100,
            'orderBy' => 'startTime',
            'singleEvents' => true,
            'timeMin' => Carbon::parse($timeMin)->toRfc3339String(),
            'timeMax' => Carbon::parse($timeMax)->toRfc3339String(),
        );
        $results = $service->events->listEvents($calendarId, $optParams);
        $events = $results->getItems();

        $formattedEvents = [];
        foreach ($events as $event) {
            $start = $event->start->dateTime;
            if (empty($start)) {
                $start = $event->start->date;
            }
            $end = $event->end->dateTime;
            if (empty($end)) {
                $end = $event->end->date;
            }

            $meetLink = null;
            if ($event->getConferenceData() && $event->getConferenceData()->getEntryPoints()) {
                foreach ($event->getConferenceData()->getEntryPoints() as $entryPoint) {
                    if ($entryPoint->getEntryPointType() === 'video') {
                        $meetLink = $entryPoint->getUri();
                        break;
                    }
                }
            }

            $formattedEvents[] = [
                'id' => $event->getId(),
                'title' => $event->getSummary(),
                'start' => $start,
                'end' => $end,
                'url' => $meetLink ?? $event->getHangoutLink(),
            ];
        }

        return $formattedEvents;
    }
}
