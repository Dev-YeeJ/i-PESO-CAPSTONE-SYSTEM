<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AllowSeveralInterviewsMigrationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_an_application_can_hold_several_interviews_after_the_migration(): void
    {
        // The table as originally created: one interview per application.
        Schema::dropIfExists('interview_schedules');
        Schema::create('interview_schedules', function (Blueprint $table) {
            $table->id('interview_id');
            $table->unsignedBigInteger('apply_id')->unique();
            $table->string('status')->default('scheduled');
            $table->timestamps();
        });
        DB::table('interview_schedules')->insert(['apply_id' => 1, 'status' => 'completed']);

        try {
            DB::table('interview_schedules')->insert(['apply_id' => 1, 'status' => 'scheduled']);
            $this->fail('The original table should refuse a second interview for one application.');
        } catch (QueryException) {
            // expected before the migration
        }

        $migration = require database_path('migrations/2026_11_21_000001_allow_several_interviews_per_application.php');
        $migration->up();
        $migration->up(); // safe to run twice

        DB::table('interview_schedules')->insert(['apply_id' => 1, 'status' => 'scheduled']);
        $this->assertSame(2, DB::table('interview_schedules')->where('apply_id', 1)->count());
        $this->assertTrue(Schema::hasIndex('interview_schedules', 'interview_schedules_apply_id_index'));
        $this->assertFalse(Schema::hasIndex('interview_schedules', 'interview_schedules_apply_id_unique'));
    }
}
