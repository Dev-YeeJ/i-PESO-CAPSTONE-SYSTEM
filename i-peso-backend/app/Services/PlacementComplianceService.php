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
        // Every user is in Asia/Manila; app.timezone is UTC with no env
        // override. Pinning the month boundary to Manila explicitly keeps the
        // deadline anchored to the correct local day rather than UTC's.
        $following = Carbon::create($year, $month, 1, 0, 0, 0, 'Asia/Manila')->startOfMonth()->addMonth();
        $day = min(max((int) config('placement_reports.deadline_day', 10), 1), $following->daysInMonth);

        return $following->setDay($day)->endOfDay();
    }

    /** The most recent coverage period whose deadline has already passed. */
    public function latestOverduePeriod(?Carbon $asOf = null): array
    {
        $asOf ??= Carbon::now('Asia/Manila');
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
            // An employer wasn't in a position to report hires for a period
            // until PESO actually verified them and gave them portal access —
            // registration date alone would retroactively brand someone
            // verified after the deadline as delinquent for a period they had
            // no access to. Fall back to created_at only for legacy rows
            // verified before the verified_at column existed.
            ->whereRaw('COALESCE(verified_at, created_at) <= ?', [Carbon::create($year, $month, 1)->endOfMonth()])
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
     * Every reporting employer against every month of a year, up to the month
     * whose report is currently coming due. Two queries regardless of size.
     *
     * Cell states: approved, pending_review, nil (an approved/pending "no hires"
     * report), needs_revision, overdue, due (deadline not reached yet),
     * not_required (the employer wasn't verified yet that month).
     *
     * @return array{year: int, months: list<array{month: int, label: string, due_date: string}>, rows: list<array<string, mixed>>}
     */
    public function yearGrid(int $year, ?Carbon $asOf = null): array
    {
        $asOf ??= Carbon::now('Asia/Manila');
        $lastMonth = $year < $asOf->year ? 12 : max(0, $asOf->month - 1);
        $months = [];
        for ($month = 1; $month <= $lastMonth; $month++) {
            $months[] = [
                'month' => $month,
                'label' => Carbon::create($year, $month, 1)->format('M'),
                'due_date' => $this->dueDate($year, $month)->toDateString(),
            ];
        }

        $employers = Employer::query()
            ->whereIn('verification_status', config('placement_reports.reporting_statuses', ['verified']))
            ->whereRaw('COALESCE(verified_at, created_at) <= ?', [Carbon::create($year, max(1, $lastMonth), 1)->endOfMonth()])
            ->select('employer_id', 'company_name', 'trade_name', 'verified_at', 'created_at')
            ->orderBy('company_name')
            ->get();

        $uploads = PlacementReportUpload::query()
            ->where('coverage_year', $year)
            ->whereIn('employer_id', $employers->pluck('employer_id'))
            ->get(['id', 'employer_id', 'coverage_month', 'status', 'is_nil_report', 'submitted_at'])
            ->groupBy(fn (PlacementReportUpload $upload) => $upload->employer_id.'-'.$upload->coverage_month);

        $rows = $employers->map(function (Employer $employer) use ($months, $uploads, $year, $asOf) {
            $since = Carbon::parse($employer->verified_at ?? $employer->created_at);
            $cells = [];
            foreach ($months as $info) {
                $forMonth = $uploads->get($employer->employer_id.'-'.$info['month'], collect());
                $settled = $forMonth->first(fn ($u) => in_array($u->status, self::SETTLED_STATUSES, true));
                $rejected = $forMonth->first(fn ($u) => $u->status === PlacementReportUpload::STATUS_REJECTED);
                $due = $this->dueDate($year, $info['month']);
                $late = $settled && $settled->submitted_at && Carbon::parse($settled->submitted_at)->greaterThan($due);

                $state = match (true) {
                    $since->greaterThan(Carbon::create($year, $info['month'], 1)->endOfMonth()) => 'not_required',
                    $settled !== null && $settled->is_nil_report => 'nil',
                    $settled !== null => $settled->status,
                    $rejected !== null => 'needs_revision',
                    $asOf->greaterThan($due) => 'overdue',
                    default => 'due',
                };

                $cells[] = [
                    'month' => $info['month'],
                    'state' => $state,
                    'late' => (bool) $late,
                    'upload_id' => ($settled ?? $rejected)?->id,
                ];
            }

            return [
                'employer_id' => $employer->employer_id,
                'company_name' => $employer->company_name ?: $employer->trade_name,
                'cells' => $cells,
                'missing' => collect($cells)->whereIn('state', ['overdue', 'needs_revision'])->count(),
            ];
        })->values()->all();

        return ['year' => $year, 'months' => $months, 'rows' => $rows];
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
            ->whereRaw('COALESCE(verified_at, created_at) <= ?', [Carbon::create($year, $month, 1)->endOfMonth()])
            ->whereNotIn('employer_id', $settledEmployerIds)
            ->get();
    }
}
