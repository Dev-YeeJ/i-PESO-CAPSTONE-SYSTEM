<?php

namespace Tests\Feature;

use App\Models\JobSeeker;
use App\Models\Occupation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SeekerSkillRecommendationsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTables();
    }

    public function test_recommendations_are_tied_to_the_seekers_preferred_occupation(): void
    {
        $occupation = Occupation::create([
            'psoc_code' => 'TEST-001',
            'title' => 'Registered Nurse',
            'source' => 'esco',
            'is_active' => true,
        ]);

        $occupationSkill = DB::table('skill_catalog_entries')->insertGetId([
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
            'skill_id' => $occupationSkill,
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

        // An unrelated occupation's skill must never leak into this seeker's
        // recommendations — this is the exact scenario that used to always
        // surface "Driver" regardless of the seeker's actual profile.
        $unrelatedSkill = DB::table('skill_catalog_entries')->insertGetId([
            'name' => 'Driver',
            'normalized_name' => 'driver',
            'category' => 'technical',
            'source' => 'onet',
            'occupation_count' => 50,
            'is_hot' => false,
            'is_in_demand' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $otherOccupation = Occupation::create([
            'psoc_code' => 'TEST-002',
            'title' => 'Delivery Driver',
            'source' => 'esco',
            'is_active' => true,
        ]);
        DB::table('skill_occupation_evidence')->insert([
            'skill_id' => $unrelatedSkill,
            'occupation_id' => $otherOccupation->id,
            'source' => 'onet',
            'external_occupation_code' => '53-3033.00',
            'evidence_type' => 'essential',
            'importance' => 4.0,
            'is_hot' => false,
            'is_in_demand' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $seeker = $this->createSeeker();
        DB::table('seeker_occupations')->insert([
            'seeker_id' => $seeker->getKey(),
            'occupation_id' => $occupation->id,
            'occupation_title' => 'Registered Nurse',
            'status' => 'standardized',
            'preference_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs($seeker);

        $response = $this->getJson('/api/seeker/skill-recommendations')->assertOk();
        $skillNames = collect($response->json('data.occupation_skills.skills'))->pluck('name');

        $this->assertTrue($skillNames->contains('Patient Care'));
        $this->assertFalse($skillNames->contains('Driver'));
    }

    private function createSeeker(): JobSeeker
    {
        return JobSeeker::create([
            'first_name' => 'Maria',
            'last_name' => fake()->unique()->lastName(),
            'mobile_number' => '09123456789',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'date_of_birth' => '2000-01-15',
            'profile_completed' => true,
            'verification_status' => 'verified',
            'is_verified' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function createTables(): void
    {
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

        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('mobile_number');
                $table->string('email')->unique();
                $table->string('password');
                $table->date('date_of_birth')->nullable();
                $table->string('educ_attainment')->nullable();
                $table->boolean('profile_completed')->default(false);
                $table->string('verification_status')->default('pending');
                $table->boolean('is_verified')->default(false);
                $table->timestamp('email_verified_at')->nullable();
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

        if (! Schema::hasTable('seeker_skills')) {
            Schema::create('seeker_skills', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('skill_id')->nullable();
                $table->string('skill_name');
                $table->string('skill_type');
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
}
