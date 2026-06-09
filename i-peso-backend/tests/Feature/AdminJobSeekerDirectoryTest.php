<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\JobSeeker;
use Illuminate\Database\Schema\Blueprint;
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
            $table->string('mobile_number');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('educ_attainment')->nullable();
            $table->string('employment_status')->nullable();
            $table->string('address_municipality_city')->nullable();
            $table->string('address_province')->nullable();
            $table->boolean('profile_completed')->default(false);
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('job_seekers');
        Schema::dropIfExists('administrators');

        parent::tearDown();
    }

    public function test_admin_can_filter_job_seekers_by_profile_completion_status(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Administrator',
            'email' => 'admin-directory@example.com',
            'mobile_number' => '09170000001',
            'password' => 'password',
            'role' => 'admin',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        JobSeeker::create([
            'first_name' => 'Complete',
            'last_name' => 'Seeker',
            'mobile_number' => '09170000002',
            'email' => 'complete-seeker@example.com',
            'password' => 'password',
            'profile_completed' => true,
        ]);

        JobSeeker::create([
            'first_name' => 'Incomplete',
            'last_name' => 'Seeker',
            'mobile_number' => '09170000003',
            'email' => 'incomplete-seeker@example.com',
            'password' => 'password',
            'profile_completed' => false,
        ]);

        $this->getJson('/api/admin/seekers?profile_completed=0&per_page=15')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.email', 'incomplete-seeker@example.com');

        $this->getJson('/api/admin/seekers?profile_completed=1&per_page=15')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.email', 'complete-seeker@example.com');
    }
}
