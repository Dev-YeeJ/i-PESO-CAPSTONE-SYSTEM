<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_applications', function (Blueprint $table) {
            $table->id('prog_apply_id');
            // FK → government_programs.program_id
            $table->unsignedBigInteger('program_id');
            // FK → job_seekers.seeker_id
            $table->unsignedBigInteger('seeker_id');
            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
                'completed'
            ])->default('pending');
            // JSON array of uploaded requirement file paths
            $table->json('submitted_files')->nullable();
            $table->text('admin_remarks')->nullable();
            $table->timestamps();

            $table->foreign('program_id')
                  ->references('program_id')
                  ->on('government_programs')
                  ->onDelete('cascade');

            $table->foreign('seeker_id')
                  ->references('seeker_id')
                  ->on('job_seekers')
                  ->onDelete('cascade');

            // One seeker can only apply once per program
            $table->unique(['program_id', 'seeker_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_applications');
    }
};