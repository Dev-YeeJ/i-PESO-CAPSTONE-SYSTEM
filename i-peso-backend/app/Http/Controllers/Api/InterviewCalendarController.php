<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InterviewSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InterviewCalendarController extends Controller
{
    /**
     * Fetches the employer's scheduled interviews for the calendar view.
     *
     * Reads from i-PESO's own database — interview scheduling and its Jitsi
     * links never touch an external calendar API, so this always reflects
     * every interview immediately, for every employer, with nothing to
     * connect first.
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
            // Completed interviews stay on the calendar as a record of what was held.
            ->whereIn('status', ['scheduled', 'completed'])
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
                'end' => $interview->endsAt()->toIso8601String(),
                // No join link once the call is over; the event is history now.
                'url' => $isMeetLink && $interview->phase() !== 'ended' ? $interview->venue_or_link : null,
                'phase' => $interview->phase(),
                'mode_of_interview' => $interview->mode_of_interview,
            ];
        })->values();

        return response()->json([
            'events' => $events,
        ]);
    }
}
