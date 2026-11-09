<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Maps PESO Urdaneta's org chart into staff management:
 *  - staff get a position (their box on the chart) plus basic HR details,
 *  - role permissions move from a plain module list to view/full access
 *    per module,
 *  - the default roles for each position are added,
 *  - existing system administrators are placed in the Special Law
 *    Enforcement Officer position (the office's system administrator).
 */
return new class extends Migration
{
    private const ALL_MODULES = [
        'constituent_crm', 'employment_hub', 'government_dole',
        'system_reports', 'activity_logs', 'configuration',
    ];

    public function up(): void
    {
        Schema::table('administrators', function (Blueprint $table) {
            if (! Schema::hasColumn('administrators', 'position')) {
                $table->string('position', 60)->nullable()->after('department');
            }
            if (! Schema::hasColumn('administrators', 'middle_name')) {
                $table->string('middle_name', 100)->nullable()->after('first_name');
            }
            if (! Schema::hasColumn('administrators', 'suffix')) {
                $table->string('suffix', 20)->nullable()->after('last_name');
            }
            if (! Schema::hasColumn('administrators', 'employee_no')) {
                $table->string('employee_no', 50)->nullable();
            }
            if (! Schema::hasColumn('administrators', 'employment_type')) {
                $table->string('employment_type', 40)->nullable();
            }
            if (! Schema::hasColumn('administrators', 'date_started')) {
                $table->date('date_started')->nullable();
            }
        });

        // Old format: ["employment_hub", ...] meaning full access to each.
        foreach (DB::table('admin_roles')->get(['id', 'permissions']) as $role) {
            $permissions = json_decode((string) $role->permissions, true) ?: [];

            if (array_is_list($permissions)) {
                DB::table('admin_roles')->where('id', $role->id)->update([
                    'permissions' => json_encode((object) array_fill_keys($permissions, 'manage')),
                ]);
            }
        }

        DB::table('admin_roles')->where('slug', 'administrator')->update([
            'name' => 'System Administrator',
            'permissions' => json_encode(array_fill_keys(self::ALL_MODULES, 'manage')),
            'updated_at' => now(),
        ]);

        $defaults = [
            'office-manager' => ['PESO Office Manager', [
                'constituent_crm' => 'manage', 'employment_hub' => 'manage',
                'government_dole' => 'manage', 'system_reports' => 'manage',
                'activity_logs' => 'view', 'configuration' => 'view',
            ]],
            'administrative-aide' => ['Administrative Aide', [
                'constituent_crm' => 'manage', 'employment_hub' => 'manage',
                'government_dole' => 'manage', 'system_reports' => 'manage',
            ]],
            'ojt-intern' => ['OJT Intern', [
                'constituent_crm' => 'view', 'employment_hub' => 'view',
            ]],
        ];

        foreach ($defaults as $slug => [$name, $permissions]) {
            if (DB::table('admin_roles')->where('slug', $slug)->exists()) {
                continue;
            }

            DB::table('admin_roles')->insert([
                'name' => $name,
                'slug' => $slug,
                'permissions' => json_encode($permissions),
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('administrators')
            ->where('role', 'administrator')
            ->whereNull('position')
            ->update(['position' => 'special_law_enforcement_officer']);
    }

    public function down(): void
    {
        DB::table('admin_roles')->whereIn('slug', ['office-manager', 'administrative-aide', 'ojt-intern'])
            ->whereNotIn('id', DB::table('administrators')->whereNotNull('admin_role_id')->select('admin_role_id'))
            ->delete();

        DB::table('admin_roles')->where('slug', 'administrator')->update(['name' => 'Administrator']);

        foreach (DB::table('admin_roles')->get(['id', 'permissions']) as $role) {
            $permissions = json_decode((string) $role->permissions, true) ?: [];

            if (! array_is_list($permissions)) {
                $modules = array_values(array_diff(array_keys($permissions), ['activity_logs']));
                DB::table('admin_roles')->where('id', $role->id)->update(['permissions' => json_encode($modules)]);
            }
        }

        Schema::table('administrators', function (Blueprint $table) {
            $table->dropColumn(['position', 'middle_name', 'suffix', 'employee_no', 'employment_type', 'date_started']);
        });
    }
};
