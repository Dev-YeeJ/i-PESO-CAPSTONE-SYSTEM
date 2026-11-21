<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An application used to hold exactly one interview row (apply_id was unique), and
 * scheduling overwrote it. A second round, or re-inviting someone, erased the interview
 * that had already been held, so it vanished from the employer's calendar along with its
 * "Call ended" label. Each interview is now its own row; the application's current
 * interview is the latest one (Application::interviewSchedule), and at most one row per
 * application is ever "scheduled".
 */
return new class extends Migration
{
    public function up(): void
    {
        // A plain index first: on MySQL the apply_id foreign key needs an index to lean on
        // once the unique one is gone.
        if (! Schema::hasIndex('interview_schedules', 'interview_schedules_apply_id_index')) {
            Schema::table('interview_schedules', function (Blueprint $table) {
                $table->index('apply_id', 'interview_schedules_apply_id_index');
            });
        }

        if (Schema::hasIndex('interview_schedules', 'interview_schedules_apply_id_unique')) {
            Schema::table('interview_schedules', function (Blueprint $table) {
                $table->dropUnique('interview_schedules_apply_id_unique');
            });
        }
    }

    /**
     * Only possible while no application has more than one interview row.
     */
    public function down(): void
    {
        if (! Schema::hasIndex('interview_schedules', 'interview_schedules_apply_id_unique')) {
            Schema::table('interview_schedules', function (Blueprint $table) {
                $table->unique('apply_id', 'interview_schedules_apply_id_unique');
            });
        }

        if (Schema::hasIndex('interview_schedules', 'interview_schedules_apply_id_index')) {
            Schema::table('interview_schedules', function (Blueprint $table) {
                $table->dropIndex('interview_schedules_apply_id_index');
            });
        }
    }
};
