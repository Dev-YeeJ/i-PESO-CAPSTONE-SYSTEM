<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Completes the RO1-JF Form 3 (Establishment Report) columns that the paper
 * DOLE form carries but the digital entry did not: the establishment office
 * location, plus per-applicant residence, contact, age-group code, and highest
 * educational attainment. All nullable so existing reports stay valid.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('job_fair_result_reports')) {
            Schema::table('job_fair_result_reports', function (Blueprint $table) {
                if (! Schema::hasColumn('job_fair_result_reports', 'office_location')) {
                    $table->string('office_location')->nullable()->after('company_name');
                }
            });
        }

        if (Schema::hasTable('job_fair_result_entries')) {
            Schema::table('job_fair_result_entries', function (Blueprint $table) {
                if (! Schema::hasColumn('job_fair_result_entries', 'city_municipality')) {
                    $table->string('city_municipality')->nullable()->after('gender');
                }
                if (! Schema::hasColumn('job_fair_result_entries', 'contact_number')) {
                    $table->string('contact_number', 40)->nullable()->after('city_municipality');
                }
                if (! Schema::hasColumn('job_fair_result_entries', 'age_group')) {
                    // DOLE classification codes A–F (A:15-24, B:25-34, C:35-44, D:45-54, E:55-64, F:65+)
                    $table->string('age_group', 2)->nullable()->after('contact_number');
                }
                if (! Schema::hasColumn('job_fair_result_entries', 'highest_education')) {
                    $table->string('highest_education', 40)->nullable()->after('age_group');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('job_fair_result_reports')) {
            Schema::table('job_fair_result_reports', function (Blueprint $table) {
                if (Schema::hasColumn('job_fair_result_reports', 'office_location')) {
                    $table->dropColumn('office_location');
                }
            });
        }

        if (Schema::hasTable('job_fair_result_entries')) {
            Schema::table('job_fair_result_entries', function (Blueprint $table) {
                $columns = collect(['city_municipality', 'contact_number', 'age_group', 'highest_education'])
                    ->filter(fn ($c) => Schema::hasColumn('job_fair_result_entries', $c))
                    ->all();
                if ($columns !== []) {
                    $table->dropColumn($columns);
                }
            });
        }
    }
};
