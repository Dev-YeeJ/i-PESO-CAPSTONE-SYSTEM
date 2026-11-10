<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Interview times were picked on the office clock (Philippine time, UTC+8)
 * but saved as if they were UTC, so every interview showed — and reminded,
 * and "ended" — 8 hours late. New interviews are now saved correctly; this
 * moves the existing ones back to the time the employer actually picked.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('interview_schedules')) {
            return;
        }

        $fixed = 0;

        DB::table('interview_schedules')
            ->whereNotNull('schedule')
            ->orderBy('interview_id')
            ->chunkById(200, function ($rows) use (&$fixed) {
                foreach ($rows as $row) {
                    // The stored value is the Manila wall-clock time; read it as such.
                    $correct = Carbon::parse($row->schedule, 'Asia/Manila')->utc();

                    DB::table('interview_schedules')->where('interview_id', $row->interview_id)->update([
                        'schedule' => $correct->format('Y-m-d H:i:s'),
                    ]);
                    $fixed++;
                }
            }, 'interview_id');

        Log::info("Interview time zone fix: moved {$fixed} interview(s) back 8 hours to UTC.");
    }

    public function down(): void
    {
        DB::table('interview_schedules')
            ->whereNotNull('schedule')
            ->orderBy('interview_id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('interview_schedules')->where('interview_id', $row->interview_id)->update([
                        'schedule' => Carbon::parse($row->schedule, 'UTC')->timezone('Asia/Manila')->format('Y-m-d H:i:s'),
                    ]);
                }
            }, 'interview_id');
    }
};
