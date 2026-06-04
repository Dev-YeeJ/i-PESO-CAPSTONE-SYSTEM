<?php
// i-peso-backend/database/migrations/2026_06_03_100000_add_is_verified_to_job_seekers_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->boolean('is_verified')->default(false)->after('email_verified_at');
            $table->timestamp('verified_at')->nullable()->after('is_verified');
            $table->unsignedBigInteger('verified_by')->nullable()->after('verified_at');
            $table->text('verification_remarks')->nullable()->after('verified_by');
            
            $table->foreign('verified_by')
                  ->references('admin_id')
                  ->on('administrators')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->dropForeign(['verified_by']);
            $table->dropColumn(['is_verified', 'verified_at', 'verified_by', 'verification_remarks']);
        });
    }
};
