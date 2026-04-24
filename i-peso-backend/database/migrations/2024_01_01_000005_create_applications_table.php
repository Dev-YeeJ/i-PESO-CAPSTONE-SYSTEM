<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id('apply_id');
            // FK → job_vacancies.post_id
            $table->unsignedBigInteger('post_id');
            // FK → job_seekers.seeker_id
            $table->unsignedBigInteger('seeker_id');
            // Core matching column — populated by JobMatchingService
            $table->decimal('match_percentage', 5, 2)->default(0.00);
            $table->enum('status', [
                'pending',
                'reviewed',
                'shortlisted',
                'interview',
                'hired',
                'rejected'
            ])->default('pending');
            $table->text('employer_remarks')->nullable();
            // JSON array of uploaded document paths
            $table->json('submitted_documents')->nullable();
            $table->timestamps();

            $table->foreign('post_id')
                  ->references('post_id')
                  ->on('job_vacancies')
                  ->onDelete('cascade');

            $table->foreign('seeker_id')
                  ->references('seeker_id')
                  ->on('job_seekers')
                  ->onDelete('cascade');

            // Prevent duplicate applications for the same job
            $table->unique(['post_id', 'seeker_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};