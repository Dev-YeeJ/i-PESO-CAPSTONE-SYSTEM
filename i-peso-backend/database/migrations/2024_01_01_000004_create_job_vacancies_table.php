<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_vacancies', function (Blueprint $table) {
            $table->id('post_id');
            // FK → employers.employer_id
            $table->unsignedBigInteger('employer_id');
            $table->string('job_title', 255);
            $table->string('employment_type', 50); // Full-time, Part-time, Contract
            $table->string('location', 255);
            $table->text('job_description');
            $table->unsignedInteger('vacancies_count')->default(1);
            $table->decimal('salary_min', 10, 2)->nullable();
            $table->decimal('salary_max', 10, 2)->nullable();
            // Stored as JSON array: ["PHP", "MySQL", "React"]
            $table->json('required_skills')->nullable();
            $table->enum('status', ['active', 'closed', 'draft'])->default('active');
            $table->timestamps();

            $table->foreign('employer_id')
                  ->references('employer_id')
                  ->on('employers')
                  ->onDelete('cascade');

            $table->index('employer_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_vacancies');
    }
};