<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Access role for the new "GIP Beneficiary" position (DOLE Government Internship Program).
 * Starts with the same view-only access as OJT interns (copied from the office's current
 * OJT Intern role, so any change the admin made there carries over); the system
 * administrator can widen it per module on the Roles & Permissions screen.
 */
return new class extends Migration
{
    private const SLUG = 'gip-beneficiary';

    public function up(): void
    {
        if (! Schema::hasTable('admin_roles') || DB::table('admin_roles')->where('slug', self::SLUG)->exists()) {
            return;
        }

        $permissions = DB::table('admin_roles')->where('slug', 'ojt-intern')->value('permissions')
            ?? json_encode(['constituent_crm' => 'view', 'employment_hub' => 'view']);

        DB::table('admin_roles')->insert([
            'name' => 'GIP Beneficiary',
            'slug' => self::SLUG,
            'permissions' => $permissions,
            'is_system' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('admin_roles')) {
            return;
        }

        $roleId = DB::table('admin_roles')->where('slug', self::SLUG)->value('id');
        // Only when nobody holds it any more.
        if ($roleId && ! DB::table('administrators')->where('admin_role_id', $roleId)->exists()) {
            DB::table('admin_roles')->where('id', $roleId)->delete();
        }
    }
};
