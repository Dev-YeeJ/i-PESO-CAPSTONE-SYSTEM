<?php

namespace Tests\Feature;

use App\Mail\OtpMail;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SeekerRegistrationTest extends TestCase
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
                $table->string('complete_address')->nullable();
                $table->string('educ_attainment')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('employers')) {
            Schema::create('employers', function (Blueprint $table) {
                $table->id('employer_id');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('company_type')->nullable();
                $table->softDeletes();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('administrators')) {
            Schema::create('administrators', function (Blueprint $table) {
                $table->id('admin_id');
                $table->string('email')->unique();
                $table->string('password');
                $table->timestamps();
            });
        }
    }

    public function test_seeker_can_create_account_without_educational_attainment(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/register', [
            'role' => 'seeker',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'email' => 'juan@example.com',
            'mobile_number' => '09123456789',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('email', 'juan@example.com');

        $this->assertDatabaseHas('job_seekers', [
            'email' => 'juan@example.com',
            'educ_attainment' => null,
        ]);

        Mail::assertSent(OtpMail::class);
    }

    public function test_seeker_mobile_registration_saves_optional_profile_fields(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/register', [
            'role' => 'seeker',
            'first_name' => 'Bryan',
            'last_name' => 'Bugayong',
            'educ_attainment' => 'College Graduate',
            'email' => 'bryan@example.com',
            'mobile_number' => '09241629692',
            'complete_address' => 'Calbueg, Malasiqui, Pangasinan',
            'password' => 'Bry@n_testing#123',
            'password_confirmation' => 'Bry@n_testing#123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('email', 'bryan@example.com');

        $this->assertDatabaseHas('job_seekers', [
            'email' => 'bryan@example.com',
            'educ_attainment' => 'College Graduate',
            'complete_address' => 'Calbueg, Malasiqui, Pangasinan',
        ]);

        Mail::assertSent(OtpMail::class);
    }
}
