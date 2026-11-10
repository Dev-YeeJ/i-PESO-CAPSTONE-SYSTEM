<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OJT / internship tracking: each intern's required hours and internship
 * dates, and a daily time-in / time-out log the system administrator
 * approves. Interns are administrators-table accounts in the "OJT / Intern"
 * position; their account closes itself after the end date.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('administrators', function (Blueprint $table) {
            if (! Schema::hasColumn('administrators', 'ojt_school')) {
                $table->string('ojt_school', 150)->nullable();
            }
            if (! Schema::hasColumn('administrators', 'ojt_course')) {
                $table->string('ojt_course', 150)->nullable();
            }
            if (! Schema::hasColumn('administrators', 'ojt_required_hours')) {
                $table->unsignedSmallInteger('ojt_required_hours')->nullable();
            }
            if (! Schema::hasColumn('administrators', 'ojt_start_date')) {
                $table->date('ojt_start_date')->nullable();
            }
            if (! Schema::hasColumn('administrators', 'ojt_end_date')) {
                $table->date('ojt_end_date')->nullable();
            }
            // Why an inactive account is inactive: "deactivated" by the
            // system administrator, or "internship_ended" automatically.
            if (! Schema::hasColumn('administrators', 'deactivated_reason')) {
                $table->string('deactivated_reason', 40)->nullable();
            }
        });

        if (! Schema::hasTable('ojt_time_logs')) {
            Schema::create('ojt_time_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('admin_id');
                $table->date('work_date');
                $table->timestamp('time_in');
                $table->timestamp('time_out')->nullable();
                $table->unsignedInteger('minutes')->nullable();
                // open (timed in) → pending (timed out) → approved | rejected
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

    public function down(): void
    {
        Schema::dropIfExists('ojt_time_logs');

        Schema::table('administrators', function (Blueprint $table) {
            $table->dropColumn([
                'ojt_school', 'ojt_course', 'ojt_required_hours',
                'ojt_start_date', 'ojt_end_date', 'deactivated_reason',
            ]);
        });
    }
};
