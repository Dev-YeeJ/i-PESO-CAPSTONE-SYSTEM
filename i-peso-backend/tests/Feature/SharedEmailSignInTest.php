<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

/**
 * One email on more than one account type. Sign-in used to stop at the first match (the job
 * seeker account), so a password changed on the other account — e.g. a staff member's
 * "Change password" — could never be used to sign in.
 */
class SharedEmailSignInTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    private const EMAIL = 'shared@peso.test';

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();

        // A job seeker account on the same email, with a different (old) password.
        DB::table('job_seekers')->insert([
            'email' => self::EMAIL,
            'password' => Hash::make('OldSeeker1!'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_staff_can_sign_in_with_their_changed_password_when_a_seeker_shares_the_email(): void
    {
        $this->staff('NewStaff9!');

        $this->postJson('/api/auth/login', ['email' => self::EMAIL, 'password' => 'NewStaff9!'])
            ->assertOk()
            ->assertJsonPath('user.role', 'administrator')
            ->assertJsonStructure(['token']);
    }

    public function test_a_password_that_matches_no_account_is_still_refused(): void
    {
        $this->staff('NewStaff9!');

        $this->postJson('/api/auth/login', ['email' => self::EMAIL, 'password' => 'Wrong1234!'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'These credentials do not match our records.')
            ->assertJsonMissingPath('token');
    }

    public function test_resetting_by_emailed_code_updates_every_account_on_the_email(): void
    {
        $staff = $this->staff('OldStaff1!');
        Cache::put('ipeso_reset_' . self::EMAIL, '123456', now()->addMinutes(10));

        $this->postJson('/api/auth/reset-password', [
            'email' => self::EMAIL,
            'otp' => '123456',
            'password' => 'Reset1234!',
            'password_confirmation' => 'Reset1234!',
        ])->assertOk();

        $this->assertTrue(Hash::check('Reset1234!', DB::table('job_seekers')->where('email', self::EMAIL)->value('password')));
        $this->assertTrue(Hash::check('Reset1234!', $staff->fresh()->password));

        // Both accounts now share a password: the admin sign-in page still gets the staff account.
        $this->postJson('/api/auth/login', ['email' => self::EMAIL, 'password' => 'Reset1234!', 'portal' => 'administrator'])
            ->assertOk()
            ->assertJsonPath('user.role', 'administrator');
    }

    public function test_without_a_portal_hint_the_usual_order_applies(): void
    {
        $this->staff('OldSeeker1!'); // same password as the seeker account

        // No hint: the job seeker account is tried first, as before (this minimal seeker
        // has no verified email, hence 403 — proof it was the seeker account that matched).
        $this->postJson('/api/auth/login', ['email' => self::EMAIL, 'password' => 'OldSeeker1!'])
            ->assertForbidden()
            ->assertJsonPath('email_unverified', true);

        $this->postJson('/api/auth/login', ['email' => self::EMAIL, 'password' => 'OldSeeker1!', 'portal' => 'administrator'])
            ->assertOk()
            ->assertJsonPath('user.role', 'administrator');
    }

    private function staff(string $password): Administrator
    {
        $role = AdminRole::firstOrCreate(
            ['slug' => 'administrator'],
            ['name' => 'System Administrator', 'permissions' => [], 'is_system' => true]
        );

        return Administrator::forceCreate([
            'first_name' => 'Maria', 'last_name' => 'Santos', 'email' => self::EMAIL,
            'mobile_number' => '09181234567', 'password' => $password,
            'position' => 'peso_office_manager',
            'role' => 'administrator', 'admin_role_id' => $role->id,
            'status' => 'active', 'email_verified_at' => now(),
        ]);
    }
}
