<?php
// i-peso-backend/app/Http/Controllers/Api/Admin/SystemReports/ReportController.php

namespace App\Http\Controllers\Api\Admin\SystemReports;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\AnalyticsReport;
use App\Models\JobSeeker;
use App\Models\Application;
use App\Models\JobVacancy;
use App\Models\GovernmentProgram;
use App\Models\PlacementRecord;
use App\Models\PlacementReportUpload;
use App\Models\SprsManualAdjustment;
use App\Models\SprsSignatory;
use Illuminate\Support\Facades\Schema;
use App\Services\AdminAnalyticsService;
use App\Services\JobFairReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $reports = AnalyticsReport::paginate($request->get('per_page', 15));

        return response()->json($reports);
    }

    public function generate(Request $request, AdminAnalyticsService $analytics): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'report_category' => 'required|in:placement,registration,vacancies,programs,job_seeker_summary,employer_summary,vacancy_summary,application_status,hired_applicants,skills_distribution,most_applied_categories,most_hiring_companies,location_distribution,employment_trends,labor_market_analytics',
            'coverage_start' => 'required|date',
            'coverage_end' => 'required|date|after_or_equal:coverage_start',
            'period' => 'nullable|in:monthly,yearly',
            'province' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:150',
            'barangay' => 'nullable|string|max:150',
            'broad_field' => 'nullable|string|max:255',
            'occupation' => 'nullable|string|max:255',
            'skill' => 'nullable|string|max:150',
            'employer_verification_status' => 'nullable|in:pending,verified,rejected',
            'vacancy_status' => 'nullable|in:active,closed,draft',
            'application_status' => 'nullable|in:pending,reviewed,shortlisted,interview,hired,rejected,withdrawn',
        ]);

        $dataSummary = $validated['report_category'] === 'programs'
            ? $this->generateReportData(
                $validated['report_category'],
                Carbon::parse($validated['coverage_start']),
                Carbon::parse($validated['coverage_end'])
            )
            : $analytics->reportData($validated['report_category'], [
                'date_from' => $validated['coverage_start'],
                'date_to' => $validated['coverage_end'],
                'period' => $validated['period'] ?? 'monthly',
                ...collect($validated)->only([
                    'province', 'city', 'barangay', 'broad_field', 'occupation', 'skill',
                    'employer_verification_status', 'vacancy_status', 'application_status',
                ])->all(),
            ]);

        $report = AnalyticsReport::create([
            'admin_id' => $admin->admin_id,
            'title' => $validated['title'],
            'report_category' => $validated['report_category'],
            'coverage_start' => $validated['coverage_start'],
            'coverage_end' => $validated['coverage_end'],
            'data_summary' => $dataSummary,
        ]);

        return response()->json([
            'message' => 'Report generated successfully',
            'report' => $report,
        ], 201);
    }

    public function generateSPRS(Request $request, JobFairReportService $jobFairReports): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2020|max:2100',
            'manual_adjustments' => 'nullable|array',
            'manual_adjustments.*.indicator_key' => 'required|string|max:60',
            'manual_adjustments.*.label' => 'required|string|max:255',
            'manual_adjustments.*.total' => 'nullable|integer|min:0',
            'manual_adjustments.*.female' => 'nullable|integer|min:0',
            'signatories' => 'nullable|array',
            'signatories.*.name' => 'nullable|string|max:255',
            'signatories.*.position' => 'nullable|string|max:255',
            'issues_concerns' => 'nullable|string|max:5000',
        ]);

        $month = \Carbon\Carbon::createFromDate($validated['year'], $validated['month'], 1);
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();
        $prevMonth = $month->copy()->subMonth();
        $yearStart = $month->copy()->startOfYear();

        // Compute the same indicator set for current month, previous month, and
        // year-to-date cumulative — the three column groups on the DOLE SPRS form.
        $current = $this->computeSprsFigures($start, $end, $jobFairReports);
        $previous = $this->computeSprsFigures($prevMonth->copy()->startOfMonth(), $prevMonth->copy()->endOfMonth(), $jobFairReports);
        $cumulative = $this->computeSprsFigures($yearStart, $end, $jobFairReports);

        $data = [
            'period' => $month->format('F Y'),
            'previous_period' => $prevMonth->format('F Y'),
            'cumulative_period' => $yearStart->format('F') . '–' . $month->format('F Y'),
            // Current-month keys kept flat for backward compatibility with the
            // existing print view; previous/cumulative added alongside.
            '1_1_vacancies' => [
                'total' => $current['vacancies_total'], 'local' => $current['vacancies_local'], 'overseas' => $current['vacancies_overseas'],
                'previous_total' => $previous['vacancies_total'], 'cumulative_total' => $cumulative['vacancies_total'],
            ],
            '1_2_registered' => [
                'total' => $current['registered_total'], 'female' => $current['registered_female'],
                'previous_total' => $previous['registered_total'], 'previous_female' => $previous['registered_female'],
                'cumulative_total' => $cumulative['registered_total'], 'cumulative_female' => $cumulative['registered_female'],
            ],
            '1_3_referred' => [
                'total' => $current['referred_total'], 'female' => $current['referred_female'],
                'previous_total' => $previous['referred_total'], 'previous_female' => $previous['referred_female'],
                'cumulative_total' => $cumulative['referred_total'], 'cumulative_female' => $cumulative['referred_female'],
            ],
            '1_4_placed' => [
                'total' => $current['placed_total'], 'female' => $current['placed_female'],
                'private' => $current['placed_private'], 'government' => $current['placed_government'], 'overseas' => 0,
                'on_platform' => $current['placed_on_platform'], 'employer_reported' => $current['placed_employer_reported'],
                'previous_total' => $previous['placed_total'], 'previous_female' => $previous['placed_female'],
                'cumulative_total' => $cumulative['placed_total'], 'cumulative_female' => $cumulative['placed_female'],
            ],
            '1_5_spes' => [
                'total' => $current['spes_total'], 'female' => $current['spes_female'],
                'previous_total' => $previous['spes_total'], 'cumulative_total' => $cumulative['spes_total'],
            ],
            '1_6_job_fairs' => array_merge($current['job_fairs'], [
                'previous_fairs_conducted' => $previous['job_fairs']['fairs_conducted'],
                'cumulative_fairs_conducted' => $cumulative['job_fairs']['fairs_conducted'],
            ]),
            'peis' => [
                'establishments' => $current['employers_registered'],
                'applicants' => $current['registered_total'],
                'cumulative_establishments' => $cumulative['employers_registered'],
            ],
            // "Other Accomplishments" — First-Time Jobseeker Act (RA 11261).
            // Self-declared at registration; with_attachment counts those who
            // also uploaded the barangay certificate as proof.
            'other_accomplishments' => [
                'ftja_total' => $current['ftja_total'],
                'ftja_with_attachment' => $current['ftja_with_attachment'],
                'previous_ftja_total' => $previous['ftja_total'],
                'cumulative_ftja_total' => $cumulative['ftja_total'],
            ],
            // Free-text field matching the paper form's "ISSUES / CONCERNS" box —
            // filled in by whoever prepares the report, not computed from data.
            'issues_concerns' => $validated['issues_concerns'] ?? null,
            // Full form-order row list backing the editable on-screen grid and
            // the PDF. See buildSprsRows() for which rows are system-computed
            // vs. left blank for manual entry.
            'rows' => $this->buildSprsRows($current, $previous, $cumulative),
        ];

        $report = AnalyticsReport::create([
            'admin_id' => $admin->admin_id,
            'title' => 'SPRS Report - ' . $month->format('F Y'),
            'report_category' => 'sprs',
            'coverage_start' => $start,
            'coverage_end' => $end,
            'data_summary' => $data,
            'status' => 'submitted',
        ]);

        // Persist manual (non-computable) rows and the sign-off block, then fold
        // them into both the response and the stored snapshot.
        $manualAdjustments = $this->persistManualAdjustments($report->report_id, $validated['manual_adjustments'] ?? []);
        $signatories = $this->persistSignatories($report->report_id, $validated['signatories'] ?? []);
        $data['manual_adjustments'] = $manualAdjustments;
        $data['signatories'] = $signatories;
        $report->update(['data_summary' => $data]);

        return response()->json([
            'message' => 'SPRS Report generated',
            'data' => $data,
            'report' => $report->fresh(),
        ], 200);
    }

    /**
     * Save hand-entered edits to a generated SPRS report — the whole row grid
     * (system-computed values a preparer corrected, plus the LMI/Career
     * Guidance/AIR-TIP and local/overseas rows the system can't compute at
     * all), the Other Accomplishments block, the Issues/Concerns text, and
     * signatories. This is what makes the report a genuinely fillable form
     * rather than a read-only computed snapshot.
     */
    public function updateSprs(Request $request, int $id): JsonResponse
    {
        $admin = auth()->user();
        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $report = AnalyticsReport::findOrFail($id);

        $validated = $request->validate([
            'rows' => ['nullable', 'array'],
            'rows.*.key' => ['required_with:rows', 'string'],
            'rows.*.target' => ['nullable', 'numeric'],
            'rows.*.prev_total' => ['nullable', 'numeric'],
            'rows.*.prev_female' => ['nullable', 'numeric'],
            'rows.*.curr_total' => ['nullable', 'numeric'],
            'rows.*.curr_female' => ['nullable', 'numeric'],
            'rows.*.cum_total' => ['nullable', 'numeric'],
            'rows.*.cum_female' => ['nullable', 'numeric'],
            'other_accomplishments' => ['nullable', 'array'],
            'other_accomplishments.ftja_total' => ['nullable', 'numeric'],
            'other_accomplishments.ftja_with_attachment' => ['nullable', 'numeric'],
            'issues_concerns' => ['nullable', 'string', 'max:5000'],
            'signatories' => ['nullable', 'array'],
            'signatories.*.name' => ['nullable', 'string', 'max:255'],
            'signatories.*.position' => ['nullable', 'string', 'max:255'],
        ]);

        $data = $report->data_summary ?? [];

        if (array_key_exists('rows', $validated)) {
            // Rows are keyed, so a save only needs to carry the rows the
            // editor actually renders; merge by key rather than requiring
            // every row on every save.
            $existingByKey = collect($data['rows'] ?? [])->keyBy('key');
            foreach ($validated['rows'] as $editedRow) {
                $existingByKey[$editedRow['key']] = array_merge(
                    $existingByKey[$editedRow['key']] ?? ['key' => $editedRow['key'], 'section' => false],
                    $editedRow,
                );
            }
            $data['rows'] = $existingByKey->values()->all();
        }

        if (array_key_exists('other_accomplishments', $validated)) {
            $data['other_accomplishments'] = array_merge($data['other_accomplishments'] ?? [], $validated['other_accomplishments']);
        }

        if (array_key_exists('issues_concerns', $validated)) {
            $data['issues_concerns'] = $validated['issues_concerns'];
        }

        if (!empty($validated['signatories'])) {
            $data['signatories'] = $this->persistSignatories($report->report_id, $validated['signatories']);
        }

        $report->update(['data_summary' => $data]);

        return response()->json([
            'message' => 'SPRS report updated',
            'data' => $data,
            'report' => $report->fresh(),
        ]);
    }

    /**
     * Compute the core SPRS indicator figures for a date range. Called once per
     * column group (current month, previous month, year-to-date cumulative).
     */
    private function computeSprsFigures(Carbon $start, Carbon $end, JobFairReportService $jobFairReports): array
    {
        $localVacancies = (int) JobVacancy::whereBetween('created_at', [$start, $end])->sum('vacancies_count');

        $registeredTotal = JobSeeker::whereBetween('created_at', [$start, $end])->count();
        $registeredFemale = JobSeeker::whereBetween('created_at', [$start, $end])->where('sex', 'female')->count();

        $referredTotal = Application::whereBetween('created_at', [$start, $end])->count();
        $referredFemale = Application::whereBetween('created_at', [$start, $end])
            ->whereHas('jobSeeker', fn ($q) => $q->where('sex', 'female'))->count();

        $placedOnPlatform = Application::where('status', 'hired')->whereBetween('status_changed_at', [$start, $end])->count();
        $placedFemale = Application::where('status', 'hired')->whereBetween('status_changed_at', [$start, $end])
            ->whereHas('jobSeeker', fn ($q) => $q->where('sex', 'female'))->count();
        $placedGovernment = Application::where('status', 'hired')->whereBetween('status_changed_at', [$start, $end])
            ->whereHas('jobVacancy.employer', fn ($q) => $q->where('company_type', 'like', '%Government%')->orWhere('company_type', 'like', '%LGU%'))->count();
        $placedGovernmentFemale = Application::where('status', 'hired')->whereBetween('status_changed_at', [$start, $end])
            ->whereHas('jobVacancy.employer', fn ($q) => $q->where('company_type', 'like', '%Government%')->orWhere('company_type', 'like', '%LGU%'))
            ->whereHas('jobSeeker', fn ($q) => $q->where('sex', 'female'))->count();

        // Employers report every new hire, not only PESO referrals, so approved
        // reports are a second source of placements alongside platform hires.
        // Anyone counted from both sides — hired through i-PESO *and* listed on
        // their employer's monthly sheet — must only be counted once, or the
        // figure submitted to DOLE overstates placements.
        $employerReportedPlaced = 0;
        $employerReportedFemale = 0;
        $employerReportedGovernment = 0;
        $employerReportedGovernmentFemale = 0;
        if (Schema::hasTable('placement_records')) {
            $approvedUploadIds = PlacementReportUpload::where('status', PlacementReportUpload::STATUS_APPROVED)->pluck('id');

            $alreadyCountedSeekerIds = Application::where('status', 'hired')
                ->whereBetween('status_changed_at', [$start, $end])
                ->pluck('seeker_id')
                ->filter()
                ->unique()
                ->values();

            $employerReported = PlacementRecord::whereIn('upload_id', $approvedUploadIds)
                ->whereBetween('date_hired', [$start->toDateString(), $end->toDateString()])
                // Unlinked rows are the norm (walk-ins with no i-PESO account)
                // and still count; only a row linked to a seeker already tallied
                // as a platform hire is skipped.
                ->where(fn ($query) => $query
                    ->whereNull('seeker_id')
                    ->orWhereNotIn('seeker_id', $alreadyCountedSeekerIds));

            $employerReportedPlaced = (clone $employerReported)->count();
            $employerReportedFemale = (clone $employerReported)->whereRaw('LOWER(gender) LIKE ?', ['f%'])->count();
            // Classify employer-reported placements as private/government too,
            // via the reporting employer's company_type, so 1.4.1 + 1.4.2 adds
            // back up to the 1.4 total instead of only covering platform hires.
            $employerReportedGovernment = (clone $employerReported)
                ->whereHas('employer', fn ($q) => $q->where('company_type', 'like', '%Government%')->orWhere('company_type', 'like', '%LGU%'))
                ->count();
            $employerReportedGovernmentFemale = (clone $employerReported)
                ->whereHas('employer', fn ($q) => $q->where('company_type', 'like', '%Government%')->orWhere('company_type', 'like', '%LGU%'))
                ->whereRaw('LOWER(gender) LIKE ?', ['f%'])->count();
        }

        $spesPlaced = Application::where('status', 'hired')->whereBetween('status_changed_at', [$start, $end])
            ->whereHas('jobVacancy', fn ($q) => $q->where('spes_tupad_eligible', true))->count();
        $spesFemale = Application::where('status', 'hired')->whereBetween('status_changed_at', [$start, $end])
            ->whereHas('jobVacancy', fn ($q) => $q->where('spes_tupad_eligible', true))
            ->whereHas('jobSeeker', fn ($q) => $q->where('sex', 'female'))->count();

        $employersRegistered = \App\Models\Employer::whereBetween('created_at', [$start, $end])->count();

        // Other Accomplishments — First-Time Jobseeker Act (RA 11261). Self-
        // declared at registration; "attached" means the seeker also uploaded
        // the barangay certificate as a seeker_certificates row.
        $ftjaSeekerIds = JobSeeker::whereBetween('created_at', [$start, $end])
            ->where('is_first_time_jobseeker', true)
            ->pluck('seeker_id');
        $ftjaTotal = $ftjaSeekerIds->count();
        $ftjaFemale = JobSeeker::whereBetween('created_at', [$start, $end])
            ->where('is_first_time_jobseeker', true)->where('sex', 'female')->count();
        $ftjaWithAttachment = $ftjaTotal > 0 && Schema::hasTable('seeker_certificates')
            ? \App\Models\SeekerCertificate::whereIn('seeker_id', $ftjaSeekerIds)
                ->where('category', 'first_time_jobseeker_certificate')
                ->distinct('seeker_id')
                ->count('seeker_id')
            : 0;

        $jobFairs = \App\Models\JobFair::query()
            ->whereBetween(DB::raw('COALESCE(start_date, event_date)'), [$start->toDateString(), $end->toDateString()])
            ->whereIn('status', ['completed', 'closed'])->get();
        // job_fairs.sector ('local'/'overseas'/'both') already exists and is
        // used in the per-event 1.6 PDF — reuse it here for the 1.6.1/1.6.2/
        // 1.6.3 monthly split instead of leaving it unsplit.
        $jobFairSection = [
            'fairs_conducted' => $jobFairs->count(), 'participating_companies' => 0,
            'vacancies_solicited' => 0, 'applicants' => 0, 'hots' => 0,
            'near_hired' => 0, 'rejected' => 0, 'self_service_reports' => 0, 'admin_proxy_reports' => 0,
            'fairs_local' => 0, 'fairs_overseas' => 0, 'fairs_both' => 0,
        ];
        foreach ($jobFairs as $jobFair) {
            $sector = in_array($jobFair->sector, ['local', 'overseas', 'both'], true) ? $jobFair->sector : 'local';
            $jobFairSection['fairs_' . $sector]++;
        }
        foreach ($jobFairs as $jobFair) {
            $summary = $jobFairReports->sprs($jobFair);
            $jobFairSection['participating_companies'] += $summary['1.6.4_establishments_participated'];
            $jobFairSection['vacancies_solicited'] += $summary['1.6.5_job_vacancies_solicited'];
            $jobFairSection['applicants'] += $summary['1.6.6_job_applicants_registered'];
            $jobFairSection['hots'] += $summary['1.6.7_total_hots'];
            $jobFairSection['near_hired'] += $summary['near_hired'];
            $jobFairSection['rejected'] += $summary['rejected'];
            $jobFairSection['self_service_reports'] += $summary['self_service_reports'];
            $jobFairSection['admin_proxy_reports'] += $summary['admin_proxy_reports'];
        }

        return [
            'vacancies_total' => $localVacancies,
            'vacancies_local' => $localVacancies,
            'vacancies_overseas' => 0,
            'registered_total' => $registeredTotal,
            'registered_female' => $registeredFemale,
            'referred_total' => $referredTotal,
            'referred_female' => $referredFemale,
            'placed_total' => $placedOnPlatform + $employerReportedPlaced,
            'placed_female' => $placedFemale + $employerReportedFemale,
            // Government total now includes employer-reported government hires,
            // and private is the remainder, so 1.4.1 + 1.4.2 == 1.4 always —
            // previously private/government only accounted for platform hires,
            // so the two subtotals undercounted the total whenever an approved
            // employer report included a placement.
            'placed_government' => $placedGovernment + $employerReportedGovernment,
            'placed_government_female' => $placedGovernmentFemale + $employerReportedGovernmentFemale,
            'placed_private' => ($placedOnPlatform + $employerReportedPlaced) - ($placedGovernment + $employerReportedGovernment),
            'placed_private_female' => ($placedFemale + $employerReportedFemale) - ($placedGovernmentFemale + $employerReportedGovernmentFemale),
            'placed_on_platform' => $placedOnPlatform,
            'placed_employer_reported' => $employerReportedPlaced,
            'spes_total' => $spesPlaced,
            'spes_female' => $spesFemale,
            'employers_registered' => $employersRegistered,
            'job_fairs' => $jobFairSection,
            'ftja_total' => $ftjaTotal,
            'ftja_female' => $ftjaFemale,
            'ftja_with_attachment' => $ftjaWithAttachment,
        ];
    }

    /**
     * Build the full DOLE SPRS Form 2018 row list, in form order, for the
     * editable on-screen grid and the PDF. Every row carries a value for
     * whichever of {target, prev, curr, cum} × {total, female} the system can
     * genuinely compute; everything else is left null so the UI renders an
     * empty, editable cell rather than a fabricated zero. `auto` marks rows
     * that started out system-computed, purely as a UI hint for preparers —
     * every cell stays editable regardless.
     */
    private function buildSprsRows(array $current, array $previous, array $cumulative): array
    {
        $row = function (string $key, string $label, int $indent, bool $auto, array $values = []) {
            return array_merge([
                'key' => $key,
                'label' => $label,
                'indent' => $indent,
                'section' => false,
                'auto' => $auto,
                'target' => null,
                'prev_total' => null, 'prev_female' => null,
                'curr_total' => null, 'curr_female' => null,
                'cum_total' => null, 'cum_female' => null,
            ], $values);
        };
        $section = fn (string $key, string $label) => [
            'key' => $key, 'label' => $label, 'indent' => 0, 'section' => true, 'auto' => false,
            'target' => null,
            'prev_total' => null, 'prev_female' => null, 'curr_total' => null, 'curr_female' => null,
            'cum_total' => null, 'cum_female' => null,
        ];

        $jf = fn (array $set, string $field) => $set['job_fairs'][$field] ?? null;

        return [
            $section('sec_pes', 'A. PUBLIC EMPLOYMENT SERVICES (PES)'),
            $row('1_1', '1.1 Job vacancies solicited/reported', 1, true, [
                'curr_total' => $current['vacancies_total'], 'prev_total' => $previous['vacancies_total'], 'cum_total' => $cumulative['vacancies_total'],
            ]),
            $row('1_1_1', '1.1.1 Local', 2, false),
            $row('1_1_2', '1.1.2 Overseas', 2, false),
            $row('1_2', '1.2 Job applicants registered', 1, true, [
                'curr_total' => $current['registered_total'], 'curr_female' => $current['registered_female'],
                'prev_total' => $previous['registered_total'], 'prev_female' => $previous['registered_female'],
                'cum_total' => $cumulative['registered_total'], 'cum_female' => $cumulative['registered_female'],
            ]),
            $row('1_3', '1.3 Job applicants referred for', 1, true, [
                'curr_total' => $current['referred_total'], 'curr_female' => $current['referred_female'],
                'prev_total' => $previous['referred_total'], 'prev_female' => $previous['referred_female'],
                'cum_total' => $cumulative['referred_total'], 'cum_female' => $cumulative['referred_female'],
            ]),
            $row('1_3_1', '1.3.1 Job placement', 2, false),
            $row('1_3_1_local', '1.3.1 Local', 3, false),
            $row('1_3_1_overseas', '1.3.2 Overseas', 3, false),
            $row('1_3_2', '1.3.2 Training/employability enhancement', 2, false),
            $row('1_4', '1.4 Job applicants placed', 1, true, [
                'curr_total' => $current['placed_total'], 'curr_female' => $current['placed_female'],
                'prev_total' => $previous['placed_total'], 'prev_female' => $previous['placed_female'],
                'cum_total' => $cumulative['placed_total'], 'cum_female' => $cumulative['placed_female'],
            ]),
            $row('1_4_1', '1.4.1 Private sector (direct employers)', 2, true, [
                'curr_total' => $current['placed_private'], 'curr_female' => $current['placed_private_female'],
                'prev_total' => $previous['placed_private'], 'prev_female' => $previous['placed_private_female'],
                'cum_total' => $cumulative['placed_private'], 'cum_female' => $cumulative['placed_private_female'],
            ]),
            $row('1_4_2', '1.4.2 Government sector', 2, true, [
                'curr_total' => $current['placed_government'], 'curr_female' => $current['placed_government_female'],
                'prev_total' => $previous['placed_government'], 'prev_female' => $previous['placed_government_female'],
                'cum_total' => $cumulative['placed_government'], 'cum_female' => $cumulative['placed_government_female'],
            ]),
            $row('1_4_2_1', '1.4.2.1 Infrastructure related', 3, false),
            $row('1_4_3', '1.4.3 Overseas', 2, false),
            $row('1_5', '1.5 Special Program for Employment of Students (SPES)', 1, true, [
                'curr_total' => $current['spes_total'], 'curr_female' => $current['spes_female'],
                'prev_total' => $previous['spes_total'], 'cum_total' => $cumulative['spes_total'],
            ]),
            $row('1_5_1', '1.5.1 Youth beneficiaries placed', 2, true, [
                'curr_total' => $current['spes_total'], 'curr_female' => $current['spes_female'],
                'prev_total' => $previous['spes_total'], 'cum_total' => $cumulative['spes_total'],
            ]),
            $row('1_6', '1.6 Job Fairs conducted', 1, true, [
                'curr_total' => $jf($current, 'fairs_conducted'), 'prev_total' => $jf($previous, 'fairs_conducted'), 'cum_total' => $jf($cumulative, 'fairs_conducted'),
            ]),
            $row('1_6_1', '1.6.1 Local', 2, true, [
                'curr_total' => $jf($current, 'fairs_local'), 'prev_total' => $jf($previous, 'fairs_local'), 'cum_total' => $jf($cumulative, 'fairs_local'),
            ]),
            $row('1_6_2', '1.6.2 Overseas', 2, true, [
                'curr_total' => $jf($current, 'fairs_overseas'), 'prev_total' => $jf($previous, 'fairs_overseas'), 'cum_total' => $jf($cumulative, 'fairs_overseas'),
            ]),
            $row('1_6_3', '1.6.3 Local & Overseas', 2, true, [
                'curr_total' => $jf($current, 'fairs_both'), 'prev_total' => $jf($previous, 'fairs_both'), 'cum_total' => $jf($cumulative, 'fairs_both'),
            ]),
            $row('1_6_4', '1.6.4 Establishments/Employers Participated', 2, true, [
                'curr_total' => $jf($current, 'participating_companies'), 'prev_total' => $jf($previous, 'participating_companies'), 'cum_total' => $jf($cumulative, 'participating_companies'),
            ]),
            $row('1_6_4_1', '1.6.4.1 Local', 3, false),
            $row('1_6_4_2', '1.6.4.2 Overseas', 3, false),
            $row('1_6_5', '1.6.5 Job Vacancies solicited/reported', 2, true, [
                'curr_total' => $jf($current, 'vacancies_solicited'), 'prev_total' => $jf($previous, 'vacancies_solicited'), 'cum_total' => $jf($cumulative, 'vacancies_solicited'),
            ]),
            $row('1_6_5_1', '1.6.5.1 Local', 3, false),
            $row('1_6_5_2', '1.6.5.2 Overseas', 3, false),
            $row('1_6_6', '1.6.6 Job applicants registered', 2, true, [
                'curr_total' => $jf($current, 'applicants'), 'prev_total' => $jf($previous, 'applicants'), 'cum_total' => $jf($cumulative, 'applicants'),
            ]),
            $row('1_6_7', '1.6.7 Total applicants placed/Hired-on-the-Spot (HOTS)', 2, true, [
                'curr_total' => $jf($current, 'hots'), 'prev_total' => $jf($previous, 'hots'), 'cum_total' => $jf($cumulative, 'hots'),
            ]),
            $row('1_6_7_1', '1.6.7.1 Local', 3, false),
            $row('1_6_7_2', '1.6.7.2 Overseas', 3, false),

            $section('sec_lmi', 'B. LABOR MARKET INFORMATION (LMI) PROGRAM'),
            $row('lmi_1', '1. Individuals/institutions provided with labor market information', 1, false),
            $row('lmi_1_1', '1.1 Individuals reached', 2, false),
            $row('lmi_1_1_1', '1.1.1 Students', 3, false),
            $row('lmi_1_1_2', '1.1.2 Parents', 3, false),
            $row('lmi_1_1_3', '1.1.3 Researchers', 3, false),
            $row('lmi_1_1_4', '1.1.4 Jobseekers', 3, false),
            $row('lmi_1_2', '1.2 Institutions reached', 2, false),
            $row('lmi_1_2_1', '1.2.1 Schools', 3, false),
            $row('lmi_1_2_2', '1.2.2 Organizations/NGOs', 3, false),

            $section('sec_cg', 'C. CAREER GUIDANCE ADVOCACY PROGRAM'),
            $row('cg_1', '1. Career Guidance Advocacies conducted', 1, false),
            $row('cg_1_1', '1.1 Students/Parents covered', 2, false),
            $row('cg_1_2', '1.2 Schools/Colleges/Universities covered', 2, false),
            $row('cg_2', '2. Employment coaching conducted on job applicants', 1, false),
            $row('cg_2_1', '2.1 Job applicants coached', 2, false),

            $section('sec_airtip', 'D. AIR-TIP'),
            $row('airtip_1', '1. Anti-Illegal Recruitment/Trafficking in Person campaign activities', 1, false),
            $row('airtip_1_1', '1.1 Participants', 2, false),

            $section('sec_peis', 'E. PHILJOBNET/PEIS'),
            $row('peis_1', '1. Number of establishments registered', 1, true, [
                'curr_total' => $current['employers_registered'], 'prev_total' => $previous['employers_registered'], 'cum_total' => $cumulative['employers_registered'],
            ]),
            $row('peis_2', '2. Number of registered applicants', 1, false),
        ];
    }

    private function persistManualAdjustments(int $reportId, array $adjustments): array
    {
        $saved = [];
        foreach ($adjustments as $row) {
            if (blank($row['indicator_key'] ?? null) || blank($row['label'] ?? null)) {
                continue;
            }
            $saved[] = SprsManualAdjustment::updateOrCreate(
                ['analytics_report_id' => $reportId, 'indicator_key' => $row['indicator_key']],
                ['label' => $row['label'], 'total' => (int) ($row['total'] ?? 0), 'female' => (int) ($row['female'] ?? 0)],
            )->only(['indicator_key', 'label', 'total', 'female']);
        }

        return $saved;
    }

    private function persistSignatories(int $reportId, array $signatories): array
    {
        $saved = [];
        foreach (['prepared_by', 'checked_by', 'approved_by'] as $role) {
            $entry = $signatories[$role] ?? null;
            if (! is_array($entry) || blank($entry['name'] ?? null)) {
                continue;
            }
            SprsSignatory::updateOrCreate(
                ['analytics_report_id' => $reportId, 'role' => $role],
                ['name' => $entry['name'], 'position' => $entry['position'] ?? null],
            );
            $saved[$role] = ['name' => $entry['name'], 'position' => $entry['position'] ?? null];
        }

        return $saved;
    }

    /**
     * Full-form SPRS PDF matching the DOLE SPRS 2018 layout (current / previous /
     * cumulative columns, total + female, manual rows, and signatory block).
     */
    public function exportSprsPdf(int $id)
    {
        $admin = auth()->user();
        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $report = AnalyticsReport::findOrFail($id);
        $data = $report->data_summary ?? [];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.sprs_monthly', [
            'report' => $report,
            'data' => $data,
            'signatories' => $data['signatories'] ?? [],
            'manualAdjustments' => $data['manual_adjustments'] ?? [],
        ])->setPaper('a4', 'portrait');

        return $pdf->download('sprs-' . str_replace(' ', '-', strtolower($data['period'] ?? $report->report_id)) . '.pdf');
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();

        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $report = AnalyticsReport::findOrFail($id);

        return response()->json($report);
    }

    public function destroy(int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $report = AnalyticsReport::findOrFail($id);
        $report->delete();

        return response()->json(['message' => 'Report deleted successfully']);
    }

    private function generateReportData(string $category, Carbon $start, Carbon $end): array
    {
        switch ($category) {
            case 'registration':
                return $this->registrationReport($start, $end);
            case 'placement':
                return $this->placementReport($start, $end);
            case 'vacancies':
                return $this->vacanciesReport($start, $end);
            case 'programs':
                return $this->programsReport($start, $end);
            default:
                return [];
        }
    }

    private function registrationReport(Carbon $start, Carbon $end): array
    {
        $registrations = [];
        $current = $start->copy();

        while ($current <= $end) {
            $count = JobSeeker::whereBetween('created_at', [
                $current->startOfMonth(),
                $current->endOfMonth(),
            ])->count();

            $registrations[] = [
                'month' => $current->format('Y-m'),
                'count' => $count,
            ];

            $current->addMonth();
        }

        return [
            'registrations_by_month' => $registrations,
            'total_registered' => JobSeeker::whereBetween('created_at', [$start, $end])->count(),
        ];
    }

    private function placementReport(Carbon $start, Carbon $end): array
    {
        $placements = [];
        $current = $start->copy();

        while ($current <= $end) {
            $count = Application::where('status', 'hired')
                ->whereBetween('created_at', [
                    $current->startOfMonth(),
                    $current->endOfMonth(),
                ])
                ->count();

            $placements[] = [
                'month' => $current->format('Y-m'),
                'count' => $count,
            ];

            $current->addMonth();
        }

        $totalPlaced = Application::where('status', 'hired')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $totalApplicants = Application::whereBetween('created_at', [$start, $end])->count();

        $placementRate = $totalApplicants > 0 ? ($totalPlaced / $totalApplicants) * 100 : 0;

        return [
            'placements_by_month' => $placements,
            'total_placed' => $totalPlaced,
            'total_applicants' => $totalApplicants,
            'placement_rate_percent' => round($placementRate, 2),
        ];
    }

    private function vacanciesReport(Carbon $start, Carbon $end): array
    {
        $vacancies = JobVacancy::whereBetween('created_at', [$start, $end])
            ->selectRaw('industry_type, COUNT(*) as count')
            ->groupBy('industry_type')
            ->get()
            ->map(fn($v) => [
                'industry' => $v->industry_type ?? 'Unknown',
                'count' => $v->count,
            ]);

        return [
            'vacancies_by_industry' => $vacancies,
            'total_vacancies' => JobVacancy::whereBetween('created_at', [$start, $end])->count(),
        ];
    }

    private function programsReport(Carbon $start, Carbon $end): array
    {
        $programStats = [];

        $programs = GovernmentProgram::withCount([
            'programApplications as total_applicants',
            'programApplications as approved' => fn($q) => $q->where('status', 'approved'),
            'programApplications as rejected' => fn($q) => $q->where('status', 'rejected'),
            'programApplications as pending' => fn($q) => $q->where('status', 'pending'),
        ])->whereBetween('created_at', [$start, $end])->get();

        foreach ($programs as $program) {
            $programStats[] = [
                'program_name' => $program->program_name,
                'total_applicants' => $program->total_applicants,
                'approved' => $program->approved,
                'rejected' => $program->rejected,
                'pending' => $program->pending,
            ];
        }

        return [
            'programs' => $programStats,
            'total_programs' => $programs->count(),
        ];
    }
}
