<?php

namespace Tests\Feature;

use App\Mail\StaffAccountMail;
use App\Models\ActivityLog;
use App\Models\AdminRole;
use App\Models\Administrator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class StaffAccountSetupTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    private AdminRole $adminRole;

    private AdminRole $aideRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();

        $this->adminRole = AdminRole::create(['name' => 'System Administrator', 'slug' => 'administrator', 'permissions' => [], 'is_system' => true]);
        $this->aideRole = AdminRole::create([
            'name' => 'Administrative Aide', 'slug' => 'administrative-aide', 'is_system' => true,
            'permissions' => ['employment_hub' => 'manage'],
        ]);

        config(['app.frontend_url' => 'https://ipeso.website']);
    }

    // ── The invite email ────────────────────────────────────────────────────

    public function test_creating_staff_emails_a_temporary_password_and_does_not_return_it(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->systemAdmin());

        $response = $this->postJson('/api/admin/staff', $this->newStaff())
            ->assertCreated()
            ->assertJsonPath('email_sent', true)
            ->assertJsonPath('staff.account_status', 'invited')
            ->assertJsonMissingPath('temporary_password');

        $this->assertStringContainsString('Sign-in details were sent to maria.santos@peso.test', $response->json('message'));

        $staff = Administrator::where('email', 'maria.santos@peso.test')->first();
        $this->assertTrue($staff->must_change_password);
        $this->assertEqualsWithDelta(now()->addDays(3)->timestamp, $staff->temporary_password_expires_at->timestamp, 5);

        Mail::assertSent(StaffAccountMail::class, function (StaffAccountMail $mail) use ($staff) {
            return $mail->hasTo('maria.santos@peso.test')
                && $mail->kind === StaffAccountMail::INVITE
                && $mail->positionLabel === 'Administrative Aide'
                && Hash::check($mail->temporaryPassword, $staff->password);
        });
    }

    public function test_when_the_email_fails_the_password_is_shown_once_instead(): void
    {
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('SMTP down'));
        Sanctum::actingAs($this->systemAdmin());

        $response = $this->postJson('/api/admin/staff', $this->newStaff())
            ->assertCreated()
            ->assertJsonPath('email_sent', false);

        $password = $response->json('temporary_password');
        $this->assertNotEmpty($password);
        $this->assertTrue(Hash::check($password, Administrator::where('email', 'maria.santos@peso.test')->value('password')));
        $this->assertStringContainsString('could not be sent', ActivityLog::where('action', 'created_staff')->value('description'));
    }

    public function test_the_email_shows_the_sign_in_page_email_password_and_expiry(): void
    {
        $html = (new StaffAccountMail(
            recipientName: 'Maria',
            positionLabel: 'Administrative Aide',
            email: 'maria.santos@peso.test',
            temporaryPassword: 'Tmp4Pass9xyz',
            expiresAt: Carbon::parse('2026-11-13 02:00:00', 'UTC'),
        ))->render();

        $this->assertStringContainsString('https://ipeso.website/administrator', $html);
        $this->assertStringContainsString('maria.santos@peso.test', $html);
        $this->assertStringContainsString('Tmp4Pass9xyz', $html);
        $this->assertStringContainsString('as Administrative Aide', $html);
        $this->assertStringContainsString('November 13, 2026 at 10:00 AM', $html);
    }

    // ── First sign-in ───────────────────────────────────────────────────────

    public function test_first_sign_in_requires_a_new_password_before_anything_else(): void
    {
        $staff = $this->invitedStaff('Temp1234abcd');

        $login = $this->postJson('/api/auth/login', ['email' => $staff->email, 'password' => 'Temp1234abcd'])
            ->assertOk()
            ->assertJsonPath('user.must_change_password', true);
        $token = $login->json('token');

        $this->withToken($token)->getJson('/api/admin/dashboard/stats')
            ->assertForbidden()
            ->assertJsonPath('must_change_password', true);

        $this->forgetAuth();
        $this->withToken($token)->postJson('/api/admin/account/password', [
            'current_password' => 'Temp1234abcd',
            'password' => 'MyOwn#Pass2026',
            'password_confirmation' => 'MyOwn#Pass2026',
        ])->assertOk()->assertJsonPath('must_change_password', false);

        $staff->refresh();
        $this->assertFalse($staff->must_change_password);
        $this->assertNull($staff->temporary_password_expires_at);
        $this->assertNotNull($staff->password_changed_at);
        $this->assertNotNull($staff->last_login_at);
        $this->assertTrue(Hash::check('MyOwn#Pass2026', $staff->password));
        $this->assertDatabaseHas('activity_logs', ['action' => 'changed_password']);

        // The new password works and the account is no longer held back.
        $this->forgetAuth();
        $this->postJson('/api/auth/login', ['email' => $staff->email, 'password' => 'MyOwn#Pass2026'])
            ->assertOk()
            ->assertJsonPath('user.must_change_password', false);
    }

    public function test_the_new_password_must_be_strong_different_and_the_temporary_one_correct(): void
    {
        Sanctum::actingAs($this->invitedStaff('Temp1234abcd'));

        $this->postJson('/api/admin/account/password', [
            'current_password' => 'wrong-one', 'password' => 'MyOwn#Pass2026', 'password_confirmation' => 'MyOwn#Pass2026',
        ])->assertStatus(422)->assertJsonPath('errors.current_password.0', 'The temporary password is incorrect.');

        $this->postJson('/api/admin/account/password', [
            'current_password' => 'Temp1234abcd', 'password' => 'weakpass', 'password_confirmation' => 'weakpass',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->postJson('/api/admin/account/password', [
            'current_password' => 'Temp1234abcd', 'password' => 'Temp1234abcd', 'password_confirmation' => 'Temp1234abcd',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_an_expired_temporary_password_cannot_sign_in(): void
    {
        $staff = $this->invitedStaff('Temp1234abcd');
        $staff->forceFill(['temporary_password_expires_at' => now()->subMinute()])->save();

        $this->postJson('/api/auth/login', ['email' => $staff->email, 'password' => 'Temp1234abcd'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Your temporary password has expired. Ask the PESO system administrator to send you a new one.')
            ->assertJsonMissingPath('token');
    }

    public function test_setting_a_password_through_forgot_password_also_completes_setup(): void
    {
        $staff = $this->invitedStaff('Temp1234abcd');
        Cache::put("ipeso_reset_{$staff->email}", '123456', now()->addMinutes(10));

        $this->postJson('/api/auth/reset-password', [
            'email' => $staff->email, 'otp' => '123456',
            'password' => 'MyOwn#Pass2026', 'password_confirmation' => 'MyOwn#Pass2026',
        ])->assertOk();

        $this->assertFalse($staff->refresh()->must_change_password);
    }

    // ── Sending a new password ──────────────────────────────────────────────

    public function test_resending_to_someone_who_never_set_up_sends_a_fresh_invite(): void
    {
        Mail::fake();
        $staff = $this->invitedStaff('Temp1234abcd');
        $staff->forceFill(['temporary_password_expires_at' => now()->subDay()])->save();
        Sanctum::actingAs($this->systemAdmin());

        $this->getJson('/api/admin/staff')->assertOk();
        $this->assertSame('invite_expired', collect($this->getJson('/api/admin/staff')->json('data'))
            ->firstWhere('email', $staff->email)['account_status']);

        $this->postJson("/api/admin/staff/{$staff->admin_id}/send-password")
            ->assertOk()
            ->assertJsonPath('email_sent', true)
            ->assertJsonPath('staff.account_status', 'invited');

        $this->assertFalse(Hash::check('Temp1234abcd', $staff->refresh()->password));
        Mail::assertSent(StaffAccountMail::class, fn ($mail) => $mail->kind === StaffAccountMail::INVITE);
        $this->assertDatabaseHas('activity_logs', ['action' => 'resent_staff_invite']);
    }

    public function test_resetting_an_active_account_signs_it_out_and_requires_a_new_password(): void
    {
        Mail::fake();
        $staff = $this->invitedStaff('Temp1234abcd');
        $staff->forceFill(['must_change_password' => false, 'password_changed_at' => now()->subWeek()])->save();
        $staff->createToken('web');
        Sanctum::actingAs($this->systemAdmin());

        $this->postJson("/api/admin/staff/{$staff->admin_id}/send-password")->assertOk();

        $staff->refresh();
        $this->assertTrue($staff->must_change_password);
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $staff->admin_id)->where('tokenable_type', Administrator::class)->count());
        Mail::assertSent(StaffAccountMail::class, fn ($mail) => $mail->kind === StaffAccountMail::RESET);
        $this->assertDatabaseHas('activity_logs', ['action' => 'reset_staff_password']);
    }

    public function test_sending_a_password_is_refused_for_yourself_deactivated_accounts_and_non_admins(): void
    {
        Mail::fake();
        $admin = $this->systemAdmin();
        $staff = $this->invitedStaff('Temp1234abcd');
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/staff/{$admin->admin_id}/send-password")
            ->assertStatus(422)->assertJsonPath('message', 'Use Change password to update your own password.');

        $staff->forceFill(['status' => 'inactive'])->save();
        $this->postJson("/api/admin/staff/{$staff->admin_id}/send-password")
            ->assertStatus(422)->assertJsonPath('message', 'Reactivate this account before sending a new password.');

        $aide = $this->invitedStaff('Temp1234abcd', 'aide2@peso.test');
        $aide->forceFill(['must_change_password' => false])->save();
        Sanctum::actingAs($aide);
        $this->postJson("/api/admin/staff/{$admin->admin_id}/send-password")->assertForbidden();

        Mail::assertNothingSent();
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Sanctum caches the user between requests in one test; real requests don't share it. */
    private function forgetAuth(): void
    {
        $this->app['auth']->forgetGuards();
    }

    private function systemAdmin(): Administrator
    {
        return Administrator::create([
            'first_name' => 'System', 'last_name' => 'Admin', 'email' => 'sleo@peso.test',
            'mobile_number' => '09171234567', 'password' => 'password123',
            'position' => 'peso_office_manager',
            'role' => 'administrator', 'admin_role_id' => $this->adminRole->id,
            'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function invitedStaff(string $temporaryPassword, string $email = 'aide@peso.test'): Administrator
    {
        // forceCreate: the setup fields are deliberately not mass-assignable.
        return Administrator::forceCreate([
            'first_name' => 'Maria', 'last_name' => 'Santos', 'email' => $email,
            'mobile_number' => '09181234567', 'password' => $temporaryPassword,
            'position' => 'administrative_aide',
            'role' => 'administrative-aide', 'admin_role_id' => $this->aideRole->id,
            'status' => 'active', 'email_verified_at' => now(),
            'must_change_password' => true,
            'temporary_password_expires_at' => now()->addDays(3),
            'invited_at' => now(),
        ]);
    }

    private function newStaff(): array
    {
        return [
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'email' => 'maria.santos@peso.test',
            'mobile_number' => '09181234567',
            'position' => 'administrative_aide',
        ];
    }
}
