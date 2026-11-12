<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employer_documents', function (Blueprint $table) {
            $table->timestamp('staff_viewed_at')->nullable()->after('viewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('employer_documents', function (Blueprint $table) {
            $table->dropColumn('staff_viewed_at');
        });
    }
};
