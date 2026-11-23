<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

/**
 * OJT interns: a limited login with school, course and internship dates; the account closes
 * itself after the end date. OJT hours (required hours, daily time in / out, approvals) are
 * not tracked since 2026-11-22.
 */
class OjtInternshipTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    /** @var array<string, AdminRole> */
    private array $roles = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();

        foreach ([
            'administrator' => [],
            'records-viewer' => ['configuration' => 'view', 'activity_logs' => 'view'],
            'ojt-intern' => ['employment_hub' => 'view'],
            'gip-beneficiary' => ['employment_hub' => 'view'],
        ] as $slug => $permissions) {
            $this->roles[$slug] = AdminRole::create(['name' => ucfirst($slug), 'slug' => $slug, 'permissions' => $permissions, 'is_system' => true]);
        }

        // 9:00 AM on Tuesday, Nov 10, 2026 in the Philippines. Given as UTC like
        // production's clock: a test clock in another timezone makes Carbon read
        // stored timestamps in that timezone too.
        Carbon::setTestNow(Carbon::parse('2026-11-10 09:00:00', 'Asia/Manila')->utc());
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    // ── Adding an intern ────────────────────────────────────────────────────

    public function test_adding_an_intern_needs_no_school_or_dates(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));

        $this->postJson('/api/admin/staff', [
            'first_name' => 'Ana', 'last_name' => 'Reyes', 'email' => 'ana@school.test', 'mobile_number' => '09171234567', 'position' => 'ojt_intern',
        ])
            ->assertCreated()
            ->assertJsonPath('staff.role.slug', 'ojt-intern')
            ->assertJsonPath('staff.internship.school', null)
            ->assertJsonPath('staff.internship.end_date', null);
    }

    public function test_editing_keeps_an_old_start_date_but_rejects_a_new_old_one(): void
    {
        $intern = $this->intern(['ojt_start_date' => '2026-09-01', 'ojt_end_date' => '2026-12-15']);
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));

        // Unchanged (even though it's now more than 30 days back): fine.
        $this->putJson("/api/admin/staff/{$intern->admin_id}", ['ojt_start_date' => '2026-09-01', 'ojt_end_date' => '2026-12-20'])->assertOk();

        $this->putJson("/api/admin/staff/{$intern->admin_id}", ['ojt_start_date' => '2026-09-15'])
            ->assertStatus(422)->assertJsonValidationErrors('ojt_start_date');
    }

    public function test_moving_someone_into_the_intern_position_needs_no_details(): void
    {
        $aide = $this->account('aide@peso.test', 'administrative_aide', 'records-viewer');
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));

        $this->putJson("/api/admin/staff/{$aide->admin_id}", ['position' => 'ojt_intern'])
            ->assertOk()
            ->assertJsonPath('staff.position', 'ojt_intern');
    }

    // ── No hours tracking ───────────────────────────────────────────────────

    public function test_the_time_record_and_hours_review_are_gone(): void
    {
        $intern = $this->intern();

        Sanctum::actingAs($intern);
        $this->getJson('/api/admin/ojt/me')->assertNotFound();
        $this->postJson('/api/admin/ojt/me/time-in')->assertNotFound();

        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));
        $this->getJson('/api/admin/ojt/interns')->assertNotFound();
        $this->getJson("/api/admin/ojt/interns/{$intern->admin_id}/logs")->assertNotFound();
    }

    public function test_the_migration_deletes_the_recorded_hours(): void
    {
        $this->assertFalse(Schema::hasTable('ojt_time_logs'));
        $this->assertFalse(Schema::hasColumn('administrators', 'ojt_required_hours'));

        // On a database that still has them, the migration removes both.
        Schema::create('ojt_time_logs', fn ($table) => $table->id());
        DB::table('ojt_time_logs')->insert(['id' => 1]);
        Schema::table('administrators', fn ($table) => $table->unsignedSmallInteger('ojt_required_hours')->nullable());

        (require database_path('migrations/2026_11_22_000001_remove_ojt_hours_tracking.php'))->up();

        $this->assertFalse(Schema::hasTable('ojt_time_logs'));
        $this->assertFalse(Schema::hasColumn('administrators', 'ojt_required_hours'));
    }

    // ── End of the internship ───────────────────────────────────────────────

    public function test_the_account_closes_after_the_end_date_and_can_be_extended(): void
    {
        $finished = $this->intern(['ojt_end_date' => '2026-11-09'], 'done@school.test');
        $finished->createToken('web');
        $lastDay = $this->intern(['ojt_end_date' => '2026-11-10'], 'today@school.test');

        Artisan::call('ojt:end-internships');

        $this->assertSame('inactive', $finished->fresh()->status);
        $this->assertSame('internship_ended', $finished->fresh()->deactivated_reason);
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $finished->admin_id)->count());
        $this->assertSame('active', $lastDay->fresh()->status, 'Their last day is still a working day.');
        $this->assertDatabaseHas('activity_logs', ['action' => 'internship_ended']);

        $this->postJson('/api/auth/login', ['email' => 'done@school.test', 'password' => 'password123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Your internship ended on November 9, 2026, so this account is now closed. Thank you for your service to PESO Urdaneta.');

        $admin = $this->account('sleo@peso.test', 'peso_office_manager', 'administrator');
        Sanctum::actingAs($admin);

        $staff = collect($this->getJson('/api/admin/staff')->json('data'))->firstWhere('email', 'done@school.test');
        $this->assertSame('internship_ended', $staff['account_status']);

        // Reactivating clears the past end date, so the nightly run doesn't close it again.
        $this->postJson("/api/admin/staff/{$finished->admin_id}/reactivate")->assertOk()->assertJsonPath('staff.account_status', 'active');
        $this->assertNull($finished->fresh()->deactivated_reason);
        $this->assertNull($finished->fresh()->ojt_end_date);
        Artisan::call('ojt:end-internships');
        $this->assertSame('active', $finished->fresh()->status);
        $this->assertDatabaseHas('activity_logs', ['action' => 'reactivated_staff', 'description' => 'Reactivated staff account '.$staff['name'].' (done@school.test). The placement end date (Nov 9, 2026) was cleared.']);
    }

    // ── GIP beneficiaries ───────────────────────────────────────────────────

    public function test_adding_or_moving_someone_to_gip_needs_no_dates(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));

        $this->postJson('/api/admin/staff', [
            'first_name' => 'Ben', 'last_name' => 'Cruz', 'email' => 'ben@gip.test', 'mobile_number' => '09171234567', 'position' => 'gip_beneficiary',
        ])
            ->assertCreated()
            ->assertJsonPath('staff.position_label', 'GIP Beneficiary')
            ->assertJsonPath('staff.role.slug', 'gip-beneficiary')
            ->assertJsonPath('staff.internship.start_date', null);

        $aide = $this->account('aide@peso.test', 'administrative_aide', 'records-viewer');
        $this->putJson("/api/admin/staff/{$aide->admin_id}", ['position' => 'gip_beneficiary'])->assertOk();
    }

    public function test_a_gip_account_closes_after_its_end_date(): void
    {
        $gip = $this->account('done@gip.test', 'gip_beneficiary', 'gip-beneficiary', ['ojt_start_date' => '2026-05-11', 'ojt_end_date' => '2026-11-09']);

        Artisan::call('ojt:end-internships');

        $this->assertSame('internship_ended', $gip->fresh()->deactivated_reason);
        $this->assertDatabaseHas('activity_logs', ['action' => 'internship_ended', 'description' => 'GIP placement ended on Nov 9, 2026; the account was closed automatically.']);
        $this->postJson('/api/auth/login', ['email' => 'done@gip.test', 'password' => 'password123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Your GIP placement ended on November 9, 2026, so this account is now closed. Thank you for your service to PESO Urdaneta.');
    }

    public function test_the_org_chart_lists_the_gip_position_beside_ojt(): void
    {
        $this->account('ben@gip.test', 'gip_beneficiary', 'gip-beneficiary', ['ojt_start_date' => '2026-11-03', 'ojt_end_date' => '2027-05-01']);
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));

        $positions = collect($this->getJson('/api/admin/staff/org-chart')->assertOk()->json('positions'))->keyBy('value');
        $this->assertSame('Government Internship Program (GIP) Beneficiary', $positions['gip_beneficiary']['title']);
        $this->assertSame('peso_office_manager', $positions['gip_beneficiary']['reports_to']);
        $this->assertCount(1, $positions['gip_beneficiary']['members']);
    }

    public function test_the_migration_adds_the_gip_role_with_the_ojt_role_access(): void
    {
        DB::table('admin_roles')->where('slug', 'gip-beneficiary')->delete();
        $this->roles['ojt-intern']->update(['permissions' => ['employment_hub' => 'view', 'government_dole' => 'view']]);

        $migration = require database_path('migrations/2026_11_22_000002_add_gip_beneficiary_role.php');
        $migration->up();
        $migration->up(); // safe to run twice

        $role = AdminRole::where('slug', 'gip-beneficiary')->sole();
        $this->assertSame('GIP Beneficiary', $role->name);
        $this->assertSame(['employment_hub' => 'view', 'government_dole' => 'view'], $role->permissions);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function intern(array $overrides = [], string $email = 'intern@school.test'): Administrator
    {
        return $this->account($email, 'ojt_intern', 'ojt-intern', array_merge([
            'ojt_school' => 'Pangasinan State University',
            'ojt_start_date' => '2026-11-03',
            'ojt_end_date' => '2027-01-29',
        ], $overrides));
    }

    private function account(string $email, string $position, string $roleSlug, array $extra = []): Administrator
    {
        return Administrator::forceCreate(array_merge([
            'first_name' => 'Test', 'last_name' => 'Person', 'email' => $email,
            'mobile_number' => '09171234567', 'password' => 'password123',
            'position' => $position, 'role' => $roleSlug, 'admin_role_id' => $this->roles[$roleSlug]->id,
            'status' => 'active', 'email_verified_at' => now(),
        ], $extra));
    }
}
