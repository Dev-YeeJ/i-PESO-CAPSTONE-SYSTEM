<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id('seeker_id');
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('mobile_number', 20);
            $table->string('email', 255)->unique();
            $table->string('password');
            $table->string('complete_address', 500);
            $table->string('educ_attainment', 100);
            // Stored as JSON array: ["PHP", "React", "Laravel"]
            $table->json('skills')->nullable();
            $table->string('resume_path', 500)->nullable();
            $table->string('profile_image', 500)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_seekers');
    }
};