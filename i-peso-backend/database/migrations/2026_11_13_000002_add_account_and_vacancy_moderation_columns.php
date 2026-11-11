<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What a PESO administrator can do after reviewing a safety report:
 *  - restrict (`limited`) or `suspended` an employer or job seeker account,
 *    optionally until a date, always with a recorded reason;
 *  - put a job vacancy on hold so it is hidden from job seekers and the
 *    employer cannot reopen it until PESO releases it.
 *
 * Nothing here is set automatically by a report — only by an administrator's
 * recorded action (see SafetyActionService).
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['employers', 'job_seekers'] as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (! Schema::hasColumn($tableName, 'account_restriction')) {
                    // null (none) | limited | suspended
                    $table->string('account_restriction', 20)->nullable();
                }
                if (! Schema::hasColumn($tableName, 'restriction_ends_at')) {
                    $table->timestamp('restriction_ends_at')->nullable();
                }
                if (! Schema::hasColumn($tableName, 'restriction_reason')) {
                    $table->text('restriction_reason')->nullable();
                }
                if (! Schema::hasColumn($tableName, 'restricted_at')) {
                    $table->timestamp('restricted_at')->nullable();
                }
                if (! Schema::hasColumn($tableName, 'restriction_report_id')) {
                    $table->unsignedBigInteger('restriction_report_id')->nullable();
                }
            });
        }

        if (Schema::hasTable('job_vacancies')) {
            Schema::table('job_vacancies', function (Blueprint $table) {
                if (! Schema::hasColumn('job_vacancies', 'admin_hold_at')) {
                    $table->timestamp('admin_hold_at')->nullable();
                }
                if (! Schema::hasColumn('job_vacancies', 'admin_hold_reason')) {
                    $table->text('admin_hold_reason')->nullable();
                }
                if (! Schema::hasColumn('job_vacancies', 'admin_hold_previous_status')) {
                    $table->string('admin_hold_previous_status', 20)->nullable();
                }
                if (! Schema::hasColumn('job_vacancies', 'admin_hold_report_id')) {
                    $table->unsignedBigInteger('admin_hold_report_id')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        foreach (['employers', 'job_seekers'] as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }
            $columns = collect(['account_restriction', 'restriction_ends_at', 'restriction_reason', 'restricted_at', 'restriction_report_id'])
                ->filter(fn ($column) => Schema::hasColumn($tableName, $column))->all();
            if ($columns !== []) {
                Schema::table($tableName, fn (Blueprint $table) => $table->dropColumn($columns));
            }
        }

        if (Schema::hasTable('job_vacancies')) {
            $columns = collect(['admin_hold_at', 'admin_hold_reason', 'admin_hold_previous_status', 'admin_hold_report_id'])
                ->filter(fn ($column) => Schema::hasColumn('job_vacancies', $column))->all();
            if ($columns !== []) {
                Schema::table('job_vacancies', fn (Blueprint $table) => $table->dropColumn($columns));
            }
        }
    }
};
