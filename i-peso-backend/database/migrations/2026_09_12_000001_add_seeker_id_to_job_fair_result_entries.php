<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every applicant row on a job fair result report was pure free text with no
 * link back to a registered job seeker — the same problem the Placement
 * Report's seeker_id/match-confidence columns already solve for reported
 * hires. This lets the applicant-name "smart typing" suggestion record which
 * account a row came from, so the UI can warn if the same seeker is picked
 * twice for one report and an admin can trace a row back to its profile.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_fair_result_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('job_fair_result_entries', 'seeker_id')) {
                $table->unsignedBigInteger('seeker_id')->nullable()->after('result_report_id');
                $table->foreign('seeker_id')->references('seeker_id')->on('job_seekers')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('job_fair_result_entries', function (Blueprint $table) {
            if (Schema::hasColumn('job_fair_result_entries', 'seeker_id')) {
                $table->dropForeign(['seeker_id']);
                $table->dropColumn('seeker_id');
            }
        });
    }
};
