<?php

namespace Tests\Feature;

use App\Models\Occupation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DiscoverJobDataLakeTitlesTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.jobdatalake.key' => 'test-key',
            'services.jobdatalake.base_url' => 'https://api.jobdatalake.test',
        ]);

        if (! Schema::hasTable('occupations')) {
            Schema::create('occupations', function (Blueprint $table) {
                $table->id();
                $table->string('psoc_code')->unique();
                $table->string('title');
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

        if (! Schema::hasTable('occupation_title_candidates')) {
            Schema::create('occupation_title_candidates', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('suggested_occupation_id')->nullable();
                $table->string('raw_title');
                $table->string('normalized_title')->unique();
                $table->string('source')->default('jobdatalake');
                $table->string('status')->default('pending');
                $table->string('match_reason')->nullable();
                $table->decimal('match_confidence', 4, 3)->nullable();
                $table->unsignedInteger('occurrences')->default(1);
                $table->string('sample_company')->nullable();
                $table->json('metadata')->nullable();
                $table->dateTime('first_seen_at');
                $table->dateTime('last_seen_at');
                $table->dateTime('reviewed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function test_command_discovers_titles_and_creates_only_deterministic_aliases(): void
    {
        $occupation = Occupation::create([
            'psoc_code' => 'ESCO-SOFTWARE',
            'title' => 'Software developer',
            'is_active' => true,
        ]);

        Http::fake([
            'https://api.jobdatalake.test/v1/jobs*' => Http::response([
                'found' => 2,
                'page' => 1,
                'per_page' => 100,
                'jobs' => [
                    [
                        'title' => 'Senior Software Developer',
                        'company_name' => 'Example PH',
                        'countries' => ['PH'],
                        'job_handle' => 'example-senior-software-developer',
                    ],
                    [
                        'title' => 'AI Workflow Specialist',
                        'company_name' => 'Example PH',
                        'countries' => ['PH'],
                        'job_handle' => 'example-ai-workflow-specialist',
                    ],
                ],
            ]),
        ]);

        $this->artisan('occupations:discover-job-titles', [
            '--countries' => 'PH',
            '--auto-alias' => true,
        ])->assertSuccessful();

        Http::assertSent(fn ($request) => $request->hasHeader('X-API-Key', 'test-key')
            && $request['countries'] === 'PH'
            && $request['per_page'] === 100);

        $this->assertDatabaseHas('occupation_title_candidates', [
            'normalized_title' => 'senior software developer',
            'suggested_occupation_id' => $occupation->id,
            'status' => 'alias_created',
            'match_reason' => 'normalized_title',
        ]);
        $this->assertDatabaseHas('occupation_aliases', [
            'occupation_id' => $occupation->id,
            'normalized_alias' => 'senior software developer',
            'source' => 'jobdatalake',
        ]);
        $this->assertDatabaseHas('occupation_title_candidates', [
            'normalized_title' => 'ai workflow specialist',
            'suggested_occupation_id' => null,
            'status' => 'pending',
        ]);
    }

    public function test_command_updates_an_existing_candidate_instead_of_duplicating_it(): void
    {
        Http::fake([
            'https://api.jobdatalake.test/v1/jobs*' => Http::response([
                'jobs' => [[
                    'title' => 'Prompt Engineer',
                    'company_name' => 'Example PH',
                    'countries' => ['PH'],
                ]],
            ]),
        ]);

        $this->artisan('occupations:discover-job-titles')->assertSuccessful();
        $this->artisan('occupations:discover-job-titles')->assertSuccessful();

        $this->assertDatabaseCount('occupation_title_candidates', 1);
        $this->assertDatabaseHas('occupation_title_candidates', [
            'normalized_title' => 'prompt engineer',
            'occurrences' => 2,
        ]);
    }
}
