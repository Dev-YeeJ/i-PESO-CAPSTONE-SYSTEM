<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('skill_catalog_entries', function (Blueprint $table) {
            $table->text('search_terms')->nullable()->after('normalized_name');
        });
    }

    public function down(): void
    {
        Schema::table('skill_catalog_entries', function (Blueprint $table) {
            $table->dropColumn('search_terms');
        });
    }
};
