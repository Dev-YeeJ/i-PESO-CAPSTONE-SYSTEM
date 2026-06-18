<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('seeker_work_experiences', 'end_date')) {
            Schema::table('seeker_work_experiences', function (Blueprint $table) {
                $table->date('end_date')
                    ->nullable()
                    ->after('number_of_months')
                    ->comment('Used by matching recency decay. Null means current or recently active experience.');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('seeker_work_experiences', 'end_date')) {
            Schema::table('seeker_work_experiences', function (Blueprint $table) {
                $table->dropColumn('end_date');
            });
        }
    }
};
