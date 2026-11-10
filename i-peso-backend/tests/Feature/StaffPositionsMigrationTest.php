<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StaffPositionsMigrationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        // The shape production has before this migration runs.
        Schema::dropIfExists('administrators');
        Schema::dropIfExists('admin_roles');

        Schema::create('admin_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 60)->unique();
            $table->json('permissions');
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::create('administrators', function (Blueprint $table) {
            $table->id('admin_id');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role');
            $table->unsignedBigInteger('admin_role_id')->nullable();
            $table->string('department', 100)->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });
    }

    public function test_it_converts_permissions_adds_default_roles_and_places_the_admin(): void
    {
        $adminRoleId = DB::table('admin_roles')->insertGetId([
            'name' => 'Administrator', 'slug' => 'administrator', 'is_system' => true,
            'permissions' => json_encode(['constituent_crm', 'employment_hub', 'government_dole', 'system_reports', 'configuration']),
        ]);
        $customId = DB::table('admin_roles')->insertGetId([
            'name' => 'Front Desk', 'slug' => 'front-desk', 'is_system' => false,
            'permissions' => json_encode(['employment_hub']),
        ]);
        DB::table('administrators')->insert([
            'first_name' => 'PESO', 'last_name' => 'Admin', 'email' => 'pesourdaneta@gmail.com',
            'password' => 'x', 'role' => 'administrator', 'admin_role_id' => $adminRoleId,
        ]);

        $migration = require database_path('migrations/2026_11_10_000001_add_positions_and_access_levels_to_staff.php');
        $migration->up();

        $roles = DB::table('admin_roles')->get()->keyBy('slug');

        $this->assertSame('System Administrator', $roles['administrator']->name);
        $this->assertSame('manage', json_decode($roles['administrator']->permissions, true)['activity_logs']);
        $this->assertSame(['employment_hub' => 'manage'], json_decode($roles['front-desk']->permissions, true));
        $this->assertSame('view', json_decode($roles['office-manager']->permissions, true)['activity_logs']);
        $this->assertSame(['constituent_crm' => 'view', 'employment_hub' => 'view'], json_decode($roles['ojt-intern']->permissions, true));
        $this->assertArrayNotHasKey('activity_logs', json_decode($roles['administrative-aide']->permissions, true));

        $this->assertSame(
            'special_law_enforcement_officer',
            DB::table('administrators')->where('email', 'pesourdaneta@gmail.com')->value('position')
        );

        // Running it again changes nothing and adds no duplicate roles.
        $migration->up();
        $this->assertSame(5, DB::table('admin_roles')->count());
        $this->assertSame(['employment_hub' => 'manage'], json_decode(DB::table('admin_roles')->find($customId)->permissions, true));
    }
}
