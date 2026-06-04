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
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    public function generate(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'report_category' => 'required|in:placement,registration,vacancies,programs',
            'coverage_start' => 'required|date',
            'coverage_end' => 'required|date|after:coverage_start',
        ]);

        $dataSummary = $this->generateReportData(
            $validated['report_category'],
            Carbon::parse($validated['coverage_start']),
            Carbon::parse($validated['coverage_end'])
        );

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

        $programs = GovernmentProgram::whereBetween('created_at', [$start, $end])->get();

        foreach ($programs as $program) {
            $programStats[] = [
                'program_name' => $program->program_name,
                'total_applicants' => $program->programApplications()->count(),
                'approved' => $program->programApplications()->where('status', 'approved')->count(),
                'rejected' => $program->programApplications()->where('status', 'rejected')->count(),
                'pending' => $program->programApplications()->where('status', 'pending')->count(),
            ];
        }

        return [
            'programs' => $programStats,
            'total_programs' => $programs->count(),
        ];
    }
}
