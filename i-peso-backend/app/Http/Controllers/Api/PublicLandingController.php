<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobFair;
use App\Models\JobVacancy;
use App\Services\JobFairService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Read-only data for the logged-out landing page: a handful of open vacancies,
 * the next public job fairs, and four headline counts.
 *
 * Deliberately thin. A visitor sees what a vacancy is and who is hiring — the
 * same facts printed on a PESO job board — but never applicant data, match
 * scores, contact details, admin holds or anything per-seeker. Applying still
 * requires an account, which is the point of the "see all N matches" prompt.
 */
class PublicLandingController extends Controller
{
    private const FEATURED_LIMIT = 6;

    private const FAIR_LIMIT = 3;

    /** Vacancies a job seeker could actually apply to right now. */
    private function openVacancies(): Builder
    {
        return JobVacancy::query()
            ->where('status', 'active')
            ->whereNull('admin_hold_at')
            ->where(function (Builder $query) {
                $query->whereNull('application_deadline')
                    ->orWhereDate('application_deadline', '>=', today());
            })
            ->whereHas('employer', fn (Builder $employer) => $employer->where('verification_status', 'verified'));
    }

    public function featuredJobs(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'location' => ['nullable', 'string', 'max:80'],
        ]);

        $query = $this->openVacancies();

        if (filled($validated['q'] ?? null)) {
            $keyword = '%'.str_replace(['%', '_'], ['\%', '\_'], trim($validated['q'])).'%';
            $query->where(function (Builder $match) use ($keyword) {
                $match->where('job_title', 'like', $keyword)
                    ->orWhere('general_term', 'like', $keyword)
                    ->orWhereHas('employer', fn (Builder $employer) => $employer
                        ->where('company_name', 'like', $keyword)
                        ->orWhere('trade_name', 'like', $keyword));
            });
        }

        if (filled($validated['location'] ?? null)) {
            $place = '%'.str_replace(['%', '_'], ['\%', '\_'], trim($validated['location'])).'%';
            $query->where(function (Builder $match) use ($place) {
                $match->where('barangay', 'like', $place)
                    ->orWhere('city_municipality', 'like', $place)
                    ->orWhere('location', 'like', $place);
            });
        }

        $total = (clone $query)->count();

        $jobs = $query
            ->with('employer:employer_id,company_name,trade_name')
            ->latest()
            ->limit(self::FEATURED_LIMIT)
            ->get()
            ->map(fn (JobVacancy $job) => [
                'post_id' => $job->post_id,
                'job_title' => $job->job_title,
                'company_name' => $job->employer?->trade_name ?: $job->employer?->company_name,
                'barangay' => $job->barangay,
                'city_municipality' => $job->city_municipality,
                'employment_type' => $job->employment_type,
                'work_setup' => $job->work_setup,
                'salary_min' => $job->hide_salary ? null : $job->salary_min,
                'salary_max' => $job->hide_salary ? null : $job->salary_max,
                'salary_type' => $job->hide_salary ? null : $job->salary_type,
                'posted_at' => $job->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $jobs, 'meta' => ['total' => $total]]);
    }

    public function jobFairs(): JsonResponse
    {
        $fairs = $this->upcomingFairs()
            ->withCount('employerJoins')
            ->orderByRaw('COALESCE(start_date, event_date) asc')
            ->limit(self::FAIR_LIMIT)
            ->get()
            ->map(fn (JobFair $fair) => [
                'job_fair_id' => $fair->job_fair_id,
                'title' => $fair->title,
                'venue' => $fair->venue,
                'barangay' => $fair->barangay,
                'city_municipality' => $fair->city_municipality,
                'date' => ($fair->start_date ?? $fair->event_date)?->format('Y-m-d'),
                'end_date' => $fair->end_date?->format('Y-m-d'),
                'start_time' => $fair->start_time,
                'end_time' => $fair->end_time,
                'employers_count' => (int) $fair->employer_joins_count,
            ]);

        return response()->json(['data' => $fairs]);
    }

    public function stats(): JsonResponse
    {
        // Headline numbers change slowly and this is the most-hit public page.
        $stats = Cache::remember('public-landing-stats', now()->addMinutes(10), fn () => [
            'open_vacancies' => $this->openVacancies()->count(),
            'verified_employers' => Employer::where('verification_status', 'verified')->count(),
            'placed_this_year' => Application::where('status', 'hired')
                ->whereYear('updated_at', now()->year)
                ->count(),
            'upcoming_job_fairs' => $this->upcomingFairs()->count(),
        ]);

        return response()->json(['data' => $stats]);
    }

    private function upcomingFairs(): Builder
    {
        return JobFair::query()
            ->where('is_public', true)
            ->whereIn('status', JobFairService::MAP_STATUSES)
            ->whereRaw('COALESCE(end_date, start_date, event_date) >= ?', [today()->toDateString()]);
    }
}
