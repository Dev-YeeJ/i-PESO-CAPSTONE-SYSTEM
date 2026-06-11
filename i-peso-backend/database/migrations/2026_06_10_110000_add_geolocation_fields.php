<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->string('address_province_code', 10)->nullable()->after('address_province');
            $table->string('address_city_code', 10)->nullable()->after('address_province_code');
            $table->string('address_barangay_code', 10)->nullable()->after('address_city_code');
            $table->decimal('latitude', 10, 7)->nullable()->after('address_barangay_code');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->unsignedInteger('location_accuracy')->nullable()->after('longitude');
            $table->string('geoapify_place_id')->nullable()->after('location_accuracy');
            $table->index(['latitude', 'longitude'], 'job_seekers_coordinates_index');
        });

        Schema::table('employers', function (Blueprint $table) {
            $table->string('province_code', 10)->nullable()->after('province');
            $table->string('city_code', 10)->nullable()->after('city_municipality');
            $table->string('barangay_code', 10)->nullable()->after('barangay');
            $table->decimal('latitude', 10, 7)->nullable()->after('house_unit_street');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->string('geoapify_place_id')->nullable()->after('longitude');
            $table->index(['latitude', 'longitude'], 'employers_coordinates_index');
        });

        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->string('province_code', 10)->nullable()->after('province');
            $table->string('city_code', 10)->nullable()->after('city_municipality');
            $table->string('barangay_code', 10)->nullable()->after('barangay');
            $table->decimal('latitude', 10, 7)->nullable()->after('specific_address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->string('geoapify_place_id')->nullable()->after('longitude');
            $table->index(['latitude', 'longitude'], 'job_vacancies_coordinates_index');
        });
    }

    public function down(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->dropIndex('job_seekers_coordinates_index');
            $table->dropColumn([
                'address_province_code',
                'address_city_code',
                'address_barangay_code',
                'latitude',
                'longitude',
                'location_accuracy',
                'geoapify_place_id',
            ]);
        });

        Schema::table('employers', function (Blueprint $table) {
            $table->dropIndex('employers_coordinates_index');
            $table->dropColumn([
                'province_code',
                'city_code',
                'barangay_code',
                'latitude',
                'longitude',
                'geoapify_place_id',
            ]);
        });

        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->dropIndex('job_vacancies_coordinates_index');
            $table->dropColumn([
                'province_code',
                'city_code',
                'barangay_code',
                'latitude',
                'longitude',
                'geoapify_place_id',
            ]);
        });
    }
};
