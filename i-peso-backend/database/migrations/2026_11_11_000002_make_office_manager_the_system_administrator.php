<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Corrects the org chart mapping: the PESO Office Manager (City Government
 * Assistant Department Head, top of the chart) is the system administrator,
 * not the Special Law Enforcement Officer.
 *
 *  - System administrators placed in the SLEO position move to Office Manager.
 *  - Anyone in the Office Manager position becomes a system administrator.
 *  - The SLEO position gets its own role, starting with Administrative Aide
 *    access (adjustable on Roles & Permissions).
 *  - The old "PESO Office Manager" role is removed once nobody uses it.
 *
 * Safe to run more than once.
 */
return new class extends Migration
{
    private const OFFICE_MANAGER = 'peso_office_manager';

    private const SLEO = 'special_law_enforcement_officer';

    public function up(): void
    {
        $adminRoleId = DB::table('admin_roles')->where('slug', 'administrator')->value('id');
        if (! $adminRoleId) {
            Log::warning('Office manager remap skipped: the administrator role is missing.');

            return;
        }

        if (! DB::table('admin_roles')->where('slug', 'law-enforcement-officer')->exists()) {
            DB::table('admin_roles')->insert([
                'name' => 'Special Law Enforcement Officer',
                'slug' => 'law-enforcement-officer',
                'permissions' => json_encode([
                    'constituent_crm' => 'manage',
                    'employment_hub' => 'manage',
                    'government_dole' => 'manage',
                    'system_reports' => 'manage',
                ]),
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        $sleoRoleId = DB::table('admin_roles')->where('slug', 'law-enforcement-officer')->value('id');

        // The admin was put in the SLEO box; they belong at the top.
        DB::table('administrators')
            ->where('role', 'administrator')
            ->where('position', self::SLEO)
            ->update(['position' => self::OFFICE_MANAGER, 'updated_at' => now()]);

        // Whoever holds the Office Manager position runs the system.
        DB::table('administrators')
            ->where('position', self::OFFICE_MANAGER)
            ->update(['role' => 'administrator', 'admin_role_id' => $adminRoleId, 'updated_at' => now()]);

        DB::table('administrators')
            ->where('position', self::SLEO)
            ->update(['role' => 'law-enforcement-officer', 'admin_role_id' => $sleoRoleId, 'updated_at' => now()]);

        $oldRoleId = DB::table('admin_roles')->where('slug', 'office-manager')->value('id');
        if ($oldRoleId && ! DB::table('administrators')->where('admin_role_id', $oldRoleId)->exists()) {
            DB::table('admin_roles')->where('id', $oldRoleId)->delete();
        }
    }

    public function down(): void
    {
        // Not reversed: the previous mapping was wrong.
    }
};
