<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retire the "employer upskill needs" feature (part of the removed Upskill Hub module).
 * The employer_skill_demands table is no longer read by any code path; the recommendation
 * and analytics services already degrade gracefully when it is absent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('employer_skill_demands');
    }

    public function down(): void
    {
        if (Schema::hasTable('employer_skill_demands')) {
            return;
        }

        Schema::create('employer_skill_demands', function (Blueprint $table) {
            $table->id('demand_id');
            $table->foreignId('employer_id')
                ->constrained('employers', 'employer_id')->cascadeOnDelete();
            $table->foreignId('job_vacancy_id')->nullable()
                ->constrained('job_vacancies', 'post_id')->nullOnDelete();
            $table->foreignId('skill_id')->nullable()
                ->constrained('skill_catalog_entries')->nullOnDelete();
            $table->string('skill_name');
            $table->foreignId('occupation_id')->nullable()
                ->constrained('occupations')->nullOnDelete();
            $table->foreignId('linked_program_id')->nullable()
                ->constrained('government_programs', 'program_id')->nullOnDelete();
            $table->unsignedInteger('workers_needed')->default(1);
            $table->text('reason');
            $table->string('preferred_training_timeline')->nullable();
            $table->string('status', 30)->default('submitted');
            $table->text('remarks')->nullable();
            $table->text('admin_remarks')->nullable();
            $table->foreignId('reviewed_by_admin_id')->nullable()
                ->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'skill_name']);
            $table->index(['employer_id', 'status']);
        });
    }
};
