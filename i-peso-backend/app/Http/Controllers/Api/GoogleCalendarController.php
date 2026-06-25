<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Google\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleCalendarController extends Controller
{
    private function getGoogleClient(?\App\Models\Employer $employer = null): Client
    {
        $client = new Client();
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setRedirectUri(config('services.google.calendar_redirect'));
        $client->addScope(\Google\Service\Calendar::CALENDAR_EVENTS);
        $client->setAccessType('offline');
        $client->setPrompt('consent');

        if ($employer && $employer->google_access_token) {
            $client->setAccessToken([
                'access_token' => $employer->google_access_token,
                'refresh_token' => $employer->google_refresh_token,
                'expires_in' => $employer->google_token_expires_at ? $employer->google_token_expires_at->diffInSeconds(now()) : 3600,
            ]);

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
     * Redirects the employer to Google OAuth screen.
     */
    public function connect(Request $request): JsonResponse
    {
        $client = $this->getGoogleClient();
        // Encrypt the employer ID to safely pass it through Google's state parameter
        $client->setState(encrypt($request->user()->employer_id));
        $authUrl = $client->createAuthUrl();

        return response()->json(['url' => $authUrl]);
    }

    /**
     * Handles the callback from Google OAuth.
     */
    public function callback(Request $request)
    {
        $code = $request->input('code');
        $state = $request->input('state');

        if (!$code || !$state) {
            return redirect(config('app.frontend_url') . '/employer/ats?calendar_error=1');
        }

        try {
            $employerId = decrypt($state);
            $employer = \App\Models\Employer::findOrFail($employerId);
        } catch (\Exception $e) {
            Log::error('Google Calendar invalid state: ' . $e->getMessage());
            return redirect(config('app.frontend_url') . '/employer/ats?calendar_error=1');
        }

        $client = $this->getGoogleClient();
        
        try {
            $token = $client->fetchAccessTokenWithAuthCode($code);

            if (isset($token['error'])) {
                Log::error('Google Calendar OAuth error: ' . json_encode($token));
                return redirect(config('app.frontend_url') . '/employer/ats?calendar_error=1');
            }

            $employer->forceFill([
                'google_access_token' => $token['access_token'],
                'google_refresh_token' => $token['refresh_token'] ?? $employer->google_refresh_token,
                'google_token_expires_at' => isset($token['expires_in']) ? now()->addSeconds($token['expires_in']) : null,
            ])->save();

            return redirect(config('app.frontend_url') . '/employer/ats?calendar_success=1');
        } catch (\Exception $e) {
            Log::error('Google Calendar integration failed: ' . $e->getMessage());
            return redirect(config('app.frontend_url') . '/employer/ats?calendar_error=1');
        }
    }

    /**
     * Generates a Google Meet link for an interview.
     */
    public function generateMeetLink(Request $request)
    {
        $employer = $request->user();

        if (!$employer->google_access_token) {
            return response()->json(['message' => 'Google Calendar not connected.'], 403);
        }

        $validated = $request->validate([
            'schedule' => ['required', 'date', 'after:now'],
            'summary' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        try {
            $client = $this->getGoogleClient($employer);
            $service = new \Google\Service\Calendar($client);

            $event = new \Google\Service\Calendar\Event([
                'summary' => $validated['summary'],
                'description' => $validated['description'] ?? 'Interview details.',
                'start' => [
                    'dateTime' => \Carbon\Carbon::parse($validated['schedule'])->toRfc3339String(),
                    'timeZone' => config('app.timezone'),
                ],
                'end' => [
                    'dateTime' => \Carbon\Carbon::parse($validated['schedule'])->addHour()->toRfc3339String(),
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

            return response()->json([
                'meet_link' => $meetLink ?? $event->getHangoutLink(),
                'event_id' => $event->getId(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to generate Google Meet link: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to generate meeting link.', 'error' => $e->getMessage()], 500);
        }
    }
}
