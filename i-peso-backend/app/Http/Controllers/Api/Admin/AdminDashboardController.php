<?php

// i-peso-backend/app/Http/Controllers/Api/Admin/AdminDashboardController.php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Application;
use App\Models\Employer;
use App\Models\GovernmentProgram;
use App\Models\JobFair;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Services\GovernmentProgramAnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function stats(GovernmentProgramAnalyticsService $programAnalytics): JsonResponse
    {
        $admin = auth()->user();

        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $totalSeekers = JobSeeker::count();
        $totalEmployers = Employer::count();
        $activeVacancies = JobVacancy::where('status', 'active')->count();
        $applicationsThisMonth = Application::whereBetween('created_at', [
            Carbon::now()->startOfMonth(),
            Carbon::now()->endOfMonth(),
        ])->count();

        $hiredThisMonth = Application::where('status', 'hired')
            ->whereBetween('updated_at', [
                Carbon::now()->startOfMonth(),
                Carbon::now()->endOfMonth(),
            ])->count();

        $rejectedThisMonth = Application::where('status', 'rejected')
            ->whereBetween('updated_at', [
                Carbon::now()->startOfMonth(),
                Carbon::now()->endOfMonth(),
            ])->count();

        $profileCompletionRate = $totalSeekers > 0
            ? (JobSeeker::where('profile_completed', true)->count() / $totalSeekers) * 100
            : 0;

        $openPrograms = GovernmentProgram::where('status', 'open')->count();
        $upcomingJobFairs = JobFair::where('status', 'upcoming')->count();
        $pendingEmployerVerifications = Employer::where('verification_status', 'pending')->count();

        // Recent registrations (last 10)
        $recentRegistrations = collect();

        $seekers = JobSeeker::latest('created_at')
            ->take(5)
            ->get(['seeker_id as id', 'first_name', 'last_name', 'email', 'created_at'])
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->first_name.' '.$s->last_name,
                'role' => 'Seeker',
                'email' => $s->email,
                'registered_at' => $s->created_at,
            ]);

        $employers = Employer::latest('created_at')
            ->take(5)
            ->get(['employer_id as id', 'company_name', 'email', 'created_at'])
            ->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->company_name,
                'role' => 'Employer',
                'email' => $e->email,
                'registered_at' => $e->created_at,
            ]);

        $recentRegistrations = $seekers->concat($employers)
            ->sortByDesc('registered_at')
            ->take(10)
            ->values();

        // Recent applications (last 5)
        $recentApplications = Application::with(['jobVacancy', 'jobSeeker'])
            ->latest('created_at')
            ->take(5)
            ->get()
            ->map(fn ($app) => [
                'id' => $app->apply_id,
                'seeker_name' => $app->jobSeeker?->first_name.' '.$app->jobSeeker?->last_name,
                'job_title' => $app->jobVacancy?->job_title,
                'company_name' => $app->jobVacancy?->employer?->company_name,
                'match_percentage' => $app->match_percentage ?? 0,
                'status' => $app->status,
                'created_at' => $app->created_at,
            ]);

        return response()->json([
            'total_seekers' => $totalSeekers,
            'total_employers' => $totalEmployers,
            'active_vacancies' => $activeVacancies,
            'applications_this_month' => $applicationsThisMonth,
            'hired_this_month' => $hiredThisMonth,
            'rejected_this_month' => $rejectedThisMonth,
            'profile_completion_rate' => round($profileCompletionRate, 2),
            'open_programs' => $openPrograms,
            'upcoming_job_fairs' => $upcomingJobFairs,
            'pending_verifications' => $pendingEmployerVerifications,
            'pending_employer_verifications' => $pendingEmployerVerifications,
            'recent_registrations' => $recentRegistrations,
            'recent_applications' => $recentApplications,
            'government_programs' => $programAnalytics->summary(),
        ]);
    }
}
