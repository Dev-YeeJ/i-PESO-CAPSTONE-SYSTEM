<?php

namespace Tests\Concerns;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The suite runs on an empty SQLite database; staff tests create what they touch. */
trait CreatesStaffTables
{
    protected function createStaffTables(): void
    {
        if (! Schema::hasTable('admin_roles')) {
            Schema::create('admin_roles', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->string('slug', 60)->unique();
                $table->json('permissions');
                $table->boolean('is_system')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('administrators')) {
            Schema::create('administrators', function (Blueprint $table) {
                $table->id('admin_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->unique();
                $table->string('mobile_number')->nullable();
                $table->string('password');
                $table->string('role');
                $table->unsignedBigInteger('admin_role_id')->nullable();
                $table->string('department', 100)->nullable();
                $table->string('position', 60)->nullable();
                $table->string('middle_name', 100)->nullable();
                $table->string('suffix', 20)->nullable();
                $table->string('employee_no', 50)->nullable();
                $table->string('employment_type', 40)->nullable();
                $table->date('date_started')->nullable();
                $table->boolean('must_change_password')->default(false);
                $table->timestamp('temporary_password_expires_at')->nullable();
                $table->timestamp('invited_at')->nullable();
                $table->timestamp('password_changed_at')->nullable();
                $table->timestamp('last_login_at')->nullable();
                $table->string('status')->default('active');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }

        foreach (['job_seekers' => 'seeker_id', 'employers' => 'employer_id'] as $name => $key) {
            if (! Schema::hasTable($name)) {
                Schema::create($name, function (Blueprint $table) use ($key) {
                    $table->id($key);
                    $table->string('email')->unique();
                    $table->string('password')->nullable();
                    $table->timestamps();
                    $table->softDeletes();
                });
            }
        }

        if (! Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id('log_id');
                $table->string('user_type');
                $table->unsignedBigInteger('user_id');
                $table->string('action', 100);
                $table->text('description')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();
            });
        }
    }
}
