<?php

namespace Tests\Feature;

use App\Models\Employer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
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
