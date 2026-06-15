<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skill_aliases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('skill_id')
                ->constrained('skill_catalog_entries')
                ->cascadeOnDelete();
            $table->string('alias', 150);
            $table->string('normalized_alias', 150);
            $table->string('source', 30)->default('local_reviewed');
            $table->decimal('confidence', 4, 3)->default(1);
            $table->timestamps();

            $table->unique(['skill_id', 'normalized_alias']);
            $table->index('normalized_alias');
        });

        Schema::create('skill_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_skill_id')
                ->constrained('skill_catalog_entries')
                ->cascadeOnDelete();
            $table->foreignId('related_skill_id')
                ->constrained('skill_catalog_entries')
                ->cascadeOnDelete();
            $table->string('relationship_type', 30);
            $table->decimal('match_weight', 4, 3)->default(0.8);
            $table->decimal('reverse_match_weight', 4, 3)->default(0.6);
            $table->string('source', 30);
            $table->string('external_code', 50)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(
                ['parent_skill_id', 'related_skill_id', 'relationship_type'],
                'skill_relationship_unique'
            );
            $table->index(['parent_skill_id', 'match_weight']);
            $table->index(['related_skill_id', 'reverse_match_weight']);
        });

        Schema::create('skill_occupation_evidence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('skill_id')
                ->constrained('skill_catalog_entries')
                ->cascadeOnDelete();
            $table->foreignId('occupation_id')
                ->nullable()
                ->constrained('occupations')
                ->nullOnDelete();
            $table->string('source', 30)->default('onet');
            $table->string('external_occupation_code', 30);
            $table->string('evidence_type', 30);
            $table->string('element_id', 30)->nullable();
            $table->decimal('importance', 5, 2)->nullable();
            $table->decimal('level', 5, 2)->nullable();
            $table->boolean('is_hot')->default(false);
            $table->boolean('is_in_demand')->default(false);
            $table->string('version', 20)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(
                ['skill_id', 'source', 'external_occupation_code', 'evidence_type'],
                'skill_occupation_evidence_unique'
            );
            $table->index(
                ['external_occupation_code', 'evidence_type'],
                'skill_evidence_external_code_type_index'
            );
            $table->index(
                ['occupation_id', 'evidence_type'],
                'skill_evidence_occupation_type_index'
            );
        });

        Schema::table('seeker_skills', function (Blueprint $table) {
            $table->foreignId('skill_id')
                ->nullable()
                ->after('seeker_id')
                ->constrained('skill_catalog_entries')
                ->nullOnDelete();
            $table->index(['skill_id', 'skill_type']);
        });

        Schema::create('job_vacancy_skills', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('post_id');
            $table->foreignId('skill_id')
                ->constrained('skill_catalog_entries')
                ->cascadeOnDelete();
            $table->string('skill_type', 20);
            $table->string('original_name', 150);
            $table->decimal('weight', 5, 2)->default(1);
            $table->timestamps();

            $table->foreign('post_id')
                ->references('post_id')
                ->on('job_vacancies')
                ->cascadeOnDelete();
            $table->unique(['post_id', 'skill_id', 'skill_type']);
            $table->index(['skill_id', 'skill_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_vacancy_skills');

        Schema::table('seeker_skills', function (Blueprint $table) {
            $table->dropConstrainedForeignId('skill_id');
        });

        Schema::dropIfExists('skill_occupation_evidence');
        Schema::dropIfExists('skill_relationships');
        Schema::dropIfExists('skill_aliases');
    }
};
