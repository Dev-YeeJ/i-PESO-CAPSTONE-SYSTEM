<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A "Posterized Job Vacancy" requirement can now take more than one
     * image, so a participation needs to be able to hold more than one
     * submission row per requirement — the original one-row-per-pair
     * constraint made every file after the first throw a duplicate-key
     * error the moment it was inserted in the same request.
     *
     * The unique index being dropped is also the only index covering
     * job_fair_requirement_id as a leftmost prefix, which its foreign key
     * depends on for a required supporting index — MySQL refuses to drop it
     * otherwise ("Cannot drop index ... needed in a foreign key
     * constraint"). Plain indexes on both FK columns have to exist first so
     * neither foreign key loses its supporting index through the swap.
     */
    public function up(): void
    {
        Schema::table('job_fair_requirement_submissions', function (Blueprint $table) {
            $table->index('job_fair_requirement_id', 'job_fair_requirement_submissions_requirement_id_index');
            $table->index('job_fair_employer_id', 'job_fair_requirement_submissions_employer_pivot_id_index');
            $table->dropUnique('job_fair_requirement_submission_unique');
        });
    }

    public function down(): void
    {
        Schema::table('job_fair_requirement_submissions', function (Blueprint $table) {
            $table->unique(['job_fair_requirement_id', 'job_fair_employer_id'], 'job_fair_requirement_submission_unique');
            $table->dropIndex('job_fair_requirement_submissions_requirement_id_index');
            $table->dropIndex('job_fair_requirement_submissions_employer_pivot_id_index');
        });
    }
};
