<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('government_programs') && Schema::hasColumn('government_programs', 'visibility')) {
            DB::table('government_programs')->where('visibility', '!=', 'public')->update(['visibility' => 'public']);
        }
    }

    public function down(): void
    {
        // Visibility is no longer user-configurable; the previous per-row
        // values cannot be recovered safely after this data migration.
    }
};
