<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * job_fairs already carries province_code/city_code/barangay_code/latitude/
 * longitude/google_place_id from an earlier migration, but never the matching
 * human-readable names (job_vacancies has both). Without them there is
 * nothing to show on the PSGC cascade UI or feed into the geocoder.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_fairs', function (Blueprint $table) {
            if (! Schema::hasColumn('job_fairs', 'province')) {
                $table->string('province', 100)->nullable()->after('venue');
            }
            if (! Schema::hasColumn('job_fairs', 'city_municipality')) {
                $table->string('city_municipality', 150)->nullable()->after('province');
            }
            if (! Schema::hasColumn('job_fairs', 'barangay')) {
                $table->string('barangay', 150)->nullable()->after('city_municipality');
            }
            if (! Schema::hasColumn('job_fairs', 'specific_address')) {
                $table->string('specific_address', 255)->nullable()->after('barangay');
            }
        });
    }

    public function down(): void
    {
        Schema::table('job_fairs', function (Blueprint $table) {
            $columns = collect(['province', 'city_municipality', 'barangay', 'specific_address'])
                ->filter(fn (string $column) => Schema::hasColumn('job_fairs', $column))->all();

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
