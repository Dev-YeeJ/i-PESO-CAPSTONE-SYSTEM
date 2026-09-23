<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Employer;
use App\Models\InterviewSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployerDashboardController extends Controller
{
    /**
     * Get aggregate statistics and recent activity for the Employer Dashboard.
     * GET /api/employer/dashboard-stats
     */
    public function stats(Request $request): JsonResponse
    {
        /** @var Employer $employer */
        $employer = $request->user();
        abort_unless($employer instanceof Employer, 403, 'Employer account required.');

        // Get all vacancy IDs owned by this employer to scope applications
        $vacancyIds = $employer->vacancies()->pluck('post_id');

        // 1. KPIs
        $activeVacancies = $employer->vacancies()->where('status', 'active')->count();
        $totalPendingApplications = Application::whereIn('post_id', $vacancyIds)->where('status', 'new')->count();
        $totalHired = Application::whereIn('post_id', $vacancyIds)->where('status', 'hired')->count();
        
        $upcomingInterviews = InterviewSchedule::whereIn('apply_id', function ($query) use ($vacancyIds) {
            $query->select('apply_id')->from('applications')->whereIn('post_id', $vacancyIds);
        })
        ->where('scheduled_at', '>=', now())
        ->where('status', 'scheduled')
        ->count();

        // 2. Trend: Applications per day over the last 14 days
        $trendStart = now()->subDays(13)->startOfDay();
        $applicationsTrend = Application::whereIn('post_id', $vacancyIds)
            ->where('created_at', '>=', $trendStart)
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get()
            ->keyBy('date');

        // Fill in missing days with 0
        $chartData = [];
        for ($i = 13; $i >= 0; $i--) {
            $dateStr = now()->subDays($i)->format('Y-m-d');
            $chartData[] = [
                'date' => now()->subDays($i)->format('M d'),
                'count' => isset($applicationsTrend[$dateStr]) ? (int)$applicationsTrend[$dateStr]->count : 0,
            ];
        }

        // 3. Recent Activity: 5 most recent applications
        $recentApplications = Application::with(['jobSeeker:seeker_id,first_name,last_name', 'jobVacancy:post_id,job_title'])
            ->whereIn('post_id', $vacancyIds)
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($app) {
                return [
                    'apply_id' => $app->apply_id,
                    'seeker_name' => $app->jobSeeker->first_name . ' ' . $app->jobSeeker->last_name,
                    'job_title' => $app->jobVacancy->job_title,
                    'status' => $app->status,
                    'created_at' => $app->created_at,
                ];
            });

        return response()->json([
            'kpis' => [
                'active_vacancies' => $activeVacancies,
                'pending_applications' => $totalPendingApplications,
                'upcoming_interviews' => $upcomingInterviews,
                'total_hired' => $totalHired,
            ],
            'chart' => $chartData,
            'recent_activity' => $recentApplications,
        ]);
    }
}
