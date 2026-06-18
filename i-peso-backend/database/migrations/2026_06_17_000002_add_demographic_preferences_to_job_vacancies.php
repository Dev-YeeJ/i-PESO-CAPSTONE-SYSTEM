<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            if (! Schema::hasColumn('job_vacancies', 'preferred_gender')) {
                $table->string('preferred_gender', 20)
                    ->nullable()
                    ->after('application_deadline');
            }

            if (! Schema::hasColumn('job_vacancies', 'minimum_age')) {
                $table->unsignedTinyInteger('minimum_age')
                    ->nullable()
                    ->after('preferred_gender');
            }

            if (! Schema::hasColumn('job_vacancies', 'maximum_age')) {
                $table->unsignedTinyInteger('maximum_age')
                    ->nullable()
                    ->after('minimum_age');
            }
        });
    }

    public function down(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            $columns = array_values(array_filter([
                Schema::hasColumn('job_vacancies', 'maximum_age') ? 'maximum_age' : null,
                Schema::hasColumn('job_vacancies', 'minimum_age') ? 'minimum_age' : null,
                Schema::hasColumn('job_vacancies', 'preferred_gender') ? 'preferred_gender' : null,
            ]));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
