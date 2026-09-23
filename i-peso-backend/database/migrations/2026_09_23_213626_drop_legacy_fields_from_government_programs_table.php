<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('government_programs', function (Blueprint $table) {
            if (Schema::hasColumn('government_programs', 'start_date')) $table->dropColumn('start_date');
            if (Schema::hasColumn('government_programs', 'end_date')) $table->dropColumn('end_date');
            if (Schema::hasColumn('government_programs', 'venue')) $table->dropColumn('venue');
            if (Schema::hasColumn('government_programs', 'citizen_charter_steps')) $table->dropColumn('citizen_charter_steps');
        });
    }

    public function down(): void
    {
        Schema::table('government_programs', function (Blueprint $table) {
            // No reverse needed for these legacy fields in this prototype.
        });
    }
};
