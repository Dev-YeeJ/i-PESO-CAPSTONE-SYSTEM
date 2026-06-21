<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_educations', function (Blueprint $table) {
            if (Schema::hasColumn('seeker_educations', 'level')) {
                $table->string('level', 100)->change();
            }

            if (! Schema::hasColumn('seeker_educations', 'expected_year_graduated')) {
                $table->unsignedSmallInteger('expected_year_graduated')
                    ->nullable()
                    ->after('year_graduated');
            }
        });
    }

    public function down(): void
    {
        Schema::table('seeker_educations', function (Blueprint $table) {
            if (Schema::hasColumn('seeker_educations', 'expected_year_graduated')) {
                $table->dropColumn('expected_year_graduated');
            }
        });
    }
};
