<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 60)->unique();
            $table->json('permissions');
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::table('administrators', function (Blueprint $table) {
            $table->unsignedBigInteger('admin_role_id')->nullable()->after('role');
            $table->string('department', 100)->nullable()->after('admin_role_id');

            $table->foreign('admin_role_id')->references('id')->on('admin_roles')->nullOnDelete();
        });

        $modules = ['constituent_crm', 'employment_hub', 'government_dole', 'system_reports', 'configuration'];

        $administratorRoleId = DB::table('admin_roles')->insertGetId([
            'name' => 'Administrator',
            'slug' => 'administrator',
            'permissions' => json_encode($modules),
            'is_system' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('admin_roles')->insert([
            'name' => 'Staff',
            'slug' => 'staff',
            'permissions' => json_encode([]),
            'is_system' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Every administrator account that predates this migration was, by
        // definition, a full administrator (the app had no other tier).
        DB::table('administrators')->update(['admin_role_id' => $administratorRoleId]);
    }

    public function down(): void
    {
        Schema::table('administrators', function (Blueprint $table) {
            $table->dropForeign(['admin_role_id']);
            $table->dropColumn(['admin_role_id', 'department']);
        });

        Schema::dropIfExists('admin_roles');
    }
};
