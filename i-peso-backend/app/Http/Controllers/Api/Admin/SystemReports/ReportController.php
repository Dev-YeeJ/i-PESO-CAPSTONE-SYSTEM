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
        ]);

        $month = clone \Carbon\Carbon::createFromDate($validated['year'], $validated['month'], 1);
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        // 1.1 Job Vacancies Solicited
        $vacancies = JobVacancy::with('employer')->whereBetween('created_at', [$start, $end])->get();
        $localVacancies = $vacancies->sum('vacancies_count');
        $overseasVacancies = 0; 

        // 1.2 Applicants Registered
        $seekers = JobSeeker::whereBetween('created_at', [$start, $end])->get();
        $registeredTotal = $seekers->count();
        $registeredFemale = $seekers->where('gender', 'Female')->count();

        // 1.3 Applicants referred
        $referredQuery = Application::whereBetween('created_at', [$start, $end]);
        $referredTotal = $referredQuery->count();
        $referredFemale = Application::whereBetween('created_at', [$start, $end])
            ->whereHas('jobSeeker', fn($q) => $q->where('sex', 'female'))
            ->count();

        // 1.4 Applicants Placed
        $placedQuery = Application::where('status', 'hired')
                             ->whereBetween('status_changed_at', [$start, $end]);
        $placedTotal = $placedQuery->count();
        $placedFemale = Application::where('status', 'hired')
                             ->whereBetween('status_changed_at', [$start, $end])
                             ->whereHas('jobSeeker', fn($q) => $q->where('sex', 'female'))
                             ->count();

        $placedGovernment = Application::where('status', 'hired')
                             ->whereBetween('status_changed_at', [$start, $end])
                             ->whereHas('jobVacancy.employer', fn($q) => 
                                 $q->where('company_type', 'like', '%Government%')
                                   ->orWhere('company_type', 'like', '%LGU%')
                             )->count();
        $placedPrivate = $placedTotal - $placedGovernment;

        // 1.5 SPES
        $spesPlaced = Application::where('status', 'hired')
                             ->whereBetween('status_changed_at', [$start, $end])
                             ->whereHas('jobVacancy', fn($q) => $q->where('spes_tupad_eligible', true))
                             ->count();
        $spesFemale = Application::where('status', 'hired')
                             ->whereBetween('status_changed_at', [$start, $end])
                             ->whereHas('jobVacancy', fn($q) => $q->where('spes_tupad_eligible', true))
                             ->whereHas('jobSeeker', fn($q) => $q->where('sex', 'female'))
                             ->count();

        // PEIS Registrations
        $employersRegistered = \App\Models\Employer::whereBetween('created_at', [$start, $end])->count();

        $jobFairs = \App\Models\JobFair::query()
            ->whereBetween(DB::raw('COALESCE(start_date, event_date)'), [$start->toDateString(), $end->toDateString()])
            ->whereIn('status', ['completed', 'closed'])
            ->get();
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

        $data = [
            'period' => $month->format('F Y'),
            '1_1_vacancies' => [
                'total' => $localVacancies + $overseasVacancies,
                'local' => $localVacancies,
                'overseas' => $overseasVacancies,
            ],
            '1_2_registered' => [
                'total' => $registeredTotal,
                'female' => $registeredFemale,
            ],
            '1_3_referred' => [
                'total' => $referredTotal,
                'female' => $referredFemale,
            ],
            '1_4_placed' => [
                'total' => $placedTotal,
                'female' => $placedFemale,
                'private' => $placedPrivate,
                'government' => $placedGovernment,
                'overseas' => 0,
            ],
            '1_5_spes' => [
                'total' => $spesPlaced,
                'female' => $spesFemale,
            ],
            '1_6_job_fairs' => $jobFairSection,
            'peis' => [
                'establishments' => $employersRegistered,
                'applicants' => $registeredTotal,
            ]
        ];

        // Save report history
        $report = AnalyticsReport::create([
            'admin_id' => $admin->admin_id,
            'title' => "SPRS Report - " . $month->format('F Y'),
            'report_category' => 'sprs',
            'coverage_start' => $start,
            'coverage_end' => $end,
            'data_summary' => $data,
            'status' => 'submitted',
        ]);

        return response()->json([
            'message' => 'SPRS Report generated',
            'data' => $data,
            'report' => $report
        ], 200);
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
