<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Seeker-to-Employer reporting: job seekers flag suspicious, abusive, or fake
 * employers / job postings for PESO administrators to review and act on.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employer_reports')) {
            return;
        }

        Schema::create('employer_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employer_id')
                ->constrained('employers', 'employer_id')->cascadeOnDelete();
            // FK to job_seekers.seeker_id — the codebase names this column `seeker_id` everywhere.
            $table->foreignId('seeker_id')
                ->constrained('job_seekers', 'seeker_id')->cascadeOnDelete();
            $table->string('reason');
            $table->text('description');
            $table->string('status')->default('pending');
            $table->text('admin_notes')->nullable();
            $table->foreignId('resolved_by')->nullable()
                ->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['employer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employer_reports');
    }
};
