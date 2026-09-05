<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Remove AUTO_INCREMENT attribute if present. Raw SQL is used because
        // Laravel's schema builder does not expose removing AUTO_INCREMENT directly.
        // This is MySQL-specific syntax; SQLite (used by the test suite) has no
        // AUTO_INCREMENT to remove, so it's a no-op there rather than a fatal
        // "near MODIFY: syntax error" that would block every migration after it.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE `job_seekers` MODIFY `seeker_id` BIGINT UNSIGNED NOT NULL;');
        }

        // Ensure complete_address is nullable (no-op if already nullable)
        if (Schema::hasColumn('job_seekers', 'complete_address')) {
            Schema::table('job_seekers', function (Blueprint $table) {
                $table->string('complete_address', 500)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        // Re-create AUTO_INCREMENT behavior. This will only succeed if the
        // current maximum seeker_id is less than the next auto-increment value
        // MySQL will set the AUTO_INCREMENT to (MAX(seeker_id) + 1) automatically.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE `job_seekers` MODIFY `seeker_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;');
        }
    }
};
