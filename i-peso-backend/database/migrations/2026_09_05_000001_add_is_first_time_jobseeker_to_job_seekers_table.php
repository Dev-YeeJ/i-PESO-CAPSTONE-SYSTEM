<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Self-declared RA 11261 (First-Time Jobseeker Act) status, captured during
     * onboarding. The supporting barangay certificate itself is stored as a
     * seeker_certificates row (category: first_time_jobseeker_certificate),
     * not a separate file column here.
     */
    public function up(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            if (! Schema::hasColumn('job_seekers', 'is_first_time_jobseeker')) {
                $table->boolean('is_first_time_jobseeker')->default(false)->after('household_id_4ps');
            }
        });
    }

    public function down(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            if (Schema::hasColumn('job_seekers', 'is_first_time_jobseeker')) {
                $table->dropColumn('is_first_time_jobseeker');
            }
        });
    }
};
