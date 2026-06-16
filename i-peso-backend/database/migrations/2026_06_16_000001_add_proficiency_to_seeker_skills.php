<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_skills', function (Blueprint $table) {
            // Add proficiency level: beginner, intermediate, advanced, expert
            $table->enum('proficiency', ['beginner', 'intermediate', 'advanced', 'expert'])
                ->default('intermediate')
                ->after('skill_type')
                ->comment('Proficiency level: beginner (can learn), intermediate (capable), advanced (proficient), expert (master level)');

            // Add years of experience (optional)
            $table->unsignedTinyInteger('years_of_experience')
                ->nullable()
                ->after('proficiency')
                ->comment('Years of hands-on experience with this skill');

            // Add endorsement count for social proof
            $table->unsignedInteger('endorsement_count')
                ->default(0)
                ->after('years_of_experience')
                ->comment('Number of times this skill has been endorsed by others');

            // Reorder indexes
            $table->index(['seeker_id', 'proficiency']);
            $table->index(['proficiency']);
        });
    }

    public function down(): void
    {
        Schema::table('seeker_skills', function (Blueprint $table) {
            $table->dropColumn(['proficiency', 'years_of_experience', 'endorsement_count']);
        });
    }
};
