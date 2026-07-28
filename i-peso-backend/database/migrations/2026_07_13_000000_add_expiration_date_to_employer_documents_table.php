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
        Schema::table('employer_documents', function (Blueprint $table) {
            // Captured on upload for time-sensitive documents (e.g. Mayor's Permit)
            // so the system can remind employers before the document expires.
            $table->date('expiration_date')->nullable()->after('admin_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employer_documents', function (Blueprint $table) {
            $table->dropColumn('expiration_date');
        });
    }
};
