<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Three gaps closed here:
 *  - Employers send one workbook with a tab per month, so an upload has to
 *    remember which sheet it was built from (and which sheets were available).
 *  - "We hired nobody this month" has to be distinguishable from "never
 *    submitted", which compliance tracking depends on. A nil report carries no
 *    file, hence stored_path becoming nullable.
 *  - Name matching is fuzzy by nature, so each record records how confident the
 *    link was and whether a PESO admin has since confirmed it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('placement_report_uploads', function (Blueprint $table) {
            if (! Schema::hasColumn('placement_report_uploads', 'sheet_names')) {
                $table->json('sheet_names')->nullable()->after('sample_rows');
            }
            if (! Schema::hasColumn('placement_report_uploads', 'selected_sheet')) {
                $table->string('selected_sheet')->nullable()->after('sheet_names');
            }
            if (! Schema::hasColumn('placement_report_uploads', 'is_nil_report')) {
                $table->boolean('is_nil_report')->default(false)->after('status');
            }
        });

        // Nil reports have no spreadsheet behind them.
        Schema::table('placement_report_uploads', function (Blueprint $table) {
            $table->string('stored_path')->nullable()->change();
        });

        Schema::table('placement_records', function (Blueprint $table) {
            if (! Schema::hasColumn('placement_records', 'seeker_match_confidence')) {
                $table->string('seeker_match_confidence', 20)->nullable()->after('seeker_id');
            }
            if (! Schema::hasColumn('placement_records', 'seeker_match_confirmed_by')) {
                $table->unsignedBigInteger('seeker_match_confirmed_by')->nullable()->after('seeker_match_confidence');
            }
            if (! Schema::hasColumn('placement_records', 'seeker_match_confirmed_at')) {
                $table->timestamp('seeker_match_confirmed_at')->nullable()->after('seeker_match_confirmed_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('placement_records', function (Blueprint $table) {
            $columns = collect(['seeker_match_confidence', 'seeker_match_confirmed_by', 'seeker_match_confirmed_at'])
                ->filter(fn (string $column) => Schema::hasColumn('placement_records', $column))->all();

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });

        Schema::table('placement_report_uploads', function (Blueprint $table) {
            $columns = collect(['sheet_names', 'selected_sheet', 'is_nil_report'])
                ->filter(fn (string $column) => Schema::hasColumn('placement_report_uploads', $column))->all();

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
