<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('government_programs', function (Blueprint $table) {
            $table->json('citizen_charter_steps')->nullable()->after('required_documents');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('government_programs', function (Blueprint $table) {
            $table->dropColumn('citizen_charter_steps');
        });
    }
};
