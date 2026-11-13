<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Services\Sms\SmsService;
use App\Services\SystemSettings;
use App\Services\SystemStatusService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class SystemSettingsTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createStaffTables();
        if (! Schema::hasTable('system_settings')) {
            (require database_path('migrations/2026_11_13_000007_create_system_settings_table.php'))->up();
        }
        config(['services.sms.driver' => 'log_only', 'mail.default' => 'array']);
    }

    public function test_everyone_with_configuration_access_can_look_but_only_the_system_administrator_can_change(): void
    {
        Sanctum::actingAs($this->staffWith(['configuration' => 'view'], 'viewer@example.test'));
        $this->getJson('/api/admin/system-settings')
            ->assertOk()
            ->assertJsonPath('can_edit', false)
            ->assertJsonFragment(['key' => 'placement.deadline_day', 'value' => 10]);
        $this->putJson('/api/admin/system-settings', ['values' => ['sms.enabled' => false]])->assertForbidden();

        Sanctum::actingAs($this->staffWith(['configuration' => 'manage'], 'config-manager@example.test'));
        $this->putJson('/api/admin/system-settings', ['values' => ['sms.enabled' => false]])->assertForbidden();

        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/system-settings')->assertJsonPath('can_edit', true);
        $this->putJson('/api/admin/system-settings', ['values' => ['sms.enabled' => false, 'placement.deadline_day' => 15]])
            ->assertOk()
            ->assertJsonPath('changed', ['sms.enabled', 'placement.deadline_day']);

        $this->assertDatabaseHas('activity_logs', ['action' => 'system_setting_changed', 'description' => 'Changed “Placement report due day” from 10 to 15.']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'system_setting_changed', 'description' => 'Changed “Send SMS” from on to off.']);
        $this->getJson('/api/admin/system-settings')->assertJsonFragment(['key' => 'placement.deadline_day', 'value' => 15, 'changed' => true, 'updated_by' => 'PESO Manager']);
    }

    public function test_values_are_validated_against_their_allowed_ranges(): void
    {
        Sanctum::actingAs($this->admin());

        $this->putJson('/api/admin/system-settings', ['values' => ['placement.deadline_day' => 31]])
            ->assertStatus(422)->assertJsonValidationErrors(['values.placement.deadline_day']);
        $this->putJson('/api/admin/system-settings', ['values' => ['permits.reminder_days' => [30, 20, 14, 7, 3, 1, 0]]])
            ->assertStatus(422);
        $this->putJson('/api/admin/system-settings', ['values' => ['placement.reminder_offsets' => [3, 'soon']]])
            ->assertStatus(422);
        $this->putJson('/api/admin/system-settings', ['values' => ['maintenance.message' => 'short']])
            ->assertStatus(422);
        $this->putJson('/api/admin/system-settings', ['values' => ['app.secret_key' => 'x']])
            ->assertStatus(422)->assertJsonValidationErrors(['values']);

        // Lists are cleaned: duplicates dropped, sorted from furthest to closest.
        $this->putJson('/api/admin/system-settings', ['values' => ['permits.reminder_days' => [7, 30, 7, 0]]])->assertOk();
        $this->assertSame([30, 7, 0], app(SystemSettings::class)->get('permits.reminder_days'));
    }

    public function test_saved_rules_replace_the_config_the_reminder_jobs_read(): void
    {
        Sanctum::actingAs($this->admin());
        $this->putJson('/api/admin/system-settings', ['values' => [
            'placement.deadline_day' => 5,
            'placement.reminder_offsets' => [2, -3],
            'permits.reminder_days' => [60, 30, 0],
            'chatbot.gap_logging' => false,
        ]])->assertOk();

        // As on the next request: config back to the file values, then boot applies the settings.
        config(['placement_reports.deadline_day' => 10, 'placement_reports.reminder_offsets' => [3, 0, -7], 'permits.reminder_days' => [30, 14, 7, 1, 0], 'services.chatbot.gap_logging' => true]);
        $settings = app(SystemSettings::class);
        $settings->flush();
        $settings->applyToConfig();

        $this->assertSame(5, config('placement_reports.deadline_day'));
        $this->assertSame([2, -3], config('placement_reports.reminder_offsets'));
        $this->assertSame([60, 30, 0], config('permits.reminder_days'));
        $this->assertFalse(config('services.chatbot.gap_logging'));
    }

    public function test_maintenance_mode_shows_the_message_to_everyone_but_staff(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $this->putJson('/api/admin/system-settings', ['values' => [
            'maintenance.enabled' => true,
            'maintenance.message' => 'We are moving to a new server until 5 PM today.',
        ]])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/public/system-status')
            ->assertOk()
            ->assertJsonPath('maintenance.enabled', true)
            ->assertJsonPath('maintenance.message', 'We are moving to a new server until 5 PM today.');
        $this->getJson('/api/public/faqs')
            ->assertStatus(503)
            ->assertJsonPath('maintenance', true)
            ->assertJsonPath('message', 'We are moving to a new server until 5 PM today.');
        // Signing in stays open, so staff can get in.
        $this->assertNotSame(503, $this->postJson('/api/auth/login', ['email' => 'nobody@example.test', 'password' => 'x'])->status());

        Sanctum::actingAs($this->seeker());
        $this->getJson('/api/help')->assertStatus(503);

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/system-settings')->assertOk();
        $this->putJson('/api/admin/system-settings', ['values' => ['maintenance.enabled' => false]])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->assertNotSame(503, $this->getJson('/api/public/faqs')->status());
    }

    public function test_registration_can_be_paused_per_role(): void
    {
        Sanctum::actingAs($this->admin());
        $this->putJson('/api/admin/system-settings', ['values' => ['registration.seekers_open' => false]])->assertOk();
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/public/system-status')
            ->assertJsonPath('registration.seekers_open', false)
            ->assertJsonPath('registration.employers_open', true);

        $this->postJson('/api/auth/register', ['role' => 'seeker', 'email' => 'new@example.test'])
            ->assertStatus(403)
            ->assertJsonPath('registration_closed', true)
            ->assertJsonPath('message', 'New registrations are paused for now. Please check back soon, or visit the PESO office for help.');

        // Employers are still open: the request reaches normal validation.
        $this->postJson('/api/auth/register', ['role' => 'employer'])->assertStatus(422);
    }

    public function test_the_assistant_can_be_switched_off_without_calling_the_ai(): void
    {
        Http::fake();
        Sanctum::actingAs($this->admin());
        $this->putJson('/api/admin/system-settings', ['values' => ['chatbot.enabled' => false]])->assertOk();
        $this->app['auth']->forgetGuards();

        $this->postJson('/api/chat/public', ['message' => 'Hello?'])
            ->assertStatus(503)
            ->assertJsonPath('assistant_disabled', true);
        $this->getJson('/api/public/system-status')->assertJsonPath('chatbot_enabled', false);
        Http::assertNothingSent();
    }

    public function test_sms_switches_and_the_monthly_limit_stop_messages_with_a_reason(): void
    {
        $settings = app(SystemSettings::class);
        $seeker = $this->seeker();

        Sanctum::actingAs($this->admin());
        $this->putJson('/api/admin/system-settings', ['values' => ['sms.enabled' => false]])->assertOk();
        $result = app(SmsService::class)->send($seeker, '09171234567', 'Hello', 'application_status');
        $this->assertSame('skipped', $result->status);
        $this->assertSame('SMS is switched off in System Settings.', $result->error);

        $this->putJson('/api/admin/system-settings', ['values' => ['sms.enabled' => true, 'sms.types.interview' => false, 'sms.monthly_cap' => 100]])->assertOk();
        $this->assertSame('Interview messages are switched off in System Settings.', $settings->smsBlockReason('interview_reminder', fn () => 0));
        $this->assertNull($settings->smsBlockReason('application_status', fn () => 99));
        $this->assertSame("This month's SMS limit (100) has been reached.", $settings->smsBlockReason('application_status', fn () => 100));
        $this->assertNull($settings->smsBlockReason('job_fair_invited', fn () => 0));
        // An administrator's test message always goes through.
        $this->assertNull($settings->smsBlockReason('system_test', fn () => 1000));
    }

    public function test_status_reports_a_stopped_scheduler_and_test_mode_sms(): void
    {
        Sanctum::actingAs($this->staffWith(['configuration' => 'view'], 'status-viewer@example.test'));
        $checks = collect($this->getJson('/api/admin/system-settings/status')->assertOk()->json('checks'))->keyBy('id');

        $this->assertSame('error', $checks['scheduler']['status']);
        $this->assertSame('warn', $checks['sms']['status']);
        $this->assertStringContainsString('Test mode', $checks['sms']['summary']);
        $this->assertSame('warn', $checks['email']['status']);

        Cache::put(SystemStatusService::SCHEDULER_HEARTBEAT, now()->subMinute()->toIso8601String());
        $checks = collect($this->getJson('/api/admin/system-settings/status')->json('checks'))->keyBy('id');
        $this->assertSame('ok', $checks['scheduler']['status']);
        $this->assertArrayNotHasKey('secret_key', $checks['sms']['details']);
    }

    public function test_test_messages_report_what_happened(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/system-settings/test-sms', ['phone' => '12345'])->assertStatus(422);
        $this->postJson('/api/admin/system-settings/test-sms', ['phone' => '09171234567'])
            ->assertOk()
            ->assertJsonPath('status', 'log_only');

        $this->postJson('/api/admin/system-settings/test-email')
            ->assertOk()
            ->assertJsonPath('message', 'Test email written to the server log (mailer is “array”, so nothing was delivered).');

        config(['services.vertex_ai.enabled' => false]);
        $this->postJson('/api/admin/system-settings/test-ai')->assertStatus(503);

        Sanctum::actingAs($this->staffWith(['configuration' => 'manage'], 'not-system@example.test'));
        $this->postJson('/api/admin/system-settings/test-email')->assertForbidden();
    }

    private function admin(): Administrator
    {
        return Administrator::query()->where('email', 'settings-admin@example.test')->first() ?? Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Manager', 'email' => 'settings-admin@example.test',
            'password' => 'password123', 'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function staffWith(array $permissions, string $email): Administrator
    {
        $role = AdminRole::create(['name' => 'Role '.$email, 'slug' => 'role-'.md5($email), 'permissions' => $permissions]);

        return Administrator::create([
            'first_name' => 'Staff', 'last_name' => 'Member', 'email' => $email, 'password' => 'password123',
            'role' => 'staff', 'admin_role_id' => $role->id, 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function seeker(): JobSeeker
    {
        $id = DB::table('job_seekers')->insertGetId(['email' => fake()->unique()->safeEmail(), 'created_at' => now(), 'updated_at' => now()]);

        return JobSeeker::findOrFail($id);
    }
}
