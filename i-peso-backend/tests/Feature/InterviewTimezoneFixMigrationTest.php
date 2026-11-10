<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class InterviewTimezoneFixMigrationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_existing_interviews_move_back_to_the_time_the_employer_picked(): void
    {
        Schema::dropIfExists('interview_schedules');
        Schema::create('interview_schedules', function (Blueprint $table) {
            $table->id('interview_id');
            $table->unsignedBigInteger('apply_id');
            $table->dateTime('schedule')->nullable();
            $table->timestamps();
        });

        // Picked as 3:23 AM Manila but saved as if it were UTC.
        DB::table('interview_schedules')->insert(['apply_id' => 1, 'schedule' => '2026-11-11 03:23:00']);
        DB::table('interview_schedules')->insert(['apply_id' => 2, 'schedule' => null]);

        (require database_path('migrations/2026_11_12_000002_fix_interview_schedule_timezone.php'))->up();

        // 3:23 AM Manila is 7:23 PM UTC the day before.
        $this->assertSame('2026-11-10 19:23:00', DB::table('interview_schedules')->where('apply_id', 1)->value('schedule'));
        $this->assertNull(DB::table('interview_schedules')->where('apply_id', 2)->value('schedule'));
    }
}
