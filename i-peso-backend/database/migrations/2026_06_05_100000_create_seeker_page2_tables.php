<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ===== 1. EDUCATIONAL BACKGROUND =====
        if (!Schema::hasTable('seeker_educations')) {
            Schema::create('seeker_educations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('seeker_id')
                      ->constrained('job_seekers', 'seeker_id')
                      ->onDelete('cascade');
                $table->enum('level', [
                    'elementary',
                    'secondary_non_k12',
                    'secondary_k12',
                    'senior_high',
                    'tertiary',
                    'graduate',
                ]);
                $table->string('course_strand', 255)->nullable();
                $table->unsignedSmallInteger('year_graduated')->nullable();
                $table->string('undergrad_level_reached', 100)->nullable();
                $table->unsignedSmallInteger('undergrad_year_last_attended')->nullable();
                $table->timestamps();
            });
        }

        // ===== 2. TECHNICAL/VOCATIONAL & OTHER TRAINING =====
        if (!Schema::hasTable('seeker_trainings')) {
            Schema::create('seeker_trainings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('seeker_id')
                      ->constrained('job_seekers', 'seeker_id')
                      ->onDelete('cascade');
                $table->string('course', 255);
                $table->unsignedInteger('hours_of_training')->nullable();
                $table->string('training_institution', 255)->nullable();
                $table->text('skills_acquired')->nullable();
                $table->string('certificates_received', 255)->nullable(); // e.g. NC I, NC II
                $table->timestamps();
            });
        }

        // ===== 3. ELIGIBILITY / PROFESSIONAL LICENSE =====
        if (!Schema::hasTable('seeker_eligibilities')) {
            Schema::create('seeker_eligibilities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('seeker_id')
                      ->constrained('job_seekers', 'seeker_id')
                      ->onDelete('cascade');
                $table->enum('type', ['civil_service', 'professional_license']);
                $table->string('name', 255);
                $table->date('date_taken')->nullable();
                $table->date('valid_until')->nullable();
                $table->timestamps();
            });
        }

        // ===== 4. WORK EXPERIENCE (Limit 10 years) =====
        if (!Schema::hasTable('seeker_work_experiences')) {
            Schema::create('seeker_work_experiences', function (Blueprint $table) {
                $table->id();
                $table->foreignId('seeker_id')
                      ->constrained('job_seekers', 'seeker_id')
                      ->onDelete('cascade');
                $table->string('company_name', 255);
                $table->string('company_address', 500)->nullable();
                $table->string('position', 255);
                $table->unsignedInteger('number_of_months')->nullable();
                $table->enum('employment_status', ['permanent', 'contractual', 'part_time', 'probationary', 'temporary', 'seasonal'])->nullable();
                $table->timestamps();
            });
        }

        // ===== 5. ADD TO job_seekers TABLE =====
        if (!Schema::hasColumn('job_seekers', 'currently_in_school')) {
            Schema::table('job_seekers', function (Blueprint $table) {
                $table->boolean('currently_in_school')->default(false)->after('educ_attainment');
                $table->json('other_skills')->nullable()->after('skills');
            });
        }
    }

    public function down(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->dropColumn(['other_skills', 'currently_in_school']);
        });
        Schema::dropIfExists('seeker_work_experiences');
        Schema::dropIfExists('seeker_eligibilities');
        Schema::dropIfExists('seeker_trainings');
        Schema::dropIfExists('seeker_educations');
    }
};
