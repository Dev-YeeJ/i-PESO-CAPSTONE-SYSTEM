<?php

namespace Tests\Feature;

use App\Models\JobSeeker;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SeekerAiSuggestionTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('mobile_number');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('employment_status')->nullable();
                $table->string('work_type_preference')->nullable();
                $table->string('educ_attainment')->nullable();
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function test_seeker_can_request_vertex_ai_profile_suggestions(): void
    {
        Config::set('services.vertex_ai.enabled', true);
        Config::set('services.vertex_ai.project_id', 'test-project');
        Config::set('services.vertex_ai.location', 'us-central1');
        Config::set('services.vertex_ai.model', 'gemini-test');
        Config::set('services.vertex_ai.access_token', 'test-token');
        // Forces the Vertex AI (service-account) code path being tested here.
        // Without this, a real GEMINI_API_KEY in the developer's local .env
        // (needed for the separate chatbot feature) takes priority and routes
        // to a different, unfaked URL.
        Config::set('services.vertex_ai.gemini_api_key', '');

        Http::fake([
            'https://us-central1-aiplatform.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => [
                        'parts' => [[
                            'text' => json_encode([
                                'occupations' => [
                                    ['name' => 'Data Encoder', 'reason' => 'Matches office and computer skills.'],
                                ],
                                'technical_skills' => [
                                    ['name' => 'Microsoft Excel', 'reason' => 'Useful for data encoding tasks.'],
                                ],
                                'soft_skills' => [
                                    ['name' => 'Attention to Detail', 'reason' => 'Supports accurate records work.'],
                                ],
                            ]),
                        ]],
                    ],
                ]],
            ]),
        ]);

        $seeker = JobSeeker::create([
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'mobile_number' => '09123456789',
            'email' => 'maria.ai@example.com',
            'password' => 'password123',
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/ai-profile-suggestions', [
            'context' => [
                'employment_status' => 'unemployed',
                'educ_attainment' => 'College Undergraduate',
                'technical_skills' => ['Computer Literate'],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.occupations.0.name', 'Data Encoder')
            ->assertJsonPath('data.technical_skills.0.name', 'Microsoft Excel')
            ->assertJsonPath('data.soft_skills.0.name', 'Attention to Detail');

        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer test-token')
            && str_contains($request->url(), '/publishers/google/models/gemini-test:generateContent')
        );
    }
}
