<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            if (!Schema::hasColumn('job_seekers', 'full_address')) {
                $table->string('full_address', 500)->nullable()->after('complete_address');
            }
            if (!Schema::hasColumn('job_seekers', 'address_region_code')) {
                $table->string('address_region_code', 20)->nullable()->after('address_province');
            }
            if (!Schema::hasColumn('job_seekers', 'location_verified_at')) {
                $table->timestamp('location_verified_at')->nullable()->after('google_place_id');
            }
            
            // Indexes
            if (!Schema::hasIndex('job_seekers', 'job_seekers_address_city_code_index')) {
                $table->index('address_city_code');
            }
            if (!Schema::hasIndex('job_seekers', 'job_seekers_address_barangay_code_index')) {
                $table->index('address_barangay_code');
            }
        });

        Schema::table('employers', function (Blueprint $table) {
            if (!Schema::hasColumn('employers', 'full_address')) {
                $table->string('full_address', 500)->nullable()->after('complete_address');
            }
            if (!Schema::hasColumn('employers', 'region_code')) {
                $table->string('region_code', 20)->nullable()->after('province');
            }
            if (!Schema::hasColumn('employers', 'location_accuracy')) {
                $table->integer('location_accuracy')->nullable()->after('longitude');
            }
            if (!Schema::hasColumn('employers', 'location_verified_at')) {
                $table->timestamp('location_verified_at')->nullable()->after('google_place_id');
            }

            // Indexes
            if (!Schema::hasIndex('employers', 'employers_city_code_index')) {
                $table->index('city_code');
            }
            if (!Schema::hasIndex('employers', 'employers_barangay_code_index')) {
                $table->index('barangay_code');
            }
            if (!Schema::hasIndex('employers', 'employers_verification_status_index')) {
                $table->index('verification_status');
            }
        });

        Schema::table('job_vacancies', function (Blueprint $table) {
            if (!Schema::hasColumn('job_vacancies', 'full_work_address')) {
                $table->string('full_work_address', 500)->nullable()->after('location');
            }
            if (!Schema::hasColumn('job_vacancies', 'location_accuracy')) {
                $table->integer('location_accuracy')->nullable()->after('longitude');
            }
            if (!Schema::hasColumn('job_vacancies', 'location_verified_at')) {
                $table->timestamp('location_verified_at')->nullable()->after('google_place_id');
            }

            // Indexes
            if (!Schema::hasIndex('job_vacancies', 'job_vacancies_city_code_index')) {
                $table->index('city_code');
            }
            if (!Schema::hasIndex('job_vacancies', 'job_vacancies_barangay_code_index')) {
                $table->index('barangay_code');
            }
            if (!Schema::hasIndex('job_vacancies', 'job_vacancies_status_index')) {
                $table->index('status');
            }
            if (!Schema::hasIndex('job_vacancies', 'job_vacancies_application_deadline_index')) {
                $table->index('application_deadline');
            }
        });

        Schema::table('job_fairs', function (Blueprint $table) {
            if (!Schema::hasColumn('job_fairs', 'province_code')) {
                $table->string('province_code', 20)->nullable()->after('venue');
            }
            if (!Schema::hasColumn('job_fairs', 'city_code')) {
                $table->string('city_code', 20)->nullable()->after('province_code');
            }
            if (!Schema::hasColumn('job_fairs', 'barangay_code')) {
                $table->string('barangay_code', 20)->nullable()->after('city_code');
            }
            if (!Schema::hasColumn('job_fairs', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('barangay_code');
            }
            if (!Schema::hasColumn('job_fairs', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
            if (!Schema::hasColumn('job_fairs', 'google_place_id')) {
                $table->string('google_place_id')->nullable()->after('longitude');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // For brevity on down
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->dropColumn(['full_address', 'address_region_code', 'location_verified_at']);
        });
        Schema::table('employers', function (Blueprint $table) {
            $table->dropColumn(['full_address', 'region_code', 'location_accuracy', 'location_verified_at']);
        });
        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->dropColumn(['full_work_address', 'location_accuracy', 'location_verified_at']);
        });
        Schema::table('job_fairs', function (Blueprint $table) {
            $table->dropColumn(['province_code', 'city_code', 'barangay_code', 'google_place_id']);
        });
    }
};
