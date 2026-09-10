<?php

namespace Tests\Feature;

use App\Models\Occupation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BootstrapOccupationCatalogTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTables();
    }

    public function test_command_skips_the_import_chain_once_the_catalog_is_already_populated(): void
    {
        foreach (range(1, 5) as $index) {
            Occupation::create([
                'psoc_code' => "SEED-{$index}",
                'title' => "Seeded Occupation {$index}",
                'source' => 'fallback',
                'is_active' => true,
            ]);
        }

        $this->artisan('occupations:bootstrap-if-empty', ['--threshold' => 5])
            ->expectsOutputToContain('skipping import')
            ->assertSuccessful();

        // The import chain never ran, so nothing beyond the 5 seeded rows exists.
        $this->assertSame(5, Occupation::count());
        $this->assertDatabaseCount('occupation_aliases', 0);
    }

    public function test_command_runs_the_full_import_chain_when_the_catalog_looks_unpopulated(): void
    {
        $this->assertSame(0, Occupation::count());

        $this->artisan('occupations:bootstrap-if-empty', ['--threshold' => 100])
            ->assertSuccessful();

        // ESCO alone contributes far more than the 49-row fallback list, so a
        // real import run is unambiguous from the fallback-only baseline.
        $this->assertGreaterThan(100, Occupation::count());
        $this->assertGreaterThan(0, \DB::table('occupation_aliases')->count());
        $this->assertGreaterThan(0, \DB::table('occupation_general_terms')->count());
    }

    private function createTables(): void
    {
        if (! Schema::hasTable('occupations')) {
            Schema::create('occupations', function (Blueprint $table) {
                $table->id();
                $table->string('psoc_code')->unique();
                $table->string('external_uri')->nullable()->unique();
                $table->string('classification_code', 50)->nullable();
                $table->string('isco_group', 10)->nullable();
                $table->string('title');
                $table->text('description')->nullable();
                $table->text('search_terms')->nullable();
                $table->string('version')->default('2012');
                $table->string('source')->default('psa');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('occupation_aliases')) {
            Schema::create('occupation_aliases', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('occupation_id');
                $table->string('alias');
                $table->string('normalized_alias');
                $table->string('language')->default('en');
                $table->string('source')->default('local');
                $table->decimal('confidence', 4, 3)->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('occupation_general_terms')) {
            Schema::create('occupation_general_terms', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('occupation_id');
                $table->string('term');
                $table->string('normalized_term');
                $table->string('language')->default('en');
                $table->string('source')->default('local_peso');
                $table->unsignedSmallInteger('priority')->default(100);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('occupation_source_mappings')) {
            Schema::create('occupation_source_mappings', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('occupation_id');
                $table->string('source');
                $table->string('external_code');
                $table->string('external_uri')->nullable();
                $table->string('version')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_occupations')) {
            Schema::create('seeker_occupations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('general_term')->nullable();
                $table->string('occupation_title');
                $table->string('raw_job_title')->nullable();
                $table->string('status')->default('standardized');
                $table->unsignedTinyInteger('preference_order')->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_vacancies')) {
            Schema::create('job_vacancies', function (Blueprint $table) {
                $table->id('post_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('job_title');
                $table->string('status')->default('active');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('skill_catalog_entries')) {
            Schema::create('skill_catalog_entries', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('normalized_name');
                $table->text('search_terms')->nullable();
                $table->string('category');
                $table->string('source');
                $table->string('element_id')->nullable();
                $table->unsignedInteger('occupation_count')->default(0);
                $table->boolean('is_hot')->default(false);
                $table->boolean('is_in_demand')->default(false);
                $table->string('version')->nullable();
                $table->timestamps();
                $table->unique(['category', 'normalized_name']);
            });
        }

        if (! Schema::hasTable('skill_aliases')) {
            Schema::create('skill_aliases', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('skill_id');
                $table->string('alias');
                $table->string('normalized_alias');
                $table->string('source');
                $table->decimal('confidence', 4, 3)->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('skill_relationships')) {
            Schema::create('skill_relationships', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('parent_skill_id');
                $table->unsignedBigInteger('related_skill_id');
                $table->string('relationship_type');
                $table->decimal('match_weight', 4, 3)->default(0.8);
                $table->decimal('reverse_match_weight', 4, 3)->default(0.6);
                $table->string('source');
                $table->string('external_code')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('skill_occupation_evidence')) {
            Schema::create('skill_occupation_evidence', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('skill_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
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
            });
        }
    }
}
