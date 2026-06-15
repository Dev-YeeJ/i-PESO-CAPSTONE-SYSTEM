<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->json('preferred_work_setups')
                ->nullable()
                ->after('work_type_preference');
            $table->json('preferred_employment_types')
                ->nullable()
                ->after('preferred_work_setups');
        });

        Schema::table('seeker_work_experiences', function (Blueprint $table) {
            $table->foreignId('occupation_id')
                ->nullable()
                ->after('seeker_id')
                ->constrained('occupations')
                ->nullOnDelete();
            $table->string('normalized_position')
                ->nullable()
                ->after('position');

            $table->index(['occupation_id', 'number_of_months']);
        });

        Schema::table('seeker_educations', function (Blueprint $table) {
            $table->string('normalized_course_strand')
                ->nullable()
                ->after('course_strand');
        });

        Schema::table('seeker_trainings', function (Blueprint $table) {
            $table->string('normalized_course')
                ->nullable()
                ->after('course');
            $table->string('normalized_certificates')
                ->nullable()
                ->after('certificates_received');
        });

        Schema::table('seeker_eligibilities', function (Blueprint $table) {
            $table->string('normalized_name')
                ->nullable()
                ->after('name');

            $table->index(['normalized_name', 'valid_until']);
        });

        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->unsignedSmallInteger('minimum_experience_months')
                ->default(0)
                ->after('experience_level');
            $table->boolean('certifications_mandatory')
                ->default(false)
                ->after('required_certifications');
        });

        Schema::create('job_vacancy_certifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('post_id');
            $table->string('name', 150);
            $table->string('normalized_name', 150);
            $table->boolean('is_mandatory')->default(false);
            $table->timestamps();

            $table->foreign('post_id')
                ->references('post_id')
                ->on('job_vacancies')
                ->cascadeOnDelete();
            $table->unique(['post_id', 'normalized_name']);
            $table->index(['normalized_name', 'is_mandatory']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_vacancy_certifications');

        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->dropColumn([
                'minimum_experience_months',
                'certifications_mandatory',
            ]);
        });

        Schema::table('seeker_eligibilities', function (Blueprint $table) {
            $table->dropIndex(['normalized_name', 'valid_until']);
            $table->dropColumn('normalized_name');
        });

        Schema::table('seeker_trainings', function (Blueprint $table) {
            $table->dropColumn([
                'normalized_course',
                'normalized_certificates',
            ]);
        });

        Schema::table('seeker_educations', function (Blueprint $table) {
            $table->dropColumn('normalized_course_strand');
        });

        Schema::table('seeker_work_experiences', function (Blueprint $table) {
            $table->dropIndex(['occupation_id', 'number_of_months']);
            $table->dropConstrainedForeignId('occupation_id');
            $table->dropColumn('normalized_position');
        });

        Schema::table('job_seekers', function (Blueprint $table) {
            $table->dropColumn([
                'preferred_work_setups',
                'preferred_employment_types',
            ]);
        });
    }
};
