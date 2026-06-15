<?php

namespace Tests\Feature;

use App\Models\SkillCatalogEntry;
use App\Services\SkillCategorizer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SkillCatalogTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('skill_catalog_entries')) {
            Schema::create('skill_catalog_entries', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('normalized_name');
                $table->text('search_terms')->nullable();
                $table->string('category', 20);
                $table->string('source', 30);
                $table->string('element_id')->nullable();
                $table->unsignedInteger('occupation_count')->default(0);
                $table->boolean('is_hot')->default(false);
                $table->boolean('is_in_demand')->default(false);
                $table->string('version', 20)->nullable();
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
                $table->string('source')->default('local_reviewed');
                $table->decimal('confidence', 4, 3)->default(1);
                $table->timestamps();
            });
        }
    }

    public function test_skill_search_returns_ranked_technical_suggestions(): void
    {
        SkillCatalogEntry::query()->updateOrCreate(
            ['category' => 'technical', 'normalized_name' => 'microsoft excel'],
            [
                'name' => 'Microsoft Excel',
                'source' => 'onet_software',
                'occupation_count' => 800,
                'is_hot' => true,
                'is_in_demand' => true,
            ]
        );
        SkillCatalogEntry::query()->updateOrCreate(
            ['category' => 'technical', 'normalized_name' => 'exceltrans translator'],
            [
                'name' => 'ExcelTrans Translator',
                'source' => 'onet_software',
                'occupation_count' => 1,
            ]
        );

        $this->getJson('/api/skills?category=technical&search=excel')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Microsoft Excel')
            ->assertJsonPath('data.0.category', 'technical');
    }

    public function test_skill_search_separates_soft_and_technical_results(): void
    {
        SkillCatalogEntry::query()->updateOrCreate(
            ['category' => 'soft', 'normalized_name' => 'negotiation'],
            [
                'name' => 'Negotiation',
                'source' => 'onet_transferable',
                'occupation_count' => 700,
            ]
        );

        $this->getJson('/api/skills?category=soft&search=negotiation')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Negotiation');

        $this->getJson('/api/skills?category=technical&search=negotiation')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_skill_search_matches_aliases_and_returns_the_canonical_name(): void
    {
        SkillCatalogEntry::query()->updateOrCreate(
            ['category' => 'technical', 'normalized_name' => 'basic computer operations'],
            [
                'name' => 'Basic Computer Operations',
                'search_terms' => 'basic computer operations computer literacy computer literate',
                'source' => 'local_general',
                'occupation_count' => 0,
            ]
        );

        $this->getJson('/api/skills?category=technical&search=computer%20literate')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Basic Computer Operations');
    }

    public function test_skill_search_uses_normalized_alias_rows(): void
    {
        $skill = SkillCatalogEntry::query()->create([
            'name' => 'Graphic Design',
            'normalized_name' => 'graphic design',
            'category' => 'technical',
            'source' => 'local_general',
        ]);
        $skill->aliases()->create([
            'alias' => 'Visual Design',
            'normalized_alias' => 'visual design',
            'source' => 'local_general',
        ]);

        $this->getJson('/api/skills?category=technical&search=visual%20design')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Graphic Design');
    }

    public function test_onet_skill_rules_distinguish_hard_and_soft_skills(): void
    {
        $categorizer = app(SkillCategorizer::class);

        $this->assertSame('technical', $categorizer->categoryForOnetSkill('Programming'));
        $this->assertSame('technical', $categorizer->categoryForOnetSkill('Equipment Maintenance'));
        $this->assertSame('soft', $categorizer->categoryForOnetSkill('Critical Thinking'));
        $this->assertSame('soft', $categorizer->categoryForOnetSkill('Negotiation'));
    }

    public function test_known_skills_are_canonicalized_into_their_authoritative_category(): void
    {
        SkillCatalogEntry::query()->updateOrCreate(
            ['category' => 'technical', 'normalized_name' => 'programming'],
            [
                'name' => 'Programming',
                'search_terms' => 'programming coding',
                'source' => 'local_general',
            ]
        );
        SkillCatalogEntry::query()->updateOrCreate(
            ['category' => 'soft', 'normalized_name' => 'critical thinking'],
            [
                'name' => 'Critical Thinking',
                'search_terms' => 'critical thinking analytical thinking',
                'source' => 'local_general',
            ]
        );

        $categorized = app(SkillCategorizer::class)->canonicalizeSubmitted(
            ['Critical Thinking', 'Custom Technical Skill'],
            ['Programming', 'Custom Soft Skill']
        );

        $this->assertSame(['Custom Technical Skill', 'Programming'], $categorized['technical']);
        $this->assertSame(['Critical Thinking', 'Custom Soft Skill'], $categorized['soft']);
    }
}
