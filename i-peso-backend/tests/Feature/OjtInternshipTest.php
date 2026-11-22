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

    public function test_adding_an_intern_requires_school_and_dates_but_no_hours(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));

        $base = ['first_name' => 'Ana', 'last_name' => 'Reyes', 'email' => 'ana@school.test', 'mobile_number' => '09171234567', 'position' => 'ojt_intern'];

        $this->postJson('/api/admin/staff', $base)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ojt_school', 'ojt_start_date', 'ojt_end_date'])
            ->assertJsonMissingValidationErrors('ojt_required_hours');

        $this->postJson('/api/admin/staff', $base + [
            'ojt_school' => 'Pangasinan State University', 'ojt_course' => 'BS Information Technology',
            'ojt_start_date' => '2026-11-03', 'ojt_end_date' => '2026-11-02',
        ])->assertStatus(422)->assertJsonPath('errors.ojt_end_date.0', 'The end date must be on or after the start date.');

        // An hours value from an old form is simply ignored.
        $this->postJson('/api/admin/staff', $base + [
            'ojt_school' => 'Pangasinan State University', 'ojt_course' => 'BS Information Technology',
            'ojt_required_hours' => 486, 'ojt_start_date' => '2026-11-03', 'ojt_end_date' => '2027-01-29',
        ])
            ->assertCreated()
            ->assertJsonPath('staff.internship.school', 'Pangasinan State University')
            ->assertJsonPath('staff.internship.end_date', '2027-01-29')
            ->assertJsonMissingPath('staff.internship.required_hours')
            ->assertJsonPath('staff.role.slug', 'ojt-intern');
    }

    public function test_a_new_interns_start_date_can_be_at_most_30_days_back(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));
        $base = [
            'first_name' => 'Ana', 'last_name' => 'Reyes', 'mobile_number' => '09171234567', 'position' => 'ojt_intern',
            'ojt_school' => 'PSU', 'ojt_end_date' => '2027-02-08',
        ];

        // Test clock: Nov 10, 2026 → earliest allowed start is Oct 11.
        $this->postJson('/api/admin/staff', $base + ['email' => 'old@school.test', 'ojt_start_date' => '2026-10-10'])
            ->assertStatus(422)
            ->assertJsonPath('errors.ojt_start_date.0', "The start date can't be more than 30 days ago.");

        $this->postJson('/api/admin/staff', $base + ['email' => 'ok@school.test', 'ojt_start_date' => '2026-10-11'])->assertCreated();
        $this->postJson('/api/admin/staff', $base + ['email' => 'future@school.test', 'ojt_start_date' => '2026-12-01'])->assertCreated();
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

    public function test_moving_someone_into_the_intern_position_needs_internship_details(): void
    {
        $aide = $this->account('aide@peso.test', 'administrative_aide', 'records-viewer');
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));

        $this->putJson("/api/admin/staff/{$aide->admin_id}", ['position' => 'ojt_intern'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ojt_school', 'ojt_start_date', 'ojt_end_date'])
            ->assertJsonMissingValidationErrors('ojt_required_hours');
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

        $this->postJson("/api/admin/staff/{$finished->admin_id}/reactivate")
            ->assertStatus(422)
            ->assertJsonPath('message', 'This internship has already ended. Edit the internship end date first, then reactivate.');

        $this->putJson("/api/admin/staff/{$finished->admin_id}", ['ojt_end_date' => '2026-11-20'])->assertOk();
        $this->postJson("/api/admin/staff/{$finished->admin_id}/reactivate")->assertOk()->assertJsonPath('staff.account_status', 'active');
        $this->assertNull($finished->fresh()->deactivated_reason);
    }

    // ── GIP beneficiaries ───────────────────────────────────────────────────

    public function test_adding_a_gip_beneficiary_needs_only_the_placement_dates(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));
        $base = ['first_name' => 'Ben', 'last_name' => 'Cruz', 'email' => 'ben@gip.test', 'mobile_number' => '09171234567', 'position' => 'gip_beneficiary'];

        $this->postJson('/api/admin/staff', $base)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ojt_start_date', 'ojt_end_date'])
            ->assertJsonMissingValidationErrors('ojt_school');

        $this->postJson('/api/admin/staff', $base + ['ojt_start_date' => '2026-11-16', 'ojt_end_date' => '2027-05-14'])
            ->assertCreated()
            ->assertJsonPath('staff.position', 'gip_beneficiary')
            ->assertJsonPath('staff.position_label', 'GIP Beneficiary')
            ->assertJsonPath('staff.role.slug', 'gip-beneficiary')
            ->assertJsonPath('staff.internship.start_date', '2026-11-16')
            ->assertJsonPath('staff.internship.end_date', '2027-05-14')
            ->assertJsonPath('staff.internship.school', null);
    }

    public function test_moving_someone_into_the_gip_position_needs_the_dates(): void
    {
        $aide = $this->account('aide@peso.test', 'administrative_aide', 'records-viewer');
        Sanctum::actingAs($this->account('sleo@peso.test', 'peso_office_manager', 'administrator'));

        $this->putJson("/api/admin/staff/{$aide->admin_id}", ['position' => 'gip_beneficiary'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ojt_start_date', 'ojt_end_date'])
            ->assertJsonMissingValidationErrors('ojt_school');
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
