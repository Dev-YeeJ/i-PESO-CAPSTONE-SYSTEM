<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The physical Confirmation Slip has a "LIST OF VACANCIES/ORDERS" table
 * (Number Needed / Position Title / Qualifications / Place of Work) that the
 * digital slip never captured — only a single number_of_job_vacancies
 * count. job_vacancy_id is nullable: set when a row was populated by picking
 * one of the employer's own existing postings, null when typed manually
 * (always the case for the admin walk-in/paper-only proxy flow).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('job_fair_confirmation_vacancies')) {
            return;
        }

        Schema::create('job_fair_confirmation_vacancies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('confirmation_slip_id');
            $table->unsignedBigInteger('job_vacancy_id')->nullable();
            $table->unsignedInteger('number_needed')->default(0);
            $table->string('position_title');
            $table->text('qualifications')->nullable();
            $table->string('place_of_work')->nullable();
            $table->timestamps();

            $table->foreign('confirmation_slip_id')->references('id')->on('job_fair_confirmation_slips')->cascadeOnDelete();
            $table->foreign('job_vacancy_id')->references('post_id')->on('job_vacancies')->nullOnDelete();
            $table->index('confirmation_slip_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_fair_confirmation_vacancies');
    }
};
