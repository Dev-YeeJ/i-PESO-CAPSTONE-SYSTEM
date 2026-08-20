<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Models\Occupation;
use App\Models\OccupationTitleCandidate;
use App\Models\SeekerOccupation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminOccupationMappingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('administrators', function (Blueprint $table) {
            $table->id('admin_id');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('mobile_number')->nullable();
            $table->string('password');
            $table->string('role')->default('admin');
            $table->string('status')->default('active');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
        });
        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id('seeker_id');
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('mobile_number');
            $table->string('email')->unique();
            $table->string('password');
            $table->timestamps();
        });
        Schema::create('occupations', function (Blueprint $table) {
            $table->id();
            $table->string('psoc_code')->unique();
            $table->string('classification_code')->nullable();
            $table->string('isco_group')->nullable();
            $table->string('title');
            $table->string('source')->default('esco');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
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
        Schema::create('seeker_occupations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seeker_id');
            $table->unsignedBigInteger('occupation_id')->nullable();
            $table->string('occupation_title');
            $table->string('raw_job_title')->nullable();
            $table->string('status')->default('standardized');
            $table->timestamp('mapped_at')->nullable();
            $table->unsignedTinyInteger('preference_order');
            $table->timestamps();
        });
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

    protected function tearDown(): void
    {
        Schema::dropIfExists('occupation_title_candidates');
        Schema::dropIfExists('seeker_occupations');
        Schema::dropIfExists('occupation_aliases');
        Schema::dropIfExists('occupations');
        Schema::dropIfExists('job_seekers');
        Schema::dropIfExists('administrators');

        parent::tearDown();
    }

    public function test_admin_can_map_a_custom_title_and_create_an_alias(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => 'occupation-admin@example.com',
            'mobile_number' => '09170000001',
            'password' => 'password',
            'role' => 'administrator',
            'status' => 'active',
        ]);
        $seeker = JobSeeker::create([
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'mobile_number' => '09170000002',
            'email' => 'occupation-seeker@example.com',
            'password' => 'password',
        ]);
        $occupation = Occupation::create([
            'psoc_code' => '5244',
            'title' => 'Online Sales Channel Manager',
            'is_active' => true,
        ]);
        $preference = SeekerOccupation::create([
            'seeker_id' => $seeker->getKey(),
            'occupation_title' => 'TikTok live seller',
            'raw_job_title' => 'TikTok live seller',
            'status' => 'custom_pending',
            'preference_order' => 1,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/occupation-mappings/pending')
            ->assertOk()
            ->assertJsonPath('data.0.raw_job_title', 'TikTok live seller');

        $this->postJson("/api/admin/occupation-mappings/{$preference->id}/map", [
            'occupation_id' => $occupation->id,
            'create_alias' => true,
        ])
            ->assertOk()
            ->assertJsonPath('preference.status', 'admin_mapped')
            ->assertJsonPath('preference.occupation_id', $occupation->id);

        $this->assertDatabaseHas('occupation_aliases', [
            'occupation_id' => $occupation->id,
            'normalized_alias' => 'tiktok live seller',
            'source' => 'admin_mapped',
        ]);
    }

    public function test_admin_can_review_and_map_a_jobdatalake_title_candidate(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => 'title-review-admin@example.com',
            'mobile_number' => '09170000003',
            'password' => 'password',
            'role' => 'administrator',
            'status' => 'active',
        ]);
        $occupation = Occupation::create([
            'psoc_code' => '2512',
            'title' => 'Software Developer',
            'is_active' => true,
        ]);
        $candidate = OccupationTitleCandidate::create([
            'raw_title' => 'Platform Software Engineer',
            'normalized_title' => 'platform software engineer',
            'source' => 'jobdatalake',
            'status' => 'pending',
            'occurrences' => 4,
            'first_seen_at' => now(),
            'last_seen_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/occupation-title-candidates')
            ->assertOk()
            ->assertJsonPath('data.0.id', $candidate->id);

        $this->postJson("/api/admin/occupation-title-candidates/{$candidate->id}/map", [
            'occupation_id' => $occupation->id,
            'create_alias' => true,
        ])
            ->assertOk()
            ->assertJsonPath('candidate.status', 'alias_created')
            ->assertJsonPath('candidate.suggested_occupation_id', $occupation->id);

        $this->assertDatabaseHas('occupation_aliases', [
            'occupation_id' => $occupation->id,
            'normalized_alias' => 'platform software engineer',
            'source' => 'jobdatalake_reviewed',
        ]);
    }
}
