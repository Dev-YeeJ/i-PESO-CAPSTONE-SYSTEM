<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_skills', function (Blueprint $table) {
            // Add normalized skill name for deduplication
            $table->string('normalized_skill_name')
                ->nullable()
                ->after('skill_name')
                ->comment('Normalized name for deduplication and matching');

            // Add skill relevance score (matched against job market demand)
            $table->unsignedTinyInteger('relevance_score')
                ->nullable()
                ->after('endorsement_count')
                ->comment('How relevant this skill is to current job market (0-100)');

            // Track if skill is verified by admin/system
            $table->boolean('is_verified')
                ->default(false)
                ->after('relevance_score')
                ->comment('Whether this skill has been verified against skill taxonomy');

            $table->index('normalized_skill_name');
            $table->index('relevance_score');
            $table->index('is_verified');
        });
    }

    public function down(): void
    {
        Schema::table('seeker_skills', function (Blueprint $table) {
            $table->dropColumn(['normalized_skill_name', 'relevance_score', 'is_verified']);
        });
    }
};
