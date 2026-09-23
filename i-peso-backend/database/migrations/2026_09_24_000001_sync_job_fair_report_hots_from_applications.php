<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('job_fair_result_reports')
            ->whereNotNull('employer_id')
            ->orderBy('id')
            ->eachById(function (object $report): void {
                $applications = DB::table('applications')
                    ->join('job_vacancies', 'job_vacancies.post_id', '=', 'applications.post_id')
                    ->where('applications.job_fair_id', $report->job_fair_id)
                    ->where('job_vacancies.employer_id', $report->employer_id);

                if (! $applications->exists()) {
                    return;
                }

                DB::table('job_fair_result_reports')
                    ->where('id', $report->id)
                    ->update([
                        'total_hots' => $applications->where('applications.is_hots', true)->count(),
                        'updated_at' => now(),
                    ]);
            });
    }

    public function down(): void
    {
        // The previous aggregate values cannot be reconstructed after the
        // application-level source of truth has been applied.
    }
};