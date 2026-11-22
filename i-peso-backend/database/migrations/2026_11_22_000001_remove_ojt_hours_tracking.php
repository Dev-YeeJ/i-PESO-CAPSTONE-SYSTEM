<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OJT hours tracking is removed (user decision, 2026-11-22): no required hours, no daily
 * time in / time out, no approvals. Interns keep their limited login, school/course and
 * internship dates; the account still closes itself after the end date. The recorded
 * hours are deleted with the feature. This cannot be undone: down() only puts back the
 * empty table and column.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('ojt_time_logs');

        if (Schema::hasColumn('administrators', 'ojt_required_hours')) {
            Schema::table('administrators', function (Blueprint $table) {
                $table->dropColumn('ojt_required_hours');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('administrators', 'ojt_required_hours')) {
            Schema::table('administrators', function (Blueprint $table) {
                $table->unsignedSmallInteger('ojt_required_hours')->nullable()->after('ojt_course');
            });
        }

        if (! Schema::hasTable('ojt_time_logs')) {
            Schema::create('ojt_time_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('admin_id');
                $table->date('work_date');
                $table->timestamp('time_in');
                $table->timestamp('time_out')->nullable();
                $table->unsignedInteger('minutes')->nullable();
                $table->string('status', 20)->default('open');
                $table->boolean('corrected')->default(false);
                $table->string('note', 500)->nullable();
                $table->unsignedBigInteger('reviewed_by')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->string('time_in_ip', 45)->nullable();
                $table->string('time_out_ip', 45)->nullable();
                $table->timestamps();

                $table->unique(['admin_id', 'work_date']);
                $table->index(['status', 'work_date']);
                $table->foreign('admin_id')->references('admin_id')->on('administrators')->cascadeOnDelete();
                $table->foreign('reviewed_by')->references('admin_id')->on('administrators')->nullOnDelete();
            });
        }
    }
};
