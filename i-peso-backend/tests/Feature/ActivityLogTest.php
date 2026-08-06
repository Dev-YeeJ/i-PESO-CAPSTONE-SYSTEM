<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Services\ActivityLogger;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
    }

    public function test_non_administrators_cannot_read_the_audit_trail(): void
    {
        Sanctum::actingAs($this->createSeeker());

        // Blocked by the EnsureAdministrator middleware before the controller's
        // own instanceof guard is reached.
        $this->getJson('/api/admin/activity-logs')
            ->assertForbidden()
            ->assertJsonPath('message', 'Administrator account required.');
    }

    public function test_logs_are_returned_newest_first_with_actor_names_and_severity(): void
    {
        $admin = $this->createAdmin('audit-admin@peso.test');
        $seeker = $this->createSeeker(['email' => 'actor@peso.test']);

        ActivityLogger::logAs($seeker, 'applied_job', 'Applied to "Barista" (vacancy #7).');
        ActivityLogger::logGuest('login_failed', 'Failed sign-in attempt for unregistered email ghost@peso.test.');

        Sanctum::actingAs($admin);
        $response = $this->getJson('/api/admin/activity-logs')->assertOk();

        $response->assertJsonPath('logs.data.0.action', 'login_failed');
        $response->assertJsonPath('logs.data.0.severity', 'critical');
        $response->assertJsonPath('logs.data.0.user_type_label', 'Guest');
        $response->assertJsonPath('logs.data.0.actor_name', 'Unauthenticated visitor');

        $response->assertJsonPath('logs.data.1.action', 'applied_job');
        $response->assertJsonPath('logs.data.1.severity', 'success');
        $response->assertJsonPath('logs.data.1.user_type_label', 'Job Seeker');
        $response->assertJsonPath('logs.data.1.actor_name', 'Juan Dela Cruz');
    }

    public function test_filters_narrow_the_results_and_the_summary(): void
    {
        $admin = $this->createAdmin('filter-admin@peso.test');
        $seeker = $this->createSeeker(['email' => 'filtered@peso.test']);

        ActivityLogger::logAs($seeker, 'login', 'Signed in as seeker.');
        ActivityLogger::logAs($seeker, 'applied_job', 'Applied to "Welder" (vacancy #12).');
        ActivityLogger::logGuest('login_failed', 'Failed sign-in for unknown email.');

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/activity-logs?action=login')
            ->assertOk()
            ->assertJsonCount(1, 'logs.data')
            ->assertJsonPath('logs.data.0.action', 'login')
            ->assertJsonPath('summary.total', 1)
            ->assertJsonPath('summary.actors', 1)
            ->assertJsonPath('summary.critical', 0);

        $this->getJson('/api/admin/activity-logs?user_type=seeker')
            ->assertOk()
            ->assertJsonCount(2, 'logs.data')
            ->assertJsonPath('summary.total', 2);

        $this->getJson('/api/admin/activity-logs?search=Welder')
            ->assertOk()
            ->assertJsonCount(1, 'logs.data')
            ->assertJsonPath('logs.data.0.action', 'applied_job');

        // Three events from two distinct actors (one seeker + one guest).
        $this->getJson('/api/admin/activity-logs')
            ->assertOk()
            ->assertJsonPath('summary.total', 3)
            ->assertJsonPath('summary.today', 3)
            ->assertJsonPath('summary.actors', 2)
            ->assertJsonPath('summary.critical', 1);
    }

    public function test_date_range_excludes_older_events(): void
    {
        $admin = $this->createAdmin('range-admin@peso.test');
        $seeker = $this->createSeeker(['email' => 'range@peso.test']);

        ActivityLogger::logAs($seeker, 'login', 'Old sign-in.');
        ActivityLog::query()->update(['created_at' => now()->subDays(10)]);
        ActivityLogger::logAs($seeker, 'logout', 'Recent sign-out.');

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/activity-logs?date_from='.now()->subDay()->toDateString())
            ->assertOk()
            ->assertJsonCount(1, 'logs.data')
            ->assertJsonPath('logs.data.0.action', 'logout');
    }

    public function test_an_invalid_date_range_is_rejected(): void
    {
        Sanctum::actingAs($this->createAdmin('invalid-range@peso.test'));

        $this->getJson('/api/admin/activity-logs?date_from=2026-08-05&date_to=2026-08-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors('date_to');
    }

    public function test_filter_options_only_list_actions_that_exist(): void
    {
        $admin = $this->createAdmin('options-admin@peso.test');
        ActivityLogger::logAs($admin, 'approved_employer', 'Approved employer #1.');

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/activity-logs')
            ->assertOk()
            ->assertJsonPath('filters.actions.0.value', 'approved_employer')
            ->assertJsonPath('filters.actions.0.label', 'Approved Employer')
            ->assertJsonPath('filters.user_types.0.label', 'Administrator');
    }

    public function test_a_failed_audit_write_does_not_break_the_caller(): void
    {
        Schema::drop('activity_logs');

        $this->assertNull(ActivityLogger::logGuest('login_failed', 'Table is gone.'));

        $this->createTables();
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────

    private function createAdmin(string $email): Administrator
    {
        return Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => $email,
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function createSeeker(array $attributes = []): JobSeeker
    {
        return JobSeeker::create(array_merge([
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'email' => 'seeker@peso.test',
            'password' => 'password123',
            'mobile_number' => '09171234567',
            'email_verified_at' => now(),
        ], $attributes));
    }

    private function createTables(): void
    {
        if (! Schema::hasTable('administrators')) {
            Schema::create('administrators', function (Blueprint $table) {
                $table->id('admin_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->unique();
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
                $table->string('mobile_number')->nullable();
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
