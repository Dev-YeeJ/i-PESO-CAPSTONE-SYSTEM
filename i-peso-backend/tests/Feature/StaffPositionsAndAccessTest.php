<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\AdminRole;
use App\Models\Administrator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class StaffPositionsAndAccessTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    /** @var array<string, AdminRole> */
    private array $roles = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();

        // Same defaults the migration seeds.
        foreach ([
            'administrator' => ['System Administrator', []],
            'office-manager' => ['PESO Office Manager', [
                'constituent_crm' => 'manage', 'employment_hub' => 'manage', 'government_dole' => 'manage',
                'system_reports' => 'manage', 'activity_logs' => 'view', 'configuration' => 'view',
            ]],
            'administrative-aide' => ['Administrative Aide', [
                'constituent_crm' => 'manage', 'employment_hub' => 'manage',
                'government_dole' => 'manage', 'system_reports' => 'manage',
            ]],
            'ojt-intern' => ['OJT Intern', ['constituent_crm' => 'view', 'employment_hub' => 'view']],
        ] as $slug => [$name, $permissions]) {
            $this->roles[$slug] = AdminRole::create([
                'name' => $name, 'slug' => $slug, 'permissions' => $permissions, 'is_system' => true,
            ]);
        }

        // Stand-in endpoints, so the access rules are tested without the
        // tables behind real admin pages.
        Route::middleware(['api', 'auth:sanctum', 'admin', 'admin.permission:employment_hub'])
            ->prefix('api/test-access')
            ->group(function () {
                Route::get('/hub', fn () => ['ok' => true]);
                Route::post('/hub', fn () => ['ok' => true]);
                Route::post('/hub/download', fn () => ['ok' => true])
                    ->withoutMiddleware('admin.permission:employment_hub')
                    ->middleware('admin.permission:employment_hub,view');
            });
    }

    // ── View vs. full access ────────────────────────────────────────────────

    public function test_a_view_only_intern_can_read_but_not_change_anything(): void
    {
        Sanctum::actingAs($this->account('intern@peso.test', 'ojt_intern', 'ojt-intern'));

        $this->getJson('/api/test-access/hub')->assertOk();
        $this->postJson('/api/test-access/hub/download')->assertOk();

        $this->postJson('/api/test-access/hub')
            ->assertForbidden()
            ->assertJsonPath('message', 'Your account can only view this section.');
    }

    public function test_full_access_can_change_data(): void
    {
        Sanctum::actingAs($this->account('aide@peso.test', 'administrative_aide', 'administrative-aide'));

        $this->postJson('/api/test-access/hub')->assertOk();
    }

    public function test_a_module_without_access_is_blocked_entirely(): void
    {
        $this->roles['ojt-intern']->update(['permissions' => ['constituent_crm' => 'view']]);
        Sanctum::actingAs($this->account('intern@peso.test', 'ojt_intern', 'ojt-intern'));

        $this->getJson('/api/test-access/hub')
            ->assertForbidden()
            ->assertJsonPath('message', 'Your account does not have access to this section.');
    }

    public function test_old_style_role_lists_still_mean_full_access(): void
    {
        $role = new AdminRole(['slug' => 'legacy', 'permissions' => ['employment_hub']]);

        $this->assertSame('manage', $role->accessLevel('employment_hub'));
        $this->assertSame('none', $role->accessLevel('configuration'));
    }

    // ── Activity log is its own module ──────────────────────────────────────

    public function test_aides_cannot_open_the_activity_log_but_the_office_manager_can(): void
    {
        Sanctum::actingAs($this->account('aide@peso.test', 'administrative_aide', 'administrative-aide'));
        $this->getJson('/api/admin/activity-logs')->assertForbidden();

        Sanctum::actingAs($this->account('manager@peso.test', 'peso_office_manager', 'office-manager'));
        $this->getJson('/api/admin/activity-logs')->assertOk();
    }

    // ── Office Manager: sees staff, can't manage them ───────────────────────

    public function test_the_office_manager_can_view_staff_but_not_add_them(): void
    {
        Sanctum::actingAs($this->account('manager@peso.test', 'peso_office_manager', 'office-manager'));

        $this->getJson('/api/admin/staff')->assertOk()->assertJsonPath('positions.0.value', 'peso_office_manager');
        $this->getJson('/api/admin/staff/org-chart')->assertOk();

        $this->postJson('/api/admin/staff', $this->newStaff())
            ->assertForbidden()
            ->assertJsonPath('message', 'Only the system administrator can manage staff accounts.');
    }

    // ── Adding staff with a position ────────────────────────────────────────

    public function test_picking_a_position_assigns_its_default_role(): void
    {
        Sanctum::actingAs($this->systemAdmin());

        $this->postJson('/api/admin/staff', $this->newStaff([
            'position' => 'ojt_intern', 'email' => 'Intern.One@Peso.test',
            'ojt_school' => 'Urdaneta City University', 'ojt_required_hours' => 300,
            'ojt_start_date' => '2026-11-03', 'ojt_end_date' => '2027-01-29',
        ]))
            ->assertCreated()
            ->assertJsonPath('staff.email', 'intern.one@peso.test')
            ->assertJsonPath('staff.position_label', 'OJT / Intern')
            ->assertJsonPath('staff.role.slug', 'ojt-intern')
            ->assertJsonPath('staff.access', ['constituent_crm' => 'view', 'employment_hub' => 'view']);

        $this->assertStringContainsString(
            'as OJT / Intern.',
            ActivityLog::where('action', 'created_staff')->value('description')
        );
    }

    public function test_the_position_alone_decides_access(): void
    {
        Sanctum::actingAs($this->systemAdmin());

        // A role sent by an old client is ignored: the position decides.
        $created = $this->postJson('/api/admin/staff', $this->newStaff([
            'position' => 'administrative_aide',
            'admin_role_id' => $this->roles['office-manager']->id,
        ]))
            ->assertCreated()
            ->assertJsonPath('staff.role.slug', 'administrative-aide');

        // Moving them to another position brings that position's access.
        $this->putJson('/api/admin/staff/'.$created->json('staff.id'), ['position' => 'peso_office_manager'])
            ->assertOk()
            ->assertJsonPath('staff.position', 'peso_office_manager')
            ->assertJsonPath('staff.role.slug', 'office-manager')
            ->assertJsonPath('staff.access.activity_logs', 'view');
    }

    public function test_an_email_used_by_a_seeker_or_employer_is_rejected(): void
    {
        Sanctum::actingAs($this->systemAdmin());
        DB::table('job_seekers')->insert(['email' => 'taken@peso.test', 'created_at' => now(), 'updated_at' => now()]);

        $this->postJson('/api/admin/staff', $this->newStaff(['email' => 'taken@peso.test']))
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'This email is already used by another account.');
    }

    public function test_position_is_required(): void
    {
        Sanctum::actingAs($this->systemAdmin());

        $this->postJson('/api/admin/staff', $this->newStaff(['position' => null]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('position');
    }

    public function test_the_org_chart_groups_active_staff_by_position(): void
    {
        $admin = $this->systemAdmin();
        $this->account('aide1@peso.test', 'administrative_aide', 'administrative-aide');
        $this->account('aide2@peso.test', 'administrative_aide', 'administrative-aide');
        $this->account('gone@peso.test', 'administrative_aide', 'administrative-aide', 'inactive');
        Sanctum::actingAs($admin);

        $positions = collect($this->getJson('/api/admin/staff/org-chart')->assertOk()->json('positions'))->keyBy('value');

        $this->assertCount(2, $positions['administrative_aide']['members']);
        $this->assertCount(1, $positions['special_law_enforcement_officer']['members']);
        $this->assertSame('peso_office_manager', $positions['administrative_aide']['reports_to']);
    }

    // ── Editing roles ───────────────────────────────────────────────────────

    public function test_role_access_is_saved_per_module_and_logged(): void
    {
        Sanctum::actingAs($this->systemAdmin());
        $intern = $this->roles['ojt-intern'];

        $this->putJson("/api/admin/roles/{$intern->id}", ['permissions' => [
            'employment_hub' => 'view', 'government_dole' => 'view', 'constituent_crm' => 'none',
        ]])
            ->assertOk()
            ->assertJsonPath('role.access.employment_hub', 'view')
            ->assertJsonPath('role.access.government_dole', 'view')
            ->assertJsonPath('role.access.constituent_crm', 'none');

        $this->assertStringContainsString(
            'Employment Hub (view only), Government & DOLE (view only)',
            ActivityLog::where('action', 'updated_role_permissions')->value('description')
        );
    }

    public function test_invalid_modules_and_levels_are_rejected(): void
    {
        Sanctum::actingAs($this->systemAdmin());
        $intern = $this->roles['ojt-intern'];

        $this->putJson("/api/admin/roles/{$intern->id}", ['permissions' => ['payroll' => 'view']])
            ->assertStatus(422)->assertJsonValidationErrors('permissions.payroll');

        $this->putJson("/api/admin/roles/{$intern->id}", ['permissions' => ['employment_hub' => 'owner']])
            ->assertStatus(422)->assertJsonValidationErrors('permissions.employment_hub');
    }

    public function test_the_system_administrator_role_cannot_be_narrowed(): void
    {
        Sanctum::actingAs($this->systemAdmin());

        $this->putJson("/api/admin/roles/{$this->roles['administrator']->id}", ['permissions' => []])
            ->assertStatus(422)
            ->assertJsonPath('message', 'The System Administrator always has full access.');
    }

    public function test_sign_in_returns_position_and_access_levels(): void
    {
        $this->account('intern@peso.test', 'ojt_intern', 'ojt-intern');

        $this->postJson('/api/auth/login', ['email' => 'intern@peso.test', 'password' => 'password123'])
            ->assertOk()
            ->assertJsonPath('user.position', 'ojt_intern')
            ->assertJsonPath('user.position_label', 'OJT / Intern')
            ->assertJsonPath('user.access', ['constituent_crm' => 'view', 'employment_hub' => 'view']);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function systemAdmin(): Administrator
    {
        return $this->account('sleo@peso.test', 'special_law_enforcement_officer', 'administrator');
    }

    private function account(string $email, string $position, string $roleSlug, string $status = 'active'): Administrator
    {
        return Administrator::create([
            'first_name' => 'Test',
            'last_name' => 'Account',
            'email' => $email,
            'mobile_number' => '09171234567',
            'password' => 'password123',
            'position' => $position,
            'role' => $roleSlug,
            'admin_role_id' => $this->roles[$roleSlug]->id,
            'status' => $status,
            'email_verified_at' => now(),
        ]);
    }

    private function newStaff(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'email' => 'maria.santos@peso.test',
            'mobile_number' => '09181234567',
            'position' => 'administrative_aide',
        ], $overrides);
    }
}
