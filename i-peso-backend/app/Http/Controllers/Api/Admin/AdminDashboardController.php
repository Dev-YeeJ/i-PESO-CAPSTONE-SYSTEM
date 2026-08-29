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
use App\Models\ProgramApplication;
use App\Services\GovernmentProgramAnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminDashboardController extends Controller
{
    public function stats(Request $request, GovernmentProgramAnalyticsService $programAnalytics): JsonResponse
    {
        $admin = auth()->user();

        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $filters = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        // Defaults to the current calendar month, which is what the dashboard
        // reported before a range could be chosen.
        $from = isset($filters['date_from'])
            ? Carbon::parse($filters['date_from'])->startOfDay()
            : Carbon::now()->startOfMonth();
        $to = isset($filters['date_to'])
            ? Carbon::parse($filters['date_to'])->endOfDay()
            : Carbon::now()->endOfMonth();

        // Immediately preceding window of the same length, for period-over-period change.
        // Carbon returns a float here (the end-of-day 23:59:59.999999 makes it 28.999…), so
        // compare date-only and cast to int — the dashboard prints this value verbatim.
        $lengthInDays = max(1, (int) $from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay()) + 1);
        $previousTo = (clone $from)->subSecond();
        $previousFrom = (clone $from)->subDays($lengthInDays)->startOfDay();

        $current = $this->periodMetrics($from, $to);
        $previous = $this->periodMetrics($previousFrom, $previousTo);

        $totalSeekers = JobSeeker::count();
        $totalEmployers = Employer::count();
        $activeVacancies = JobVacancy::where('status', 'active')->count();
        $pendingEmployerVerifications = Employer::where('verification_status', 'pending')->count();

        $profileCompletionRate = $totalSeekers > 0
            ? (JobSeeker::where('profile_completed', true)->count() / $totalSeekers) * 100
            : 0;

        return response()->json([
            'range' => [
                'date_from' => $from->toDateString(),
                'date_to' => $to->toDateString(),
                'days' => $lengthInDays,
                'compared_to' => [
                    'date_from' => $previousFrom->toDateString(),
                    'date_to' => $previousTo->toDateString(),
                ],
            ],

            'total_seekers' => $totalSeekers,
            'total_employers' => $totalEmployers,
            'active_vacancies' => $activeVacancies,
            'profile_completion_rate' => round($profileCompletionRate, 2),
            'open_programs' => GovernmentProgram::where('status', 'open')->count(),
            'upcoming_job_fairs' => JobFair::where('status', 'upcoming')->count(),
            'pending_verifications' => $pendingEmployerVerifications,
            'pending_employer_verifications' => $pendingEmployerVerifications,

            // Retained key names: these now describe the selected range, which is
            // the current month unless the admin narrows it.
            'applications_this_month' => $current['applications'],
            'hired_this_month' => $current['hired'],
            'rejected_this_month' => $current['rejected'],

            'period' => $current,
            'previous_period' => $previous,
            'trends' => [
                'applications' => $this->percentChange($current['applications'], $previous['applications']),
                'hired' => $this->percentChange($current['hired'], $previous['hired']),
                'rejected' => $this->percentChange($current['rejected'], $previous['rejected']),
                'new_seekers' => $this->percentChange($current['new_seekers'], $previous['new_seekers']),
                'new_employers' => $this->percentChange($current['new_employers'], $previous['new_employers']),
                'new_vacancies' => $this->percentChange($current['new_vacancies'], $previous['new_vacancies']),
            ],

            'attention' => $this->attentionItems($pendingEmployerVerifications),
            // Gated on top of the dashboard's own module-free access: these two
            // carry seeker/employer/applicant PII, so an admin without the
            // corresponding module grant gets an empty list rather than data
            // they can't reach through the (permission-gated) list endpoints.
            'recent_registrations' => $admin->hasModule('constituent_crm') ? $this->recentRegistrations() : [],
            'recent_applications' => $admin->hasModule('employment_hub') ? $this->recentApplications() : [],
            'government_programs' => $programAnalytics->summary(),
        ]);
    }

    /** @return array<string, int> */
    private function periodMetrics(Carbon $from, Carbon $to): array
    {
        return [
            'applications' => Application::whereBetween('created_at', [$from, $to])->count(),
            'hired' => Application::where('status', 'hired')->whereBetween('updated_at', [$from, $to])->count(),
            'rejected' => Application::where('status', 'rejected')->whereBetween('updated_at', [$from, $to])->count(),
            'new_seekers' => JobSeeker::whereBetween('created_at', [$from, $to])->count(),
            'new_employers' => Employer::whereBetween('created_at', [$from, $to])->count(),
            'new_vacancies' => JobVacancy::whereBetween('created_at', [$from, $to])->count(),
        ];
    }

    /** Whole-percent change, rounded. Growth from zero is reported as +100%. */
    private function percentChange(int $current, int $previous): int
    {
        if ($previous === 0) {
            return $current === 0 ? 0 : 100;
        }

        return (int) round((($current - $previous) / $previous) * 100);
    }

    /**
     * Work that is waiting on an administrator, newest concern first. Each entry
     * carries the admin route that resolves it.
     */
    private function attentionItems(int $pendingEmployerVerifications): array
    {
        $items = [];

        if ($pendingEmployerVerifications > 0) {
            $waitingLong = Employer::where('verification_status', 'pending')
                ->where('created_at', '<=', now()->subDays(7))
                ->count();

            $items[] = [
                'key' => 'employer_verifications',
                'label' => 'Employer accreditations pending',
                'count' => $pendingEmployerVerifications,
                'severity' => $waitingLong > 0 ? 'critical' : 'warning',
                'detail' => $waitingLong > 0
                    ? "{$waitingLong} have been waiting a week or longer."
                    : 'All within the last seven days.',
                'link' => '/admin/verification-queue',
            ];
        }

        $pendingProgramApplications = ProgramApplication::whereIn('application_status', ['pending', 'under_review'])->count();
        if ($pendingProgramApplications > 0) {
            $items[] = [
                'key' => 'program_applications',
                'label' => 'Program applications awaiting review',
                'count' => $pendingProgramApplications,
                'severity' => 'warning',
                'detail' => 'Seekers waiting on a slot decision.',
                'link' => '/admin/government-programs',
            ];
        }

        if (Schema::hasTable('placement_report_uploads')) {
            $pendingPlacements = DB::table('placement_report_uploads')
                ->where('status', 'pending_review')
                ->count();

            if ($pendingPlacements > 0) {
                $items[] = [
                    'key' => 'placement_reports',
                    'label' => 'Placement reports pending review',
                    'count' => $pendingPlacements,
                    'severity' => 'warning',
                    'detail' => 'Employer submissions awaiting DOLE validation.',
                    'link' => '/admin/placement-reports',
                ];
            }
        }

        if (Schema::hasTable('sms_notifications')) {
            $failedSms = DB::table('sms_notifications')
                ->where('status', 'failed')
                ->where('created_at', '>=', now()->subDays(7))
                ->count();

            if ($failedSms > 0) {
                $items[] = [
                    'key' => 'failed_sms',
                    'label' => 'SMS deliveries failed this week',
                    'count' => $failedSms,
                    'severity' => 'critical',
                    'detail' => 'Constituents may not have received their notice.',
                    'link' => '/admin/sms-notifications',
                ];
            }
        }

        return $items;
    }

    private function recentRegistrations(): array
    {
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

        return $seekers->concat($employers)
            ->sortByDesc('registered_at')
            ->take(10)
            ->values()
            ->all();
    }

    private function recentApplications(): array
    {
        return Application::with(['jobVacancy.employer', 'jobSeeker'])
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
            ])
            ->all();
    }
}
