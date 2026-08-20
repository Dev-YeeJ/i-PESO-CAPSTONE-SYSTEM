<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InterviewSchedule;
use App\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleCalendarController extends Controller
{
    protected $calendarService;

    public function __construct(GoogleCalendarService $calendarService)
    {
        $this->calendarService = $calendarService;
    }

    /**
     * Redirects the employer to Google OAuth screen.
     */
    public function connect(Request $request): JsonResponse
    {
        $client = $this->calendarService->getClient();
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

        $client = $this->calendarService->getClient();
        
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

        $validated = $request->validate([
            'schedule' => ['required', 'date', 'after:now'],
            'summary' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        try {
            $result = $this->calendarService->createMeetEvent(
                $employer, 
                $validated['schedule'], 
                $validated['summary'], 
                $validated['description'] ?? 'Interview details.'
            );
            return response()->json($result);
        } catch (\Exception $e) {
            if ($e->getCode() === 403) {
                return response()->json(['message' => $e->getMessage()], 403);
            }
            Log::error('Failed to generate Google Meet link: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to generate meeting link.', 'error' => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }

    /**
     * Fetches the employer's scheduled interviews for the calendar view.
     *
     * Reads from i-PESO's own database rather than the Google Calendar API,
     * so every employer sees their interviews immediately — connecting
     * Google Calendar is only needed for auto-generated Meet links, not
     * for seeing the schedule itself.
     */
    public function events(Request $request): JsonResponse
    {
        $employer = $request->user();

        $validated = $request->validate([
            'start' => ['required', 'date'],
            'end' => ['required', 'date'],
        ]);

        $interviews = InterviewSchedule::query()
            ->with(['application.jobVacancy', 'application.jobSeeker'])
            ->whereHas('application.jobVacancy', fn ($vacancy) => $vacancy->where('employer_id', $employer->employer_id))
            ->where('status', 'scheduled')
            ->whereBetween('schedule', [$validated['start'], $validated['end']])
            ->orderBy('schedule')
            ->get();

        $events = $interviews->map(function (InterviewSchedule $interview) {
            $jobTitle = $interview->application?->jobVacancy?->job_title ?? 'Interview';
            $seeker = $interview->application?->jobSeeker;
            $seekerName = trim(($seeker->first_name ?? '') . ' ' . ($seeker->last_name ?? ''));
            $isMeetLink = $interview->mode_of_interview === 'online'
                && $interview->venue_or_link
                && str_starts_with($interview->venue_or_link, 'http');

            return [
                'id' => (string) $interview->interview_id,
                'title' => $seekerName !== '' ? "{$seekerName} — {$jobTitle}" : $jobTitle,
                'start' => $interview->schedule->toIso8601String(),
                'end' => $interview->schedule->copy()->addMinutes(30)->toIso8601String(),
                'url' => $isMeetLink ? $interview->venue_or_link : null,
            ];
        })->values();

        return response()->json([
            'events' => $events,
            'google_connected' => filled($employer->google_refresh_token),
        ]);
    }
}
