<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Application;
use App\Models\JobSeeker;
use App\Models\SeekerCertificate;
use App\Models\SeekerSkill;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminJobSeekerDirectoryTest extends TestCase
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
            $table->string('role');
            $table->string('status');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id('seeker_id');
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('mobile_number')->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('educ_attainment')->nullable();
            $table->string('employment_status')->nullable();
            $table->string('address_municipality_city')->nullable();
            $table->string('address_province')->nullable();
            $table->string('address_barangay')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('profile_completed')->default(false);
            $table->timestamps();
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id('apply_id');
            $table->unsignedBigInteger('seeker_id');
            $table->unsignedBigInteger('post_id')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
        });

        Schema::create('seeker_skills', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seeker_id');
            $table->string('skill_name')->nullable();
            $table->timestamps();
        });

        Schema::create('seeker_certificates', function (Blueprint $table) {
            $table->id('certificate_id');
            $table->unsignedBigInteger('seeker_id');
            $table->string('title')->nullable();
            $table->string('issuing_body')->nullable();
            $table->string('mime_type')->nullable();
            $table->integer('file_size')->nullable();
            $table->timestamps();
        });

        Schema::create('seeker_occupations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seeker_id');
            $table->string('occupation_title')->nullable();
            $table->string('broad_field')->nullable();
            $table->string('general_term')->nullable();
            $table->timestamps();
        });

        Schema::create('job_fair_attendees', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seeker_id');
            $table->timestamps();
        });

        Schema::create('employers', function (Blueprint $table) {
            $table->id('employer_id');
            $table->string('company_name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('verification_status')->default('pending');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('job_vacancies', function (Blueprint $table) {
            $table->id('post_id');
            $table->unsignedBigInteger('employer_id');
            $table->string('status')->default('draft');
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('job_vacancies');
        Schema::dropIfExists('employers');
        Schema::dropIfExists('job_fair_attendees');
        Schema::dropIfExists('seeker_occupations');
        Schema::dropIfExists('seeker_certificates');
        Schema::dropIfExists('seeker_skills');
        Schema::dropIfExists('applications');
        Schema::dropIfExists('job_seekers');
        Schema::dropIfExists('administrators');

        parent::tearDown();
    }

    public function test_admin_index_supports_search_filters_and_counts(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Administrator',
            'email' => 'admin-directory@example.com',
            'mobile_number' => '09170000001',
            'password' => 'password',
            'role' => 'administrator',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $seeker = JobSeeker::create([
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'mobile_number' => '09170000002',
            'email' => 'juan@example.com',
            'password' => 'password',
            'employment_status' => 'employed',
            'address_municipality_city' => 'Urdaneta City',
            'address_province' => 'Pangasinan',
            'address_barangay' => 'Dilan Paurido',
            'profile_completed' => true,
        ]);

        $seeker->seekerSkills()->create(['skill_name' => 'Laravel']);
        $seeker->certificates()->create([
            'title' => 'PHP Certificate',
            'issuing_body' => 'TESDA',
            'mime_type' => 'application/pdf',
            'file_size' => 2048,
        ]);
        $seeker->occupations()->create([
            'occupation_title' => 'Software Developer',
            'broad_field' => 'Information Technology',
            'general_term' => 'Developer',
        ]);
        $seeker->jobFairAttendances()->create();
        $seeker->applications()->create(['status' => 'hired']);

        $response = $this->getJson('/api/admin/seekers?search=Juan&employment_status=employed&province=Pangasinan&has_certificates=1&has_applications=1&hired_status=hired&sort=latest&per_page=15');

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.email', 'juan@example.com')
            ->assertJsonPath('data.0.skills_count', 1)
            ->assertJsonPath('data.0.certificates_count', 1)
            ->assertJsonPath('data.0.applications_count', 1)
            ->assertJsonPath('data.0.hired_count', 1)
            ->assertJsonPath('data.0.job_fair_participation_count', 1);
    }

    public function test_admin_show_returns_sanitized_detail_payload(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Administrator',
            'email' => 'admin-detail@example.com',
            'mobile_number' => '09170000003',
            'password' => 'password',
            'role' => 'administrator',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $seeker = JobSeeker::create([
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'mobile_number' => null,
            'email' => 'maria@example.com',
            'password' => 'password',
            'profile_completed' => false,
        ]);

        $response = $this->getJson('/api/admin/seekers/'.$seeker->getKey());

        $response->assertOk()
            ->assertJsonPath('profile.first_name', 'Maria')
            ->assertJsonPath('data_quality_flags.incomplete_profile', true)
            ->assertJsonPath('data_quality_flags.no_contact_number', true)
            ->assertJsonPath('data_quality_flags.no_applications', true)
            ->assertJsonMissingPath('certificates.0.file_path');
    }

    public function test_directory_summaries_are_returned_by_single_aggregate_endpoints(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Administrator',
            'email' => 'admin-summary@example.com',
            'mobile_number' => '09170000009',
            'password' => 'password',
            'role' => 'administrator',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $complete = JobSeeker::create([
            'first_name' => 'Complete', 'last_name' => 'Seeker', 'email' => 'complete@example.com',
            'password' => 'password', 'profile_completed' => true, 'latitude' => 15.98, 'longitude' => 120.57,
        ]);
        JobSeeker::create([
            'first_name' => 'Incomplete', 'last_name' => 'Seeker', 'email' => 'incomplete@example.com',
            'password' => 'password', 'profile_completed' => false,
        ]);
        $complete->applications()->create(['status' => 'hired']);

        DB::table('employers')->insert([
            ['employer_id' => 1, 'company_name' => 'Verified Co', 'email' => 'verified@example.com', 'password' => 'password', 'verification_status' => 'verified', 'created_at' => now(), 'updated_at' => now()],
            ['employer_id' => 2, 'company_name' => 'Pending Co', 'email' => 'pending@example.com', 'password' => 'password', 'verification_status' => 'pending', 'created_at' => now(), 'updated_at' => now()],
        ]);
        DB::table('job_vacancies')->insert([
            ['employer_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['employer_id' => 1, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->getJson('/api/admin/seekers/summary')
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('complete', 1)
            ->assertJsonPath('with_applications', 1)
            ->assertJsonPath('hired', 1)
            ->assertJsonPath('missing_gps', 1);

        $this->getJson('/api/admin/employers/summary')
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('verified', 1)
            ->assertJsonPath('pending', 1)
            ->assertJsonPath('with_active_vacancies', 1)
            ->assertJsonPath('total_active_vacancies', 2);
    }
}
