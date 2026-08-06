<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('activity_logs')) {
            return;
        }

        // The audit trail is always read newest-first and filtered by date range.
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->index('created_at', 'activity_created_at_index');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('activity_logs')) {
            return;
        }

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex('activity_created_at_index');
        });
    }
};
