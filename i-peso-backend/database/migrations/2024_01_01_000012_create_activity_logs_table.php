<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id('log_id');
            // Polymorphic columns — actor can be JobSeeker, Employer, or Administrator
            $table->string('user_type', 255);
            $table->unsignedBigInteger('user_id');
            // e.g. "login", "applied_job", "posted_vacancy", "approved_program"
            $table->string('action', 100);
            $table->text('description')->nullable();
            $table->string('ip_address', 45)->nullable(); // 45 chars supports IPv6
            $table->timestamps();

            // Composite index for polymorphic lookups
            $table->index(['user_type', 'user_id'], 'activity_user_index');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};