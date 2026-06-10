<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->string('work_setup', 30)->nullable()->after('employment_type');
            $table->string('region', 100)->nullable()->after('location');
            $table->string('province', 100)->nullable()->after('region');
            $table->string('city_municipality', 150)->nullable()->after('province');
            $table->string('barangay', 150)->nullable()->after('city_municipality');
            $table->string('specific_address')->nullable()->after('barangay');

            $table->string('minimum_education', 100)->nullable()->after('job_description');
            $table->json('target_courses')->nullable()->after('minimum_education');
            $table->string('experience_level', 100)->nullable()->after('target_courses');
            $table->json('soft_skills')->nullable()->after('required_skills');
            $table->json('required_certifications')->nullable()->after('soft_skills');

            $table->string('salary_type', 20)->nullable()->after('salary_max');
            $table->boolean('hide_salary')->default(false)->after('salary_type');
            $table->json('benefits')->nullable()->after('hide_salary');

            $table->date('application_deadline')->nullable()->after('benefits');
            $table->boolean('open_to_pwds')->default(false)->after('application_deadline');
            $table->boolean('open_to_senior_citizens')->default(false)->after('open_to_pwds');
            $table->boolean('spes_tupad_eligible')->default(false)->after('open_to_senior_citizens');

            $table->index(['province', 'city_municipality', 'barangay'], 'job_vacancies_psgc_location_index');
            $table->index('application_deadline');
        });
    }

    public function down(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->dropIndex('job_vacancies_psgc_location_index');
            $table->dropIndex(['application_deadline']);
            $table->dropColumn([
                'work_setup',
                'region',
                'province',
                'city_municipality',
                'barangay',
                'specific_address',
                'minimum_education',
                'target_courses',
                'experience_level',
                'soft_skills',
                'required_certifications',
                'salary_type',
                'hide_salary',
                'benefits',
                'application_deadline',
                'open_to_pwds',
                'open_to_senior_citizens',
                'spes_tupad_eligible',
            ]);
        });
    }
};
