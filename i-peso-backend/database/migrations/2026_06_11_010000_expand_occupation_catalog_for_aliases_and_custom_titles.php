<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('occupation_aliases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('occupation_id')->constrained('occupations')->cascadeOnDelete();
            $table->string('alias', 255);
            $table->string('normalized_alias', 255);
            $table->string('language', 10)->default('en');
            $table->string('source', 30)->default('local');
            $table->decimal('confidence', 4, 3)->default(1);
            $table->timestamps();

            $table->unique(
                ['occupation_id', 'normalized_alias', 'language'],
                'occupation_alias_language_unique'
            );
            $table->index('normalized_alias');
        });

        Schema::create('occupation_source_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('occupation_id')->constrained('occupations')->cascadeOnDelete();
            $table->string('source', 30);
            $table->string('external_code', 100);
            $table->string('external_uri')->nullable();
            $table->string('version', 30)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['source', 'external_code']);
            $table->index(['occupation_id', 'source']);
        });

        Schema::create('occupation_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('occupation_id')->constrained('occupations')->cascadeOnDelete();
            $table->string('skill_name', 255);
            $table->string('skill_type', 30)->default('skill');
            $table->string('source', 30);
            $table->string('external_code', 100)->nullable();
            $table->timestamps();

            $table->index(['occupation_id', 'skill_type']);
            $table->index('skill_name');
        });

        Schema::table('seeker_occupations', function (Blueprint $table) {
            $table->string('raw_job_title', 255)->nullable()->after('occupation_title');
            $table->string('status', 30)->default('standardized')->after('raw_job_title');
            $table->timestamp('mapped_at')->nullable()->after('status');

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('seeker_occupations', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn(['raw_job_title', 'status', 'mapped_at']);
        });

        Schema::dropIfExists('occupation_skills');
        Schema::dropIfExists('occupation_source_mappings');
        Schema::dropIfExists('occupation_aliases');
    }
};
