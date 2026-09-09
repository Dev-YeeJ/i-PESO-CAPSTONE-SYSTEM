<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Completes the remaining RO1-JF Form 3 fields the paper form carries but the
 * digital report did not: the Job Fair Clearance No., a qualified-applicant
 * tally (status splits into qualified/near_hired/hots/employer_mismatch/
 * seeker_mismatch instead of the old 3-value hots/near_hired/rejected), and
 * per-applicant Jobseeker Classification checkboxes.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('job_fair_result_reports')) {
            Schema::table('job_fair_result_reports', function (Blueprint $table) {
                if (! Schema::hasColumn('job_fair_result_reports', 'clearance_no')) {
                    $table->string('clearance_no')->nullable()->after('office_location');
                }
                if (! Schema::hasColumn('job_fair_result_reports', 'total_qualified')) {
                    $table->unsignedInteger('total_qualified')->default(0)->after('total_applicants');
                }
            });
        }

        if (Schema::hasTable('job_fair_result_entries')) {
            Schema::table('job_fair_result_entries', function (Blueprint $table) {
                if (! Schema::hasColumn('job_fair_result_entries', 'classification_codes')) {
                    $table->json('classification_codes')->nullable()->after('highest_education');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('job_fair_result_reports')) {
            Schema::table('job_fair_result_reports', function (Blueprint $table) {
                $columns = collect(['clearance_no', 'total_qualified'])
                    ->filter(fn ($c) => Schema::hasColumn('job_fair_result_reports', $c))
                    ->all();
                if ($columns !== []) {
                    $table->dropColumn($columns);
                }
            });
        }

        if (Schema::hasTable('job_fair_result_entries')) {
            Schema::table('job_fair_result_entries', function (Blueprint $table) {
                if (Schema::hasColumn('job_fair_result_entries', 'classification_codes')) {
                    $table->dropColumn('classification_codes');
                }
            });
        }
    }
};
