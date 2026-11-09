<?php

namespace App\Services;

use App\Models\Administrator;
use App\Models\OjtTimeLog;
use Illuminate\Support\Carbon;

/** An intern's hours so far, for their own page and the admin's OJT list. */
class OjtProgress
{
    /** Interns whose internship ends within this many days are flagged. */
    public const ENDING_SOON_DAYS = 3;

    public static function summary(Administrator $intern): array
    {
        $totals = $intern->ojtTimeLogs()
            ->selectRaw('status, COALESCE(SUM(minutes), 0) as minutes, COUNT(*) as entries')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $approvedMinutes = (int) ($totals[OjtTimeLog::APPROVED]->minutes ?? 0);
        $pendingMinutes = (int) ($totals[OjtTimeLog::PENDING]->minutes ?? 0);
        $requiredMinutes = (int) ($intern->ojt_required_hours ?? 0) * 60;

        $today = Carbon::parse(OjtTimeLog::today());
        $daysLeft = $intern->ojt_end_date ? (int) $today->diffInDays($intern->ojt_end_date, false) : null;

        $incomplete = $intern->ojtTimeLogs()
            ->where('status', OjtTimeLog::OPEN)
            ->where('work_date', '<', $today->toDateString())
            ->count();

        return [
            'school' => $intern->ojt_school,
            'course' => $intern->ojt_course,
            'required_hours' => $intern->ojt_required_hours,
            'start_date' => $intern->ojt_start_date?->toDateString(),
            'end_date' => $intern->ojt_end_date?->toDateString(),
            'approved_hours' => round($approvedMinutes / 60, 2),
            'pending_hours' => round($pendingMinutes / 60, 2),
            'remaining_hours' => $requiredMinutes ? round(max(0, $requiredMinutes - $approvedMinutes) / 60, 2) : null,
            'percent' => $requiredMinutes ? min(100, (int) floor($approvedMinutes / $requiredMinutes * 100)) : null,
            'hours_completed' => $requiredMinutes > 0 && $approvedMinutes >= $requiredMinutes,
            'pending_entries' => (int) ($totals[OjtTimeLog::PENDING]->entries ?? 0),
            'incomplete_entries' => $incomplete,
            'days_left' => $daysLeft,
            'ending_soon' => $daysLeft !== null && $daysLeft >= 0 && $daysLeft <= self::ENDING_SOON_DAYS && $intern->isActive(),
            'ended' => $intern->internshipEnded(),
        ];
    }
}
