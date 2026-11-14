<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\AdminRole;
use App\Models\Administrator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class StaffManagementSafetyTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    private AdminRole $adminRole;

    private AdminRole $staffRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();

        $this->adminRole = AdminRole::create([
            'name' => 'Administrator', 'slug' => 'administrator', 'is_system' => true,
            'permissions' => array_keys(AdminRole::MODULES),
        ]);
        $this->staffRole = AdminRole::create([
            'name' => 'Staff', 'slug' => 'staff', 'is_system' => true,
            'permissions' => ['employment_hub'],
        ]);
        // Adding an Administrative Aide gives them this role.
        AdminRole::create([
            'name' => 'Administrative Aide', 'slug' => 'administrative-aide', 'is_system' => true,
            'permissions' => ['employment_hub' => 'manage'],
        ]);
    }

    // ── Sign-in and sessions ────────────────────────────────────────────────

    public function test_a_deactivated_staff_member_cannot_sign_in(): void
    {
        $this->makeStaff('gone@peso.test', 'inactive');

        $this->postJson('/api/auth/login', ['email' => 'gone@peso.test', 'password' => 'password123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'This account has been deactivated. Contact the PESO system administrator.')
            ->assertJsonMissingPath('token');

        $this->assertDatabaseHas('activity_logs', ['action' => 'login_blocked']);
    }

    public function test_a_wrong_password_on_a_deactivated_account_gives_the_normal_error(): void
    {
        $this->makeStaff('gone@peso.test', 'inactive');

        $this->postJson('/api/auth/login', ['email' => 'gone@peso.test', 'password' => 'not-it'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'These credentials do not match our records.');
    }

    public function test_admin_sign_in_returns_role_and_modules(): void
    {
        $this->makeStaff('aide@peso.test');

        $this->postJson('/api/auth/login', ['email' => 'aide@peso.test', 'password' => 'password123'])
            ->assertOk()
            ->assertJsonPath('user.admin_role.slug', 'staff')
            ->assertJsonPath('user.is_system_administrator', false)
            ->assertJsonPath('user.modules', ['employment_hub'])
            ->assertJsonPath('user.status', 'active');
    }

    public function test_a_session_stops_working_once_the_account_is_inactive(): void
    {
        $staff = $this->makeStaff('aide@peso.test');
        $staff->forceFill(['status' => 'inactive'])->save();
        Sanctum::actingAs($staff);

        $this->getJson('/api/admin/dashboard/stats')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'This account has been deactivated. Contact the PESO system administrator.');
    }

    // ── Who may manage accounts ─────────────────────────────────────────────

    public function test_staff_with_configuration_access_cannot_manage_accounts(): void
    {
        $this->staffRole->update(['permissions' => ['configuration']]);
        $staff = $this->makeStaff('aide@peso.test');
        Sanctum::actingAs($staff);

        $this->getJson('/api/admin/staff')->assertOk();

        $this->postJson('/api/admin/staff', $this->newStaffPayload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Only the system administrator can manage staff accounts.');

        $this->putJson("/api/admin/staff/{$staff->admin_id}", ['position' => 'peso_office_manager'])
            ->assertForbidden();

        $other = $this->makeStaff('other@peso.test', 'inactive');
        $this->deleteJson("/api/admin/staff/{$other->admin_id}")->assertForbidden();
        $this->assertNotSoftDeleted('administrators', ['admin_id' => $other->admin_id]);

        $this->putJson("/api/admin/roles/{$this->staffRole->id}", ['permissions' => array_keys(AdminRole::MODULES)])
            ->assertForbidden();
    }

    public function test_the_system_administrator_can_create_staff_and_it_is_logged(): void
    {
        Sanctum::actingAs($this->makeAdmin('sleo@peso.test'));

        $this->postJson('/api/admin/staff', $this->newStaffPayload())
            ->assertCreated()
            ->assertJsonPath('staff.email', 'new.aide@peso.test');

        $log = ActivityLog::where('action', 'created_staff')->first();
        $this->assertNotNull($log);
        $this->assertStringContainsString('new.aide@peso.test', $log->description);
        $this->assertStringContainsString('as Administrative Aide', $log->description);
    }

    // ── Deactivate instead of delete ────────────────────────────────────────

    public function test_deactivating_keeps_the_account_and_signs_it_out_everywhere(): void
    {
        Sanctum::actingAs($this->makeAdmin('sleo@peso.test'));
        $staff = $this->makeStaff('aide@peso.test');
        $staff->createToken('web');
        $staff->createToken('mobile');

        $this->postJson("/api/admin/staff/{$staff->admin_id}/deactivate")
            ->assertOk()
            ->assertJsonPath('staff.status', 'inactive');

        $this->assertDatabaseHas('administrators', ['admin_id' => $staff->admin_id, 'status' => 'inactive']);
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $staff->admin_id)->count());
        $this->assertDatabaseHas('activity_logs', ['action' => 'deactivated_staff']);

        $this->postJson("/api/admin/staff/{$staff->admin_id}/reactivate")
            ->assertOk()
            ->assertJsonPath('staff.status', 'active');
        $this->assertDatabaseHas('activity_logs', ['action' => 'reactivated_staff']);
    }

    // ── Deleting an account for good ────────────────────────────────────────

    public function test_an_account_that_was_used_must_be_deactivated_before_it_can_be_deleted(): void
    {
        Sanctum::actingAs($this->makeAdmin('sleo@peso.test'));
        $staff = $this->makeStaff('aide@peso.test');
        $staff->forceFill(['last_login_at' => now()])->save();

        $this->deleteJson("/api/admin/staff/{$staff->admin_id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Deactivate this account before deleting it.');

        $this->assertNotSoftDeleted('administrators', ['admin_id' => $staff->admin_id]);
    }

    public function test_an_invite_that_was_never_used_can_be_deleted_straight_away(): void
    {
        Sanctum::actingAs($this->makeAdmin('sleo@peso.test'));
        $typo = $this->makeStaff('aide@pesso.test');

        $this->deleteJson("/api/admin/staff/{$typo->admin_id}")->assertOk();

        $this->assertSoftDeleted('administrators', ['admin_id' => $typo->admin_id]);
    }

    public function test_deleting_wipes_personal_details_frees_the_email_and_hides_the_account(): void
    {
        Sanctum::actingAs($this->makeAdmin('sleo@peso.test'));
        $staff = $this->makeStaff('aide@peso.test', 'inactive');
        $staff->forceFill(['first_name' => 'Maria', 'last_name' => 'Santos', 'last_login_at' => now()->subMonth()])->save();
        $staff->createToken('web');

        $this->deleteJson("/api/admin/staff/{$staff->admin_id}")
            ->assertOk()
            ->assertJsonPath('deleted_id', $staff->admin_id)
            ->assertJsonPath('message', "Maria Santos's account was deleted.");

        // The row is kept (so nothing they made is cascade-deleted) but stripped.
        $row = DB::table('administrators')->where('admin_id', $staff->admin_id)->first();
        $this->assertNotNull($row->deleted_at);
        $this->assertSame("deleted-{$staff->admin_id}@deleted.invalid", $row->email);
        $this->assertSame('', $row->mobile_number);
        $this->assertSame('deleted', $row->deactivated_reason);
        $this->assertSame('Maria', $row->first_name, 'The name stays so their records still say who did them.');
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $staff->admin_id)->count());

        $log = ActivityLog::where('action', 'deleted_staff')->firstOrFail();
        $this->assertStringContainsString('Maria Santos (aide@peso.test)', $log->description);

        // Gone from the staff list and every account action...
        $this->assertNotContains($staff->admin_id, collect($this->getJson('/api/admin/staff')->json('data'))->pluck('id'));
        $this->postJson("/api/admin/staff/{$staff->admin_id}/reactivate")->assertNotFound();
        $this->deleteJson("/api/admin/staff/{$staff->admin_id}")->assertNotFound();

        // ...can't sign in with the old details...
        $this->postJson('/api/auth/login', ['email' => 'aide@peso.test', 'password' => 'password123'])
            ->assertUnauthorized();

        // ...and the email can be given to a new account.
        $this->postJson('/api/admin/staff', [...$this->newStaffPayload(), 'email' => 'aide@peso.test'])->assertCreated();
    }

    public function test_the_audit_trail_still_names_a_deleted_staff_member(): void
    {
        $admin = $this->makeAdmin('sleo@peso.test');
        Sanctum::actingAs($admin);
        $staff = $this->makeStaff('aide@peso.test', 'inactive');
        $staff->forceFill(['first_name' => 'Maria', 'last_name' => 'Santos', 'position' => 'administrative_aide'])->save();
        $earlier = ActivityLog::create([
            'user_type' => Administrator::class, 'user_id' => $staff->admin_id,
            'action' => 'approved_employer', 'description' => 'Approved an employer.',
        ]);

        $this->deleteJson("/api/admin/staff/{$staff->admin_id}")->assertOk();

        $logs = collect([$earlier->fresh()]);
        ActivityLog::hydrateActorNames($logs);
        $this->assertSame('Maria Santos', $logs->first()->actor_name);
        $this->assertSame('Former Administrative Aide (account deleted)', $logs->first()->actor_role);
    }

    public function test_the_system_administrator_cannot_delete_themselves(): void
    {
        $admin = $this->makeAdmin('sleo@peso.test');
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/staff/{$admin->admin_id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'You cannot delete your own account.');

        $this->assertNotSoftDeleted('administrators', ['admin_id' => $admin->admin_id]);
    }

    // ── Lock-out protection ─────────────────────────────────────────────────

    public function test_the_system_administrator_cannot_deactivate_or_demote_themselves(): void
    {
        $admin = $this->makeAdmin('sleo@peso.test');
        $this->makeAdmin('backup@peso.test');
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/staff/{$admin->admin_id}/deactivate")
            ->assertStatus(422)
            ->assertJsonPath('message', 'You cannot deactivate your own account.');

        $this->putJson("/api/admin/staff/{$admin->admin_id}", ['position' => 'administrative_aide'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'You cannot change your own position.');
    }

    public function test_an_office_can_never_end_up_without_an_active_system_administrator(): void
    {
        $sleo = $this->makeAdmin('sleo@peso.test');
        $backup = $this->makeAdmin('backup@peso.test');
        Sanctum::actingAs($sleo);

        // With two administrators, one may deactivate the other...
        $this->postJson("/api/admin/staff/{$backup->admin_id}/deactivate")->assertOk();

        // ...but the one left can't remove their own access.
        $this->postJson("/api/admin/staff/{$sleo->admin_id}/deactivate")->assertStatus(422);
        $this->putJson("/api/admin/staff/{$sleo->admin_id}", ['position' => 'administrative_aide'])->assertStatus(422);

        $this->assertSame(
            1,
            Administrator::where('role', 'administrator')->where('status', 'active')->count()
        );
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function makeAdmin(string $email): Administrator
    {
        return $this->makeAccount($email, $this->adminRole, 'active');
    }

    private function makeStaff(string $email, string $status = 'active'): Administrator
    {
        return $this->makeAccount($email, $this->staffRole, $status);
    }

    private function makeAccount(string $email, AdminRole $role, string $status): Administrator
    {
        return Administrator::create([
            'first_name' => 'Test',
            'last_name' => 'Account',
            'email' => $email,
            'mobile_number' => '09171234567',
            'password' => 'password123',
            'role' => $role->slug,
            'admin_role_id' => $role->id,
            'status' => $status,
            'email_verified_at' => now(),
        ]);
    }

    private function newStaffPayload(): array
    {
        return [
            'first_name' => 'New',
            'last_name' => 'Aide',
            'email' => 'new.aide@peso.test',
            'mobile_number' => '09181234567',
            'position' => 'administrative_aide',
        ];
    }
}
