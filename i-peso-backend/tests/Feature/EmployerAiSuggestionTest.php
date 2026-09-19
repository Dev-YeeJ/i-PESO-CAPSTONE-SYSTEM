<?php

namespace Tests\Feature;

use App\Models\Employer;
use App\Models\Occupation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployerAiSuggestionTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('employers')) {
            Schema::create('employers', function (Blueprint $table) {
                $table->id('employer_id');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('company_type')->nullable();
                $table->string('company_name')->nullable();
                $table->string('verification_status')->default('pending');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('occupations')) {
            Schema::create('occupations', function (Blueprint $table) {
                $table->id();
                $table->string('psoc_code')->unique();
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
                $table->string('language')->nullable();
                $table->string('source')->nullable();
                $table->float('confidence')->nullable();
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

    private function fakeGemini(array $decoded): void
    {
        Config::set('services.vertex_ai.enabled', true);
        Config::set('services.vertex_ai.project_id', 'test-project');
        Config::set('services.vertex_ai.location', 'us-central1');
        Config::set('services.vertex_ai.model', 'gemini-test');
        Config::set('services.vertex_ai.access_token', 'test-token');
        // Forces the Vertex AI (service-account) code path — a real
        // GEMINI_API_KEY in the developer's local .env would otherwise win
        // and route to a different, unfaked URL.
        Config::set('services.vertex_ai.gemini_api_key', '');

        Http::fake([
            'https://us-central1-aiplatform.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => [
                        'parts' => [[
                            'text' => json_encode($decoded),
                        ]],
                    ],
                ]],
            ]),
        ]);
    }

    private function verifiedEmployer(): Employer
    {
        return Employer::create([
            'email' => 'ai-suggest-employer@example.test',
            'password' => 'password123',
            'company_type' => 'corporation_partnership',
            'company_name' => 'Ai Suggest Corp',
            'verification_status' => 'verified',
            'email_verified_at' => now(),
        ]);
    }

    public function test_employer_can_request_a_job_posting_draft(): void
    {
        $this->fakeGemini([
            'job_summary' => 'We are looking for a skilled React Developer to build customer-facing web applications.',
            'responsibilities' => [
                'Develop and maintain React-based web applications.',
                'Collaborate with designers to implement UI components.',
                'Write unit tests for new features.',
                'Review pull requests from other developers.',
                'Optimize application performance.',
            ],
            'suggested_technical_skills' => ['React', 'TypeScript', 'REST APIs', 'Git', 'Webpack'],
            'suggested_soft_skills' => ['Communication', 'Problem Solving', 'Teamwork'],
        ]);

        $employer = $this->verifiedEmployer();
        Sanctum::actingAs($employer);

        $this->postJson('/api/employer/vacancies/ai-suggest', [
            'job_title' => 'React Developer',
            'vacancy_anchor' => 'IT and Computer Work',
            'additional_context' => 'Mostly maintaining an existing internal dashboard.',
        ])
            ->assertOk()
            ->assertJsonPath('data.job_summary', 'We are looking for a skilled React Developer to build customer-facing web applications.')
            ->assertJsonCount(5, 'data.responsibilities')
            ->assertJsonPath('data.suggested_technical_skills.0', 'React')
            ->assertJsonPath('data.suggested_soft_skills.0', 'Communication');
    }

    /**
     * The employer's job-posting wizard already lets an employer freely type
     * any skill into its own skill tagger (SkillTaxonomyTags). Whatever
     * they've already added is sent along as "existing" skills, and the AI's
     * suggestions must never repeat one — enforced here as a hard filter,
     * not merely a prompt instruction the model could ignore.
     */
    public function test_suggestions_never_repeat_a_skill_the_employer_already_typed(): void
    {
        $this->fakeGemini([
            'job_summary' => 'Summary text.',
            'responsibilities' => ['One', 'Two', 'Three', 'Four', 'Five'],
            'suggested_technical_skills' => ['React', 'Node.js', 'react', 'Docker'],
            'suggested_soft_skills' => ['Communication', 'Time Management'],
        ]);

        $employer = $this->verifiedEmployer();
        Sanctum::actingAs($employer);

        $response = $this->postJson('/api/employer/vacancies/ai-suggest', [
            'job_title' => 'React Developer',
            'existing_technical_skills' => ['React'],
            'existing_soft_skills' => ['Communication'],
        ])->assertOk();

        // "React" and "react" (case-insensitive duplicate of an already-typed
        // skill) are both filtered out — only genuinely new skills remain.
        $this->assertSame(['Node.js', 'Docker'], $response->json('data.suggested_technical_skills'));
        $this->assertSame(['Time Management'], $response->json('data.suggested_soft_skills'));
    }

    public function test_suggestion_fails_gracefully_when_ai_is_disabled(): void
    {
        Config::set('services.vertex_ai.enabled', false);

        $employer = $this->verifiedEmployer();
        Sanctum::actingAs($employer);

        $this->postJson('/api/employer/vacancies/ai-suggest', ['job_title' => 'React Developer'])
            ->assertStatus(503)
            ->assertJsonPath('data', null);
    }

    /**
     * Seeds the same skill_occupation_evidence data the seeker-side catalog
     * uses, so the job title an employer types resolves to real, vetted
     * skills instead of suggestions coming purely from an LLM with no
     * connection to what seekers themselves see for that occupation.
     */
    private function seedNurseOccupationEvidence(): void
    {
        $occupation = Occupation::create([
            'psoc_code' => 'EMP-TEST-001',
            'title' => 'Registered Nurse',
            'source' => 'esco',
            'is_active' => true,
        ]);

        $skillId = DB::table('skill_catalog_entries')->insertGetId([
            'name' => 'Patient Care',
            'normalized_name' => 'patient care',
            'category' => 'technical',
            'source' => 'onet',
            'occupation_count' => 5,
            'is_hot' => false,
            'is_in_demand' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('skill_occupation_evidence')->insert([
            'skill_id' => $skillId,
            'occupation_id' => $occupation->id,
            'source' => 'onet',
            'external_occupation_code' => '29-1141.00',
            'evidence_type' => 'essential',
            'importance' => 4.5,
            'is_hot' => false,
            'is_in_demand' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_catalog_grounded_skills_are_merged_ahead_of_ai_suggestions(): void
    {
        $this->seedNurseOccupationEvidence();
        $this->fakeGemini([
            'job_summary' => 'Summary text.',
            'responsibilities' => ['One', 'Two', 'Three', 'Four', 'Five'],
            'suggested_technical_skills' => ['IV Insertion'],
            'suggested_soft_skills' => ['Empathy'],
        ]);

        $employer = $this->verifiedEmployer();
        Sanctum::actingAs($employer);

        $response = $this->postJson('/api/employer/vacancies/ai-suggest', ['job_title' => 'Registered Nurse'])
            ->assertOk();

        // Catalog-grounded skills are prioritized ahead of the LLM's own
        // suggestions, not just appended — this is the same catalog a
        // seeker targeting this occupation would see suggested to them.
        $this->assertSame('Patient Care', $response->json('data.suggested_technical_skills.0'));
        $this->assertContains('IV Insertion', $response->json('data.suggested_technical_skills'));
    }

    public function test_catalog_skills_ride_along_on_the_failure_response_when_ai_is_unavailable(): void
    {
        $this->seedNurseOccupationEvidence();
        Config::set('services.vertex_ai.enabled', false);

        $employer = $this->verifiedEmployer();
        Sanctum::actingAs($employer);

        // This stays a 503/data:null — the same endpoint also backs the
        // "Draft with AI" description button, which must still see a clear
        // failure rather than a blank draft. But catalog-grounded skills for
        // this job title ride along in a separate key so the skills step
        // (which reads catalog_skills on a caught error, not data) isn't
        // left with nothing useful just because the LLM is unavailable.
        $response = $this->postJson('/api/employer/vacancies/ai-suggest', ['job_title' => 'Registered Nurse'])
            ->assertStatus(503)
            ->assertJsonPath('data', null);

        $this->assertContains('Patient Care', $response->json('catalog_skills.technical'));
    }

    public function test_seeker_account_cannot_use_the_employer_ai_endpoint(): void
    {
        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('mobile_number');
                $table->string('email')->unique();
                $table->string('password');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }

        $seeker = \App\Models\JobSeeker::create([
            'first_name' => 'Maria', 'last_name' => 'Santos', 'mobile_number' => '09123456789',
            'email' => 'seeker-ai-guard@example.test', 'password' => 'password123', 'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($seeker);

        $this->postJson('/api/employer/vacancies/ai-suggest', ['job_title' => 'React Developer'])
            ->assertForbidden();
    }
}
