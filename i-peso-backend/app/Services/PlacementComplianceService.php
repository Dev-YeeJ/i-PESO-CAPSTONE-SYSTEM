<?php

namespace App\Services;

use App\Models\Employer;
use App\Models\PlacementReportUpload;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Answers "who still owes PESO a placement report?".
 *
 * PESO's manual process is chasing employers by phone once the month closes.
 * A coverage period is considered settled once the employer has a submission
 * for it that is pending review or approved — a rejected report still counts
 * as outstanding, because PESO is waiting on the corrected version.
 */
class PlacementComplianceService
{
    /** Statuses that mean the employer has fulfilled the period. */
    private const SETTLED_STATUSES = [
        PlacementReportUpload::STATUS_PENDING_REVIEW,
        PlacementReportUpload::STATUS_APPROVED,
    ];

    /**
     * The date a report covering the given month is due: the configured day of
     * the following month, clamped to that month's length.
     */
    public function dueDate(int $year, int $month): Carbon
    {
        $following = Carbon::create($year, $month, 1)->startOfMonth()->addMonth();
        $day = min(max((int) config('placement_reports.deadline_day', 10), 1), $following->daysInMonth);

        return $following->setDay($day)->endOfDay();
    }

    /** The most recent coverage period whose deadline has already passed. */
    public function latestOverduePeriod(?Carbon $asOf = null): array
    {
        $asOf ??= Carbon::now();
        $period = $asOf->copy()->startOfMonth()->subMonth();

        // If this month's deadline has not arrived yet, the period still open
        // is not overdue — step back one more month.
        if ($this->dueDate($period->year, $period->month)->greaterThanOrEqualTo($asOf)) {
            $period->subMonth();
        }

        return ['year' => $period->year, 'month' => $period->month];
    }

    /**
     * Employers expected to report for a coverage period, each with the state
     * of their submission for it.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function statusFor(int $year, int $month, ?Carbon $asOf = null): Collection
    {
        $asOf ??= Carbon::now();
        $dueDate = $this->dueDate($year, $month);

        $employers = Employer::query()
            ->whereIn('verification_status', config('placement_reports.reporting_statuses', ['verified']))
            // An employer registered after the period closed was never in a
            // position to hire during it, so they are not counted as delinquent.
            ->where('created_at', '<=', Carbon::create($year, $month, 1)->endOfMonth())
            ->select('employer_id', 'company_name', 'trade_name', 'email', 'mobile_number')
            ->orderBy('company_name')
            ->get();

        $uploads = PlacementReportUpload::query()
            ->where('coverage_year', $year)
            ->where('coverage_month', $month)
            ->whereIn('employer_id', $employers->pluck('employer_id'))
            ->orderByDesc('submitted_at')
            ->get()
            ->groupBy('employer_id');

        return $employers->map(function (Employer $employer) use ($uploads, $dueDate, $asOf) {
            /** @var Collection<int, PlacementReportUpload> $forEmployer */
            $forEmployer = $uploads->get($employer->employer_id, collect());

            $settled = $forEmployer->first(fn (PlacementReportUpload $u) => in_array($u->status, self::SETTLED_STATUSES, true));
            $rejected = $forEmployer->first(fn (PlacementReportUpload $u) => $u->status === PlacementReportUpload::STATUS_REJECTED);
            $latest = $settled ?? $rejected ?? $forEmployer->first();

            $state = match (true) {
                $settled !== null => $settled->status,
                $rejected !== null => 'needs_revision',
                $asOf->greaterThan($dueDate) => 'overdue',
                default => 'not_submitted',
            };

            return [
                'employer_id' => $employer->employer_id,
                'company_name' => $employer->company_name ?: $employer->trade_name,
                'email' => $employer->email,
                'mobile_number' => $employer->mobile_number,
                'state' => $state,
                'is_nil_report' => (bool) ($settled?->is_nil_report ?? false),
                'upload_id' => $latest?->id,
                'record_count' => $settled?->records()->count() ?? 0,
                'submitted_at' => $latest?->submitted_at,
                'due_date' => $dueDate->toDateString(),
            ];
        });
    }

    /**
     * Employers with nothing settled for the period — the chase list.
     *
     * @return Collection<int, Employer>
     */
    public function employersMissingReport(int $year, int $month): Collection
    {
        $settledEmployerIds = PlacementReportUpload::query()
            ->where('coverage_year', $year)
            ->where('coverage_month', $month)
            ->whereIn('status', self::SETTLED_STATUSES)
            ->pluck('employer_id');

        return Employer::query()
            ->whereIn('verification_status', config('placement_reports.reporting_statuses', ['verified']))
            ->where('created_at', '<=', Carbon::create($year, $month, 1)->endOfMonth())
            ->whereNotIn('employer_id', $settledEmployerIds)
            ->get();
    }
}
