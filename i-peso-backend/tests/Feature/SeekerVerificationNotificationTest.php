<?php

namespace Tests\Feature;

use App\Mail\AccountVerificationStatusMail;
use App\Models\Administrator;
use App\Models\JobSeeker;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SeekerVerificationNotificationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
    }

    public function test_admin_approval_updates_status_logs_action_and_queues_email(): void
    {
        Mail::fake();
        $admin = $this->createAdmin();
        $seeker = $this->createSeeker();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/seekers/{$seeker->seeker_id}/verify", [
            'action' => 'approve',
            'remarks' => 'Profile information and requirements were reviewed.',
        ])
            ->assertOk()
            ->assertJsonPath('notification_queued', true)
            ->assertJsonPath('seeker.verification_status', 'verified');

        $this->assertDatabaseHas('job_seekers', [
            'seeker_id' => $seeker->seeker_id,
            'is_verified' => true,
            'verification_status' => 'verified',
            'verified_by' => $admin->admin_id,
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->admin_id,
            'action' => 'approved_job_seeker',
        ]);
        Mail::assertQueued(AccountVerificationStatusMail::class, function ($mail) use ($seeker) {
            return $mail->hasTo($seeker->email)
                && $mail->accountType === 'Job Seeker'
                && $mail->status === 'verified';
        });
    }

    public function test_rejection_requires_reason_and_queues_status_email(): void
    {
        Mail::fake();
        $admin = $this->createAdmin();
        $seeker = $this->createSeeker();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/seekers/{$seeker->seeker_id}/verify", [
            'action' => 'reject',
            'remarks' => 'Too short',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('remarks');

        $reason = 'Please correct the incomplete employment information.';
        $this->postJson("/api/admin/seekers/{$seeker->seeker_id}/verify", [
            'action' => 'reject',
            'remarks' => $reason,
        ])
            ->assertOk()
            ->assertJsonPath('seeker.verification_status', 'rejected');

        Mail::assertQueued(AccountVerificationStatusMail::class, function ($mail) use ($reason, $seeker) {
            return $mail->hasTo($seeker->email)
                && $mail->status === 'rejected'
                && $mail->remarks === $reason;
        });
    }

    private function createAdmin(): Administrator
    {
        return Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Verifier',
            'email' => fake()->unique()->safeEmail(),
            'mobile_number' => '09171234567',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function createSeeker(): JobSeeker
    {
        return JobSeeker::create([
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'profile_completed' => true,
            'is_verified' => false,
            'verification_status' => 'pending',
            'email_verified_at' => now(),
        ]);
    }

    private function createTables(): void
    {
        if (! Schema::hasTable('administrators')) {
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
        }

        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->unique();
                $table->string('password');
                $table->boolean('profile_completed')->default(false);
                $table->boolean('is_verified')->default(false);
                $table->string('verification_status')->default('pending');
                $table->timestamp('verified_at')->nullable();
                $table->unsignedBigInteger('verified_by')->nullable();
                $table->text('verification_remarks')->nullable();
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id('log_id');
                $table->string('user_type');
                $table->unsignedBigInteger('user_id');
                $table->string('action', 100);
                $table->text('description')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();
            });
        }
    }
}
