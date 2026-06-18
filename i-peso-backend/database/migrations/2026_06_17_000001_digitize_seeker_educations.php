<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_educations', function (Blueprint $table) {
            if (! Schema::hasColumn('seeker_educations', 'institution_name')) {
                $table->string('institution_name')->nullable()->after('course_strand');
            }

            if (! Schema::hasColumn('seeker_educations', 'completion_status')) {
                $table->string('completion_status', 40)->nullable()->after('institution_name');
            }

            if (! Schema::hasColumn('seeker_educations', 'year_started')) {
                $table->unsignedSmallInteger('year_started')->nullable()->after('completion_status');
            }

            if (! Schema::hasColumn('seeker_educations', 'current_level')) {
                $table->string('current_level', 100)->nullable()->after('undergrad_year_last_attended');
            }
        });
    }

    public function down(): void
    {
        Schema::table('seeker_educations', function (Blueprint $table) {
            $columns = [];

            foreach (['completion_status', 'year_started', 'current_level'] as $column) {
                if (Schema::hasColumn('seeker_educations', $column)) {
                    $columns[] = $column;
                }
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
