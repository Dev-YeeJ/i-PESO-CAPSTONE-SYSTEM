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
            'password' => 'password123!',
            'password_confirmation' => 'password123!',
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

    public function test_seeker_registration_normalizes_contact_inputs(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/register', [
            'role' => 'seeker',
            'first_name' => '  Maria   Clara ',
            'last_name' => '  Dela   Cruz ',
            'email' => '  MARIA.CLARA@example.COM ',
            'mobile_number' => '+63 912 345 6789',
            'password' => 'password123!',
            'password_confirmation' => 'password123!',
        ])->assertCreated();

        $this->assertDatabaseHas('job_seekers', [
            'first_name' => 'Maria Clara',
            'last_name' => 'Dela Cruz',
            'email' => 'maria.clara@example.com',
            'mobile_number' => '09123456789',
        ]);
    }
}
