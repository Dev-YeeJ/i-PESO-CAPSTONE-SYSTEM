<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The applications.status column has been a native enum('pending','reviewed',
     * 'shortlisted','interview','hired','rejected') since the very first migration —
     * 'withdrawn' was never added to it. Every layer of the app (SeekerApplicationController
     * ::withdraw(), FormatsApplications, ApplicationStatusNotification, admin analytics
     * validation) has treated 'withdrawn' as a valid status for a long time, but writing it
     * actually hits MySQL's strict-mode rejection of an out-of-range enum value ("Data
     * truncated for column 'status'"), which is the real cause of the 500 seekers hit when
     * tapping Withdraw — the save() throws before the request ever gets near the
     * notification/event code.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE applications MODIFY status ENUM('pending', 'reviewed', 'shortlisted', 'interview', 'hired', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending'");
            return;
        }

        // Non-MySQL (sqlite in tests, etc.) has no native enum type — Laravel emulates it as
        // a CHECK constraint. Widening to a plain string column is the portable equivalent
        // and doesn't lose data (Blueprint::change() copies existing rows across).
        Schema::table('applications', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->change();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE applications MODIFY status ENUM('pending', 'reviewed', 'shortlisted', 'interview', 'hired', 'rejected') NOT NULL DEFAULT 'pending'");
            return;
        }

        Schema::table('applications', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->change();
        });
    }
};
