<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('seeker_occupations')) {
            Schema::create('seeker_occupations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('general_term')->nullable();
                $table->string('broad_field', 100)->nullable();
                $table->string('role_function', 100)->nullable();
                $table->unsignedTinyInteger('confidence')->nullable();
                $table->string('source', 30)->nullable();
                $table->string('occupation_title');
                $table->string('raw_job_title')->nullable();
                $table->string('status', 30)->default('standardized');
                $table->timestamp('mapped_at')->nullable();
                $table->unsignedTinyInteger('preference_order');
                $table->timestamps();

                $table->foreign('seeker_id')->references('seeker_id')->on('job_seekers')->cascadeOnDelete();
                $table->foreign('occupation_id')->references('id')->on('occupations')->nullOnDelete();
                $table->unique(['seeker_id', 'preference_order']);
                $table->index('general_term');
                $table->index('status');
            });
        }

        if (! Schema::hasTable('seeker_skills')) {
            Schema::create('seeker_skills', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('skill_id')->nullable();
                $table->string('skill_name');
                $table->string('normalized_skill_name')->nullable();
                $table->string('skill_type', 30);
                $table->string('source', 40)->default('system');
                $table->boolean('is_official')->default(false);
                $table->boolean('is_recommended')->default(false);
                $table->decimal('priority_score', 5, 2)->nullable();
                $table->string('proficiency', 20)->default('intermediate');
                $table->unsignedTinyInteger('years_of_experience')->nullable();
                $table->unsignedInteger('endorsement_count')->default(0);
                $table->unsignedTinyInteger('relevance_score')->nullable();
                $table->boolean('is_verified')->default(false);
                $table->timestamps();

                $table->foreign('seeker_id')->references('seeker_id')->on('job_seekers')->cascadeOnDelete();
                $table->foreign('skill_id')->references('id')->on('skill_catalog_entries')->nullOnDelete();
                $table->index(['seeker_id', 'skill_type']);
                $table->index(['skill_id', 'skill_type']);
                $table->index('normalized_skill_name');
                $table->index(['source', 'is_official'], 'seeker_skills_source_official_index');
            });
        }
    }

    public function down(): void
    {
        // Compatibility repair is intentionally non-destructive.
    }
};
