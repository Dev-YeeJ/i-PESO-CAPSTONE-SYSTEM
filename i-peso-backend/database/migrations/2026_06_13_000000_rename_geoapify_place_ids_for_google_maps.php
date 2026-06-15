<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['job_seekers', 'employers', 'job_vacancies'] as $tableName) {
            if (
                Schema::hasColumn($tableName, 'geoapify_place_id')
                && ! Schema::hasColumn($tableName, 'google_place_id')
            ) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->renameColumn('geoapify_place_id', 'google_place_id');
                });
            }
        }
    }

    public function down(): void
    {
        foreach (['job_seekers', 'employers', 'job_vacancies'] as $tableName) {
            if (
                Schema::hasColumn($tableName, 'google_place_id')
                && ! Schema::hasColumn($tableName, 'geoapify_place_id')
            ) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->renameColumn('google_place_id', 'geoapify_place_id');
                });
            }
        }
    }
};
