<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\OjtTimeLog;
use App\Services\ActivityLogger;
use App\Services\OjtProgress;
use App\Support\StaffPositions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Interns' time records for the office: everyone with Configuration access
 * can look; only the system administrator approves, rejects, corrects or
 * adds entries.
 */
class AdminOjtController extends Controller
{
    public function interns(): JsonResponse
    {
        $interns = Administrator::query()
            ->where('position', StaffPositions::OJT_INTERN)
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderBy('first_name')
            ->get()
            ->map(fn (Administrator $intern) => $this->formatIntern($intern));

        return response()->json([
            'data' => $interns,
            'summary' => [
                'active' => $interns->where('status', 'active')->count(),
                'pending_entries' => $interns->sum(fn ($intern) => $intern['progress']['pending_entries']),
                'ending_soon' => $interns->filter(fn ($intern) => $intern['progress']['ending_soon'])->count(),
                'completed' => $interns->filter(fn ($intern) => $intern['progress']['hours_completed'])->count(),
            ],
        ]);
    }

    public function logs(Administrator $intern): JsonResponse
    {
        $this->ensureIntern($intern);

        return response()->json([
            'intern' => $this->formatIntern($intern),
            'logs' => $intern->ojtTimeLogs()
                ->with('reviewer')
                ->orderByDesc('work_date')
                ->get()
                ->map(fn (OjtTimeLog $log) => $log->toApiArray())
                ->values(),
        ]);
    }

    public function approve(Request $request, OjtTimeLog $log): JsonResponse
    {
        abort_unless($log->status === OjtTimeLog::PENDING || $log->status === OjtTimeLog::REJECTED, 422,
            $log->status === OjtTimeLog::OPEN
                ? 'This entry has no time out yet. Correct it to add the time out.'
                : 'This entry is already approved.');

        $this->review($request, $log, OjtTimeLog::APPROVED, $request->input('note'));

        return $this->logResponse($log, 'Hours approved.');
    }

    public function reject(Request $request, OjtTimeLog $log): JsonResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'max:500']], [
            'note.required' => 'Say why, so the intern knows what to fix.',
        ]);

        abort_if($log->status === OjtTimeLog::OPEN, 422, 'This entry has no time out yet. Correct it instead.');

        $this->review($request, $log, OjtTimeLog::REJECTED, $data['note']);

        return $this->logResponse($log, 'Entry rejected.');
    }

    /** Approves every pending entry of one intern at once. */
    public function approvePending(Request $request, Administrator $intern): JsonResponse
    {
        $this->ensureIntern($intern);

        $pending = $intern->ojtTimeLogs()->where('status', OjtTimeLog::PENDING)->get();
        foreach ($pending as $log) {
            $log->update(['status' => OjtTimeLog::APPROVED, 'reviewed_by' => $request->user()->admin_id, 'reviewed_at' => now()]);
        }

        if ($pending->isNotEmpty()) {
            ActivityLogger::log('approved_ojt_hours', sprintf(
                'Approved %d time %s (%s hours) for intern %s.',
                $pending->count(),
                $pending->count() === 1 ? 'entry' : 'entries',
                round($pending->sum('minutes') / 60, 2),
                $this->name($intern)
            ));
        }

        return response()->json([
            'message' => $pending->isEmpty() ? 'Nothing waiting for approval.' : "Approved {$pending->count()} ".($pending->count() === 1 ? 'entry.' : 'entries.'),
            'intern' => $this->formatIntern($intern),
        ]);
    }

    /** Fixes a wrong or forgotten time. Corrected entries count as approved. */
    public function update(Request $request, OjtTimeLog $log): JsonResponse
    {
        $data = $this->validatedTimes($request);
        [$timeIn, $timeOut] = $this->times($log->work_date->toDateString(), $data['time_in'], $data['time_out']);

        $before = sprintf('%s–%s', $this->clock($log->time_in), $log->time_out ? $this->clock($log->time_out) : 'no time out');

        $log->update([
            'time_in' => $timeIn,
            'time_out' => $timeOut,
            'minutes' => OjtTimeLog::minutesBetween($timeIn, $timeOut),
            'status' => OjtTimeLog::APPROVED,
            'corrected' => true,
            'note' => $data['note'],
            'reviewed_by' => $request->user()->admin_id,
            'reviewed_at' => now(),
        ]);

        ActivityLogger::log('corrected_ojt_time', sprintf(
            'Corrected %s\'s time for %s from %s to %s–%s. Reason: %s',
            $this->name($log->intern),
            $log->work_date->format('M j, Y'),
            $before,
            $this->clock($timeIn),
            $this->clock($timeOut),
            $data['note']
        ));

        return $this->logResponse($log, 'Entry corrected and approved.');
    }

    /** Adds a day the intern worked but never timed in (e.g. the system was down). */
    public function store(Request $request, Administrator $intern): JsonResponse
    {
        $this->ensureIntern($intern);

        $data = $this->validatedTimes($request) + $request->validate([
            'work_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.OjtTimeLog::today()],
        ], ['work_date.before_or_equal' => "You can't add hours for a future date."]);

        if ($intern->ojtTimeLogs()->whereDate('work_date', $data['work_date'])->exists()) {
            throw ValidationException::withMessages(['work_date' => 'There is already an entry for this date. Correct that entry instead.']);
        }

        [$timeIn, $timeOut] = $this->times($data['work_date'], $data['time_in'], $data['time_out']);

        $log = $intern->ojtTimeLogs()->create([
            'work_date' => $data['work_date'],
            'time_in' => $timeIn,
            'time_out' => $timeOut,
            'minutes' => OjtTimeLog::minutesBetween($timeIn, $timeOut),
            'status' => OjtTimeLog::APPROVED,
            'corrected' => true,
            'note' => $data['note'],
            'reviewed_by' => $request->user()->admin_id,
            'reviewed_at' => now(),
        ]);

        ActivityLogger::log('added_ojt_time', sprintf(
            'Added a time entry for %s on %s (%s–%s). Reason: %s',
            $this->name($intern),
            $log->work_date->format('M j, Y'),
            $this->clock($timeIn),
            $this->clock($timeOut),
            $data['note']
        ));

        return $this->logResponse($log, 'Entry added and approved.', 201);
    }

    private function review(Request $request, OjtTimeLog $log, string $status, ?string $note): void
    {
        $log->update([
            'status' => $status,
            'note' => $note ?: $log->note,
            'reviewed_by' => $request->user()->admin_id,
            'reviewed_at' => now(),
        ]);

        ActivityLogger::log($status === OjtTimeLog::APPROVED ? 'approved_ojt_hours' : 'rejected_ojt_hours', sprintf(
            '%s %s\'s %s hours for %s.%s',
            $status === OjtTimeLog::APPROVED ? 'Approved' : 'Rejected',
            $this->name($log->intern),
            round(($log->minutes ?? 0) / 60, 2),
            $log->work_date->format('M j, Y'),
            $note ? " Note: {$note}" : ''
        ));
    }

    private function validatedTimes(Request $request): array
    {
        return $request->validate([
            'time_in' => ['required', 'date_format:H:i'],
            'time_out' => ['required', 'date_format:H:i', 'after:time_in'],
            'note' => ['required', 'string', 'max:500'],
        ], [
            'time_out.after' => 'Time out must be later than time in.',
            'note.required' => 'Give a reason for the change.',
        ]);
    }

    /** "HH:MM" on a work date, read as Philippine time. */
    private function times(string $workDate, string $timeIn, string $timeOut): array
    {
        return [
            Carbon::parse("{$workDate} {$timeIn}", OjtTimeLog::TIMEZONE)->utc(),
            Carbon::parse("{$workDate} {$timeOut}", OjtTimeLog::TIMEZONE)->utc(),
        ];
    }

    private function logResponse(OjtTimeLog $log, string $message, int $status = 200): JsonResponse
    {
        $log->refresh()->load(['reviewer', 'intern']);

        return response()->json([
            'message' => $message,
            'log' => $log->toApiArray(),
            'intern' => $this->formatIntern($log->intern),
        ], $status);
    }

    private function formatIntern(Administrator $intern): array
    {
        return [
            'id' => $intern->admin_id,
            'name' => $this->name($intern),
            'email' => $intern->email,
            'status' => $intern->status,
            'progress' => OjtProgress::summary($intern),
        ];
    }

    private function ensureIntern(Administrator $intern): void
    {
        abort_unless($intern->isIntern(), 404, 'This account is not an OJT intern.');
    }

    private function name(?Administrator $person): string
    {
        return $person ? trim("{$person->first_name} {$person->last_name}") : 'Unknown';
    }

    private function clock(Carbon $time): string
    {
        return $time->copy()->timezone(OjtTimeLog::TIMEZONE)->format('g:i A');
    }
}
