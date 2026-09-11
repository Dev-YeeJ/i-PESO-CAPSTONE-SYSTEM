<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Submitting and approving a placement report are both plain check-then-act:
 * two concurrent requests for the same employer+period can each pass the "is
 * anything already settled?" check before either has written, producing two
 * settled (pending_review/approved) reports for the same period — each would
 * then feed its own rows into the SPRS placement total, double-counting the
 * same hires. A unique index is the only mechanism that is actually
 * race-proof; the existing application-level checks stay in place as the
 * friendly, fast-fail path for the ordinary non-concurrent case.
 *
 * A generated column carries the constraint rather than a plain composite
 * unique index, because MySQL treats every NULL in a unique index as
 * distinct from every other NULL — so a non-blocking status (rejected,
 * pending_mapping) is naturally exempt without needing a partial index.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('placement_report_uploads', 'settlement_key')) {
            return;
        }

        // This table may already carry duplicate settled reports for the same
        // employer+period from before any guard existed. Adding the unique
        // index straight onto dirty data would fail deploy with a cryptic
        // MySQL "duplicate entry" error and leave the migration half-applied.
        // Fail loudly and specifically instead, with nothing changed, so the
        // conflicting rows can be resolved (reject/delete all but one settled
        // report per employer+period) before re-running this migration.
        $conflicts = DB::table('placement_report_uploads')
            ->select('employer_id', 'coverage_year', 'coverage_month', DB::raw('COUNT(*) as report_count'))
            ->whereIn('status', ['pending_review', 'approved'])
            ->whereNotNull('coverage_year')
            ->whereNotNull('coverage_month')
            ->groupBy('employer_id', 'coverage_year', 'coverage_month')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($conflicts->isNotEmpty()) {
            $details = $conflicts
                ->map(fn ($row) => "employer #{$row->employer_id} {$row->coverage_year}-{$row->coverage_month} ({$row->report_count} reports)")
                ->implode('; ');

            throw new RuntimeException(
                'Cannot add the placement report uniqueness constraint: existing duplicate settled '
                ."reports found for: {$details}. Resolve these (reject or delete all but one settled "
                .'report per employer+period) before re-running this migration.'
            );
        }

        Schema::table('placement_report_uploads', function (Blueprint $table) {
            $table->string('settlement_key', 60)->nullable()->storedAs(
                "CASE WHEN status IN ('pending_review', 'approved') AND coverage_year IS NOT NULL AND coverage_month IS NOT NULL "
                .'THEN CONCAT(employer_id, \'-\', coverage_year, \'-\', coverage_month) ELSE NULL END'
            );
        });

        Schema::table('placement_report_uploads', function (Blueprint $table) {
            $table->unique('settlement_key', 'placement_report_uploads_settlement_key_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('placement_report_uploads', 'settlement_key')) {
            return;
        }

        Schema::table('placement_report_uploads', function (Blueprint $table) {
            $table->dropUnique('placement_report_uploads_settlement_key_unique');
            $table->dropColumn('settlement_key');
        });
    }
};
