<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class OfficeManagerRemapMigrationTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    private int $adminRoleId;

    private int $oldManagerRoleId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();
        $this->adminRoleId = DB::table('admin_roles')->insertGetId(['name' => 'System Administrator', 'slug' => 'administrator', 'permissions' => '{}', 'is_system' => true]);
        $this->oldManagerRoleId = DB::table('admin_roles')->insertGetId(['name' => 'PESO Office Manager', 'slug' => 'office-manager', 'permissions' => '{"activity_logs":"view"}', 'is_system' => true]);
    }

    private function run_migration(): void
    {
        (require database_path('migrations/2026_11_11_000002_make_office_manager_the_system_administrator.php'))->up();
    }

    private function account(string $email, string $position, string $role, ?int $roleId): int
    {
        return DB::table('administrators')->insertGetId([
            'first_name' => 'T', 'last_name' => 'P', 'email' => $email, 'password' => 'x',
            'position' => $position, 'role' => $role, 'admin_role_id' => $roleId, 'status' => 'active',
        ]);
    }

    public function test_the_admin_moves_to_office_manager_and_sleo_becomes_regular_staff(): void
    {
        $admin = $this->account('pesourdaneta@gmail.com', 'special_law_enforcement_officer', 'administrator', $this->adminRoleId);
        $sleo = $this->account('sleo@peso.test', 'special_law_enforcement_officer', 'administrative-aide', null);

        $this->run_migration();
        $this->run_migration(); // safe to repeat

        $adminRow = DB::table('administrators')->where('admin_id', $admin)->first();
        $this->assertSame('peso_office_manager', $adminRow->position);
        $this->assertSame('administrator', $adminRow->role);

        $sleoRow = DB::table('administrators')->where('admin_id', $sleo)->first();
        $this->assertSame('law-enforcement-officer', $sleoRow->role);
        $this->assertSame(
            ['constituent_crm' => 'manage', 'employment_hub' => 'manage', 'government_dole' => 'manage', 'system_reports' => 'manage'],
            json_decode(DB::table('admin_roles')->where('slug', 'law-enforcement-officer')->value('permissions'), true)
        );

        $this->assertFalse(DB::table('admin_roles')->where('slug', 'office-manager')->exists(), 'The unused old role is removed.');
        $this->assertSame(1, DB::table('admin_roles')->where('slug', 'law-enforcement-officer')->count());
    }

    public function test_someone_already_in_the_office_manager_position_becomes_an_administrator(): void
    {
        $manager = $this->account('manager@peso.test', 'peso_office_manager', 'office-manager', $this->oldManagerRoleId);

        $this->run_migration();

        $row = DB::table('administrators')->where('admin_id', $manager)->first();
        $this->assertSame('administrator', $row->role);
        $this->assertSame($this->adminRoleId, (int) $row->admin_role_id);
    }
}
