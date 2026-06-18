<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_work_experiences', function (Blueprint $table) {
            if (! Schema::hasColumn('seeker_work_experiences', 'start_date')) {
                $table->date('start_date')
                    ->nullable()
                    ->after('number_of_months')
                    ->comment('Exact start date used to calculate relevant experience months.');
            }

            if (! Schema::hasColumn('seeker_work_experiences', 'currently_employed')) {
                $table->boolean('currently_employed')
                    ->default(false)
                    ->after('end_date')
                    ->comment('Whether the job seeker is currently employed in this role.');
            }
        });
    }

    public function down(): void
    {
        Schema::table('seeker_work_experiences', function (Blueprint $table) {
            if (Schema::hasColumn('seeker_work_experiences', 'currently_employed')) {
                $table->dropColumn('currently_employed');
            }

            if (Schema::hasColumn('seeker_work_experiences', 'start_date')) {
                $table->dropColumn('start_date');
            }
        });
    }
};
