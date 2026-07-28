<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Typed eligibility rules for the seeker matching engine.
 * The existing `eligibility_requirements` (free-form JSON) stays for human-readable
 * display; `eligibility_rules` holds the machine-evaluable rule objects.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('government_programs', 'eligibility_rules')) {
            Schema::table('government_programs', function (Blueprint $table) {
                $table->json('eligibility_rules')->nullable()->after('eligibility_requirements');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('government_programs', 'eligibility_rules')) {
            Schema::table('government_programs', function (Blueprint $table) {
                $table->dropColumn('eligibility_rules');
            });
        }
    }
};
