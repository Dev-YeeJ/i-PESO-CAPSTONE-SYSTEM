<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\OjtTimeLog;
use App\Services\ActivityLogger;
use App\Services\OjtProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** The signed-in intern's own daily time record (DTR). */
class OjtTimeLogController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        $intern = $this->intern($request);

        return response()->json($this->payload($intern));
    }

    public function timeIn(Request $request): JsonResponse
    {
        $intern = $this->intern($request);
        $today = OjtTimeLog::today();

        abort_if(
            $intern->ojt_start_date && $today < $intern->ojt_start_date->toDateString(),
            422,
            'Your internship starts on '.$intern->ojt_start_date->format('F j, Y').'. You can time in from then.'
        );

        $existing = $intern->ojtTimeLogs()->whereDate('work_date', $today)->first();
        abort_if($existing?->time_out, 422, 'You already timed in and out today.');
        abort_if((bool) $existing, 422, 'You already timed in today.');

        $log = $intern->ojtTimeLogs()->create([
            'work_date' => $today,
            'time_in' => now(),
            'status' => OjtTimeLog::OPEN,
            'time_in_ip' => $request->ip(),
        ]);

        ActivityLogger::logAs($intern, 'timed_in', 'Timed in at '.$this->clock($log->time_in).'.');

        return response()->json(['message' => 'Timed in at '.$this->clock($log->time_in).'.'] + $this->payload($intern));
    }

    public function timeOut(Request $request): JsonResponse
    {
        $intern = $this->intern($request);

        $log = $intern->ojtTimeLogs()
            ->whereDate('work_date', OjtTimeLog::today())
            ->where('status', OjtTimeLog::OPEN)
            ->first();

        abort_unless($log, 422, "You haven't timed in today.");

        $timeOut = now();
        $log->update([
            'time_out' => $timeOut,
            'minutes' => OjtTimeLog::minutesBetween($log->time_in, $timeOut),
            'status' => OjtTimeLog::PENDING,
            'time_out_ip' => $request->ip(),
        ]);

        $hours = round($log->minutes / 60, 2);
        ActivityLogger::logAs($intern, 'timed_out', "Timed out at {$this->clock($timeOut)} ({$hours} hours, waiting for approval).");

        return response()->json([
            'message' => "Timed out at {$this->clock($timeOut)}. {$hours} hours sent for approval.",
        ] + $this->payload($intern));
    }

    private function payload(Administrator $intern): array
    {
        $today = $intern->ojtTimeLogs()->whereDate('work_date', OjtTimeLog::today())->first();

        return [
            'progress' => OjtProgress::summary($intern),
            'today' => $today?->toApiArray(),
            'logs' => $intern->ojtTimeLogs()
                ->with('reviewer')
                ->orderByDesc('work_date')
                ->limit(120)
                ->get()
                ->map(fn (OjtTimeLog $log) => $log->toApiArray())
                ->values(),
        ];
    }

    private function intern(Request $request): Administrator
    {
        $user = $request->user();
        abort_unless($user instanceof Administrator && $user->isIntern(), 403, 'Only OJT intern accounts have a time record.');

        return $user;
    }

    private function clock(Carbon $time): string
    {
        return $time->copy()->timezone(OjtTimeLog::TIMEZONE)->format('g:i A');
    }
}
