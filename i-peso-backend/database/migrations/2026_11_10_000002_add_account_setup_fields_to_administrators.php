<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Staff receive a temporary password by email and must replace it on first
 * sign-in. Existing accounts keep working as they are (must_change_password
 * defaults to false).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('administrators', function (Blueprint $table) {
            if (! Schema::hasColumn('administrators', 'must_change_password')) {
                $table->boolean('must_change_password')->default(false);
            }
            if (! Schema::hasColumn('administrators', 'temporary_password_expires_at')) {
                $table->timestamp('temporary_password_expires_at')->nullable();
            }
            if (! Schema::hasColumn('administrators', 'invited_at')) {
                $table->timestamp('invited_at')->nullable();
            }
            if (! Schema::hasColumn('administrators', 'password_changed_at')) {
                $table->timestamp('password_changed_at')->nullable();
            }
            if (! Schema::hasColumn('administrators', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('administrators', function (Blueprint $table) {
            $table->dropColumn([
                'must_change_password', 'temporary_password_expires_at',
                'invited_at', 'password_changed_at', 'last_login_at',
            ]);
        });
    }
};
