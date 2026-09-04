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

        // Employers report every new hire, not only PESO referrals, so approved
        // reports are a second source of placements alongside platform hires.
        // Anyone counted from both sides — hired through i-PESO *and* listed on
        // their employer's monthly sheet — must only be counted once, or the
        // figure submitted to DOLE overstates placements.
        $employerReportedPlaced = 0;
        $employerReportedFemale = 0;
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
        }

        $spesPlaced = Application::where('status', 'hired')->whereBetween('status_changed_at', [$start, $end])
            ->whereHas('jobVacancy', fn ($q) => $q->where('spes_tupad_eligible', true))->count();
        $spesFemale = Application::where('status', 'hired')->whereBetween('status_changed_at', [$start, $end])
            ->whereHas('jobVacancy', fn ($q) => $q->where('spes_tupad_eligible', true))
            ->whereHas('jobSeeker', fn ($q) => $q->where('sex', 'female'))->count();

        $employersRegistered = \App\Models\Employer::whereBetween('created_at', [$start, $end])->count();

        $jobFairs = \App\Models\JobFair::query()
            ->whereBetween(DB::raw('COALESCE(start_date, event_date)'), [$start->toDateString(), $end->toDateString()])
            ->whereIn('status', ['completed', 'closed'])->get();
        $jobFairSection = [
            'fairs_conducted' => $jobFairs->count(), 'participating_companies' => 0,
            'vacancies_solicited' => 0, 'applicants' => 0, 'hots' => 0,
            'near_hired' => 0, 'rejected' => 0, 'self_service_reports' => 0, 'admin_proxy_reports' => 0,
        ];
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
            'placed_private' => $placedOnPlatform - $placedGovernment,
            'placed_government' => $placedGovernment,
            'placed_on_platform' => $placedOnPlatform,
            'placed_employer_reported' => $employerReportedPlaced,
            'spes_total' => $spesPlaced,
            'spes_female' => $spesFemale,
            'employers_registered' => $employersRegistered,
            'job_fairs' => $jobFairSection,
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
