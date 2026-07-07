<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Employer;
use App\Models\InterviewSchedule;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminAnalyticsService
{
    private const TOP_LIMIT = 10;

    public function snapshot(array $filters): array
    {
        $range = $this->range($filters);
        $filters['date_from'] = $range['from']->toDateString();
        $filters['date_to'] = $range['to']->toDateString();
        $filters['period'] = $filters['period'] ?? 'monthly';

        ksort($filters);
        $cacheKey = 'admin-analytics:snapshot:v2:'.hash('sha256', json_encode($filters));

        return Cache::remember($cacheKey, now()->addSeconds(60), fn () => [
            'meta' => [
                'filters' => $filters,
                'generated_at' => now()->toIso8601String(),
                'top_list_limit' => self::TOP_LIMIT,
                'unemployment_history_available' => false,
                'unemployment_note' => 'Historical employment-status logs are not available. Current employment status is shown instead of a fabricated unemployment trend.',
            ],
            'summary' => $this->summary($filters, $range),
            'trends' => $this->trends($filters, $range),
            'distributions' => $this->distributions($filters, $range),
            'top_lists' => $this->topLists($filters, $range),
            'job_fair_analytics' => $this->jobFairAnalytics($range),
            'forecast' => $this->forecast($filters, $range),
        ]);
    }

    public function options(): array
    {
        return Cache::remember('admin-analytics:options:v1', now()->addMinutes(10), fn () => [
            'provinces' => JobSeeker::query()->whereNotNull('address_province')->distinct()->orderBy('address_province')->pluck('address_province')->values(),
            'cities' => JobSeeker::query()->whereNotNull('address_municipality_city')->distinct()->orderBy('address_municipality_city')->pluck('address_municipality_city')->values(),
            'barangays' => JobSeeker::query()->whereNotNull('address_barangay')->distinct()->orderBy('address_barangay')->pluck('address_barangay')->values(),
            'broad_fields' => JobVacancy::query()->whereNotNull('general_term')->distinct()->orderBy('general_term')->pluck('general_term')->values(),
            'occupations' => DB::table('occupations')->join('job_vacancies', 'job_vacancies.occupation_id', '=', 'occupations.id')
                ->select('occupations.id', 'occupations.title')->distinct()->orderBy('occupations.title')->limit(250)->get(),
            'application_statuses' => ['pending', 'reviewed', 'shortlisted', 'interview', 'hired', 'rejected', 'withdrawn'],
            'vacancy_statuses' => ['active', 'closed', 'draft'],
            'employer_verification_statuses' => ['pending', 'verified', 'rejected'],
        ]);
    }

    public function reportData(string $category, array $filters): array
    {
        $snapshot = $this->snapshot($filters);

        return match ($category) {
            'registration', 'job_seeker_summary' => ['summary' => $snapshot['summary'], 'registrations' => $snapshot['trends']['registered_job_seekers'], 'demographics' => $snapshot['distributions']],
            'employer_summary' => ['summary' => $snapshot['summary'], 'verification' => $snapshot['distributions']['employer_verification'], 'companies' => $snapshot['top_lists']['most_active_hiring_companies']],
            'vacancies', 'vacancy_summary' => ['summary' => $snapshot['summary'], 'vacancy_postings' => $snapshot['trends']['vacancy_postings'], 'vacancy_status' => $snapshot['distributions']['vacancy_status'], 'categories' => $snapshot['top_lists']['vacancies_by_category']],
            'application_status' => ['summary' => $snapshot['summary'], 'applications' => $snapshot['trends']['job_applications_submitted'], 'status' => $snapshot['distributions']['application_status']],
            'placement', 'hired_applicants' => ['summary' => $snapshot['summary'], 'hired_over_time' => $snapshot['trends']['hired_applicants'], 'companies' => $snapshot['top_lists']['companies_with_highest_hires']],
            'skills_distribution' => ['job_seeker_skills' => $snapshot['top_lists']['job_seeker_skills'], 'vacancy_demanded_skills' => $snapshot['top_lists']['vacancy_demanded_skills']],
            'most_applied_categories' => ['categories' => $snapshot['top_lists']['most_applied_job_categories']],
            'most_hiring_companies' => ['active_hiring' => $snapshot['top_lists']['most_active_hiring_companies'], 'vacancies' => $snapshot['top_lists']['companies_with_most_vacancies'], 'hires' => $snapshot['top_lists']['companies_with_highest_hires']],
            'location_distribution' => ['job_seekers' => $snapshot['distributions']['job_seeker_locations'], 'vacancies' => $snapshot['distributions']['vacancy_locations']],
            'employment_trends' => ['summary' => $snapshot['summary'], 'hired' => $snapshot['trends']['hired_applicants'], 'employment_status' => $snapshot['distributions']['employment_status'], 'note' => $snapshot['meta']['unemployment_note']],
            default => $snapshot,
        };
    }

    private function summary(array $filters, array $range): array
    {
        $seekers = $this->seekerQuery($filters, $range);
        $employers = $this->employerQuery($filters, $range);
        $vacancies = $this->vacancyQuery($filters, $range);
        $applications = $this->applicationQuery($filters, $range);
        $seekerSummary = (clone $seekers)->selectRaw(
            "COUNT(*) AS total, SUM(CASE WHEN profile_completed = 1 THEN 1 ELSE 0 END) AS complete_profiles, SUM(CASE WHEN profile_completed = 0 THEN 1 ELSE 0 END) AS incomplete_profiles, SUM(CASE WHEN employment_status = 'unemployed' THEN 1 ELSE 0 END) AS unemployed"
        )->first();
        $employerSummary = (clone $employers)->selectRaw(
            "COUNT(*) AS total, SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) AS verified"
        )->first();
        $vacancySummary = (clone $vacancies)->selectRaw(
            "COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed"
        )->first();
        $applicationSummary = (clone $applications)->selectRaw(
            "COUNT(*) AS total, SUM(CASE WHEN applications.status = 'pending' THEN 1 ELSE 0 END) AS pending"
        )->first();
        $hiredCount = $this->applicationQuery($filters, $range, 'applications.status_changed_at')
            ->where('applications.status', 'hired')
            ->count();
        $totalSeekers = (int) ($seekerSummary->total ?? 0);

        $activeParticipants = $this->seekerQuery($filters, $range, false)->where(function (Builder $query) use ($range) {
            $query->whereBetween('updated_at', [$range['from'], $range['to']])
                ->orWhereHas('applications', fn (Builder $activity) => $activity->whereBetween('created_at', [$range['from'], $range['to']]))
                ->orWhereHas('programApplications', fn (Builder $activity) => $activity->whereBetween('created_at', [$range['from'], $range['to']]));
        })->count();

        $jobFairSummary = Schema::hasTable('job_fair_result_reports')
            ? DB::table('job_fair_result_reports')->whereBetween('submitted_at', [$range['from'], $range['to']])->selectRaw(
                'COUNT(DISTINCT job_fair_id) AS fairs, COUNT(*) AS companies, SUM(total_vacancies_offered) AS vacancies, SUM(total_applicants) AS applicants, SUM(total_hots) AS hots, SUM(total_near_hired) AS near_hired, SUM(total_rejected) AS rejected'
            )->first()
            : null;
        $jobFairsConducted = Schema::hasTable('job_fairs')
            ? DB::table('job_fairs')->whereIn('status', ['closed', 'completed'])
                ->whereBetween(DB::raw('COALESCE(start_date, event_date)'), [$range['from']->toDateString(), $range['to']->toDateString()])->count()
            : 0;

        $scheduledInterviews = InterviewSchedule::query()
            ->where('status', 'scheduled')
            ->whereHas('application', function (Builder $query) use ($filters, $range) {
                $this->applyApplicationFilters($query, $filters, $range);
            })->count();

        return [
            'total_registered_applicants' => $totalSeekers,
            'total_job_seekers' => $totalSeekers,
            'complete_profiles' => (int) ($seekerSummary->complete_profiles ?? 0),
            'incomplete_profiles' => (int) ($seekerSummary->incomplete_profiles ?? 0),
            'active_participants' => $activeParticipants,
            'active_participants_definition' => 'Unique job seekers who updated their profile or submitted a job or program application within the selected date range.',
            'total_employers' => (int) ($employerSummary->total ?? 0),
            'verified_employers' => (int) ($employerSummary->verified ?? 0),
            'total_job_vacancies' => (int) ($vacancySummary->total ?? 0),
            'active_job_vacancies' => (int) ($vacancySummary->active ?? 0),
            'closed_job_vacancies' => (int) ($vacancySummary->closed ?? 0),
            'total_applications' => (int) ($applicationSummary->total ?? 0),
            'hired_applicants' => $hiredCount,
            'pending_applications' => (int) ($applicationSummary->pending ?? 0),
            'unemployed_applicants' => (int) ($seekerSummary->unemployed ?? 0),
            'scheduled_interviews' => $scheduledInterviews,
            'job_fairs_conducted' => $jobFairsConducted,
            'job_fair_participating_companies' => (int) ($jobFairSummary->companies ?? 0),
            'job_fair_vacancies' => (int) ($jobFairSummary->vacancies ?? 0),
            'job_fair_applicants' => (int) ($jobFairSummary->applicants ?? 0),
            'job_fair_hots' => (int) ($jobFairSummary->hots ?? 0),
            'job_fair_near_hired' => (int) ($jobFairSummary->near_hired ?? 0),
            'job_fair_rejected' => (int) ($jobFairSummary->rejected ?? 0),
        ];
    }

    private function jobFairAnalytics(array $range): array
    {
        if (! Schema::hasTable('job_fair_result_reports')) {
            return ['top_hiring_companies' => [], 'mismatch_reasons' => [], 'positions' => []];
        }
        $reports = DB::table('job_fair_result_reports')->whereBetween('submitted_at', [$range['from'], $range['to']]);
        $companies = (clone $reports)->selectRaw('company_name AS label, SUM(total_hots) AS value')
            ->groupBy('company_name')->orderByDesc('value')->limit(self::TOP_LIMIT)->get();
        $mismatches = Schema::hasTable('job_fair_result_mismatch_tallies') ? DB::table('job_fair_result_mismatch_tallies as tallies')
            ->join('job_fair_result_reports as reports', 'reports.id', '=', 'tallies.result_report_id')
            ->whereBetween('reports.submitted_at', [$range['from'], $range['to']])
            ->selectRaw('tallies.mismatch_code AS label, SUM(tallies.count) AS value')
            ->groupBy('tallies.mismatch_code')->orderByDesc('value')->get() : collect();
        $positions = Schema::hasTable('job_fair_result_entries') ? DB::table('job_fair_result_entries as entries')
            ->join('job_fair_result_reports as reports', 'reports.id', '=', 'entries.result_report_id')
            ->whereBetween('reports.submitted_at', [$range['from'], $range['to']])
            ->selectRaw('entries.position_applied_for AS label, COUNT(*) AS value')
            ->groupBy('entries.position_applied_for')->orderByDesc('value')->limit(self::TOP_LIMIT)->get() : collect();

        return ['top_hiring_companies' => $companies, 'mismatch_reasons' => $mismatches, 'positions' => $positions];
    }

    private function trends(array $filters, array $range): array
    {
        $period = $filters['period'];

        return [
            'registered_job_seekers' => $this->trend($this->seekerQuery($filters, $range), 'job_seekers.created_at', $period),
            'job_applications_submitted' => $this->trend($this->applicationQuery($filters, $range), 'applications.created_at', $period),
            'hired_applicants' => $this->trend($this->applicationQuery($filters, $range, 'applications.status_changed_at')->where('applications.status', 'hired'), 'applications.status_changed_at', $period),
            'vacancy_postings' => $this->trend($this->vacancyQuery($filters, $range), 'job_vacancies.created_at', $period),
        ];
    }

    private function distributions(array $filters, array $range): array
    {
        $seekers = $this->seekerQuery($filters, $range);
        $vacancies = $this->vacancyQuery($filters, $range);
        $applications = $this->applicationQuery($filters, $range);
        $employers = $this->employerQuery($filters, $range);

        return [
            'gender' => $this->distribution(clone $seekers, 'job_seekers.sex'),
            'educational_attainment' => $this->distribution(clone $seekers, 'job_seekers.educ_attainment'),
            'employment_status' => $this->distribution(clone $seekers, 'job_seekers.employment_status'),
            'application_status' => $this->distribution(clone $applications, 'applications.status'),
            'employer_verification' => $this->distribution($this->employerQuery($filters, $range), 'employers.verification_status'),
            'vacancy_status' => $this->distribution(clone $vacancies, 'job_vacancies.status'),
            'job_seeker_locations' => [
                'barangay' => $this->distribution(clone $seekers, 'job_seekers.address_barangay'),
                'city_municipality' => $this->distribution(clone $seekers, 'job_seekers.address_municipality_city'),
                'province' => $this->distribution(clone $seekers, 'job_seekers.address_province'),
            ],
            'employer_locations' => [
                'barangay' => $this->distribution(clone $employers, 'employers.barangay'),
                'city_municipality' => $this->distribution(clone $employers, 'employers.city_municipality'),
                'province' => $this->distribution(clone $employers, 'employers.province'),
            ],
            'vacancy_locations' => [
                'barangay' => $this->distribution(clone $vacancies, 'job_vacancies.barangay'),
                'city_municipality' => $this->distribution(clone $vacancies, 'job_vacancies.city_municipality'),
                'province' => $this->distribution(clone $vacancies, 'job_vacancies.province'),
            ],
        ];
    }

    private function topLists(array $filters, array $range): array
    {
        $applications = $this->applicationQuery($filters, $range)
            ->join('job_vacancies', 'job_vacancies.post_id', '=', 'applications.post_id')
            ->leftJoin('occupations', 'occupations.id', '=', 'job_vacancies.occupation_id');
        $vacancies = $this->vacancyQuery($filters, $range)
            ->leftJoin('occupations', 'occupations.id', '=', 'job_vacancies.occupation_id');

        return [
            'most_applied_job_categories' => $this->ranked($applications, "COALESCE(NULLIF(job_vacancies.general_term, ''), occupations.title, job_vacancies.job_title)"),
            'most_active_hiring_companies' => $this->companyRanking($filters, $range, 'applications'),
            'companies_with_most_vacancies' => $this->companyRanking($filters, $range, 'vacancies'),
            'companies_with_highest_hires' => $this->companyRanking($filters, $range, 'hires'),
            'vacancies_by_category' => $this->ranked($vacancies, "COALESCE(NULLIF(job_vacancies.general_term, ''), occupations.title, job_vacancies.job_title)"),
            'job_seeker_skills' => $this->skillRanking($filters, $range, false),
            'vacancy_demanded_skills' => $this->skillRanking($filters, $range, true),
        ];
    }

    private function forecast(array $filters, array $range): array
    {
        $monthRange = $this->monthLabels($range['from'], $range['to']);
        if (count($monthRange) < 3) {
            return $this->unavailableForecast();
        }

        $query = $this->vacancyQuery($filters, $range)
            ->leftJoin('occupations', 'occupations.id', '=', 'job_vacancies.occupation_id');
        $periodSql = $this->periodExpression('job_vacancies.created_at', 'monthly');
        $categorySql = "COALESCE(NULLIF(job_vacancies.general_term, ''), occupations.title, job_vacancies.job_title)";
        $rows = $query->selectRaw("{$periodSql} as period, {$categorySql} as item, COUNT(*) as value")
            ->groupByRaw("{$periodSql}, {$categorySql}")
            ->orderBy('period')->get();

        if ($rows->isEmpty()) {
            return $this->unavailableForecast();
        }

        $series = $rows->groupBy('item')->map(function (Collection $itemRows, string $item) use ($monthRange) {
            $counts = $itemRows->pluck('value', 'period');
            $history = collect($monthRange)->map(fn (string $period) => ['period' => $period, 'value' => (int) ($counts[$period] ?? 0)])->values();
            $values = $history->pluck('value')->all();
            $regression = $this->linearRegression($values);

            return [
                'item' => $item,
                'historical_monthly_counts' => $history,
                'predicted_next_month_count' => max(0, (int) round($regression['prediction'])),
                'trend_direction' => $regression['slope'] > 0.1 ? 'increasing' : ($regression['slope'] < -0.1 ? 'decreasing' : 'stable'),
                'slope' => round($regression['slope'], 3),
                'r_squared' => round($regression['r_squared'], 3),
            ];
        })->filter(fn (array $item) => collect($item['historical_monthly_counts'])->sum('value') > 0)
            ->sortByDesc('predicted_next_month_count')->take(5)->values();

        if ($series->isEmpty()) {
            return $this->unavailableForecast();
        }

        return [
            'available' => true,
            'label' => 'Experimental Forecast',
            'target' => 'Next-month vacancy demand by job category or occupation',
            'next_month' => $range['to']->addMonth()->format('Y-m'),
            'items' => $series,
            'explanation' => 'Ordinary least-squares linear regression (y = mx + b) is applied to actual monthly vacancy posting counts. Zero-activity months are retained.',
            'confidence_note' => 'R² describes how closely the simple trend line fits the available history; this is an experimental planning signal, not a guaranteed outcome.',
        ];
    }

    private function seekerQuery(array $filters, array $range, bool $filterCreatedAt = true): Builder
    {
        return JobSeeker::query()
            ->when($filterCreatedAt, fn (Builder $q) => $q->whereBetween('job_seekers.created_at', [$range['from'], $range['to']]))
            ->when($filters['province'] ?? null, fn (Builder $q, $v) => $q->where('address_province', $v))
            ->when($filters['city'] ?? null, fn (Builder $q, $v) => $q->where('address_municipality_city', $v))
            ->when($filters['barangay'] ?? null, fn (Builder $q, $v) => $q->where('address_barangay', $v))
            ->when($filters['skill'] ?? null, fn (Builder $q, $v) => $q->whereHas('seekerSkills', fn (Builder $s) => $s->where('skill_name', 'like', "%{$v}%")));
    }

    private function employerQuery(array $filters, array $range): Builder
    {
        return Employer::query()->whereBetween('employers.created_at', [$range['from'], $range['to']])
            ->when($filters['province'] ?? null, fn (Builder $q, $v) => $q->where('province', $v))
            ->when($filters['city'] ?? null, fn (Builder $q, $v) => $q->where('city_municipality', $v))
            ->when($filters['barangay'] ?? null, fn (Builder $q, $v) => $q->where('barangay', $v))
            ->when($filters['employer_verification_status'] ?? null, fn (Builder $q, $v) => $q->where('verification_status', $v));
    }

    private function vacancyQuery(array $filters, array $range): Builder
    {
        return JobVacancy::query()->whereBetween('job_vacancies.created_at', [$range['from'], $range['to']])
            ->when($filters['province'] ?? null, fn (Builder $q, $v) => $q->where('job_vacancies.province', $v))
            ->when($filters['city'] ?? null, fn (Builder $q, $v) => $q->where('job_vacancies.city_municipality', $v))
            ->when($filters['barangay'] ?? null, fn (Builder $q, $v) => $q->where('job_vacancies.barangay', $v))
            ->when($filters['broad_field'] ?? null, fn (Builder $q, $v) => $q->where('job_vacancies.general_term', $v))
            ->when($filters['occupation'] ?? null, fn (Builder $q, $v) => is_numeric($v) ? $q->where('job_vacancies.occupation_id', $v) : $q->where('job_vacancies.job_title', 'like', "%{$v}%"))
            ->when($filters['skill'] ?? null, fn (Builder $q, $v) => $q->whereHas('skillRequirements', fn (Builder $s) => $s->where('original_name', 'like', "%{$v}%")))
            ->when($filters['vacancy_status'] ?? null, fn (Builder $q, $v) => $q->where('job_vacancies.status', $v));
    }

    private function applicationQuery(array $filters, array $range, string $dateColumn = 'applications.created_at'): Builder
    {
        $query = Application::query();
        $this->applyApplicationFilters($query, $filters, $range, $dateColumn);

        return $query;
    }

    private function applyApplicationFilters(Builder $query, array $filters, array $range, string $dateColumn = 'applications.created_at'): void
    {
        $query->whereBetween($dateColumn, [$range['from'], $range['to']])
            ->when($filters['application_status'] ?? null, fn (Builder $q, $v) => $q->where('applications.status', $v))
            ->when($filters['province'] ?? null, fn (Builder $q, $v) => $q->whereHas('jobSeeker', fn (Builder $s) => $s->where('address_province', $v)))
            ->when($filters['city'] ?? null, fn (Builder $q, $v) => $q->whereHas('jobSeeker', fn (Builder $s) => $s->where('address_municipality_city', $v)))
            ->when($filters['barangay'] ?? null, fn (Builder $q, $v) => $q->whereHas('jobSeeker', fn (Builder $s) => $s->where('address_barangay', $v)))
            ->when($filters['broad_field'] ?? null, fn (Builder $q, $v) => $q->whereHas('jobVacancy', fn (Builder $j) => $j->where('general_term', $v)))
            ->when($filters['occupation'] ?? null, fn (Builder $q, $v) => $q->whereHas('jobVacancy', fn (Builder $j) => is_numeric($v) ? $j->where('occupation_id', $v) : $j->where('job_title', 'like', "%{$v}%")))
            ->when($filters['vacancy_status'] ?? null, fn (Builder $q, $v) => $q->whereHas('jobVacancy', fn (Builder $j) => $j->where('status', $v)))
            ->when($filters['skill'] ?? null, fn (Builder $q, $v) => $q->whereHas('jobVacancy.skillRequirements', fn (Builder $s) => $s->where('original_name', 'like', "%{$v}%")));
    }

    private function trend(Builder $query, string $column, string $period): array
    {
        $expression = $this->periodExpression($column, $period);

        return $query->whereNotNull($column)->selectRaw("{$expression} as period, COUNT(*) as value")
            ->groupByRaw($expression)->orderBy('period')->get()
            ->map(fn ($row) => ['period' => $row->period, 'value' => (int) $row->value])->all();
    }

    private function distribution(Builder $query, string $column): array
    {
        $label = "COALESCE(NULLIF(TRIM({$column}), ''), 'Not specified')";

        return $query->selectRaw("{$label} as label, COUNT(*) as value")
            ->groupByRaw($label)->orderByDesc('value')->limit(self::TOP_LIMIT)->get()
            ->map(fn ($row) => ['label' => $this->humanize($row->label), 'value' => (int) $row->value])->all();
    }

    private function ranked(Builder $query, string $labelExpression): array
    {
        return $query->selectRaw("{$labelExpression} as label, COUNT(*) as value")
            ->groupByRaw($labelExpression)->orderByDesc('value')->limit(self::TOP_LIMIT)->get()
            ->map(fn ($row) => ['label' => $row->label ?: 'Not specified', 'value' => (int) $row->value])->all();
    }

    private function companyRanking(array $filters, array $range, string $mode): array
    {
        $query = Employer::query()->select('employers.company_name as label');
        if ($mode === 'vacancies') {
            $query->join('job_vacancies', 'job_vacancies.employer_id', '=', 'employers.employer_id')
                ->whereBetween('job_vacancies.created_at', [$range['from'], $range['to']]);
        } else {
            $query->join('job_vacancies', 'job_vacancies.employer_id', '=', 'employers.employer_id')
                ->join('applications', 'applications.post_id', '=', 'job_vacancies.post_id')
                ->whereBetween($mode === 'hires' ? 'applications.status_changed_at' : 'applications.created_at', [$range['from'], $range['to']])
                ->when($mode === 'hires', fn (Builder $q) => $q->where('applications.status', 'hired'));
        }

        return $query->when($filters['employer_verification_status'] ?? null, fn (Builder $q, $v) => $q->where('employers.verification_status', $v))
            ->when($filters['province'] ?? null, fn (Builder $q, $v) => $q->where('employers.province', $v))
            ->when($filters['city'] ?? null, fn (Builder $q, $v) => $q->where('employers.city_municipality', $v))
            ->when($filters['barangay'] ?? null, fn (Builder $q, $v) => $q->where('employers.barangay', $v))
            ->when($filters['broad_field'] ?? null, fn (Builder $q, $v) => $q->where('job_vacancies.general_term', $v))
            ->when($filters['occupation'] ?? null, fn (Builder $q, $v) => is_numeric($v) ? $q->where('job_vacancies.occupation_id', $v) : $q->where('job_vacancies.job_title', 'like', "%{$v}%"))
            ->when($filters['vacancy_status'] ?? null, fn (Builder $q, $v) => $q->where('job_vacancies.status', $v))
            ->when(($mode !== 'vacancies' ? ($filters['application_status'] ?? null) : null), fn (Builder $q, $v) => $q->where('applications.status', $v))
            ->selectRaw('COUNT(*) as value')->groupBy('employers.employer_id', 'employers.company_name')
            ->orderByDesc('value')->limit(self::TOP_LIMIT)->get()
            ->map(fn ($row) => ['label' => $row->label ?: 'Unnamed employer', 'value' => (int) $row->value])->all();
    }

    private function skillRanking(array $filters, array $range, bool $vacancyDemand): array
    {
        if ($vacancyDemand) {
            $query = DB::table('job_vacancy_skills')->join('job_vacancies', 'job_vacancies.post_id', '=', 'job_vacancy_skills.post_id')
                ->leftJoin('skill_catalog_entries', 'skill_catalog_entries.id', '=', 'job_vacancy_skills.skill_id')
                ->whereBetween('job_vacancies.created_at', [$range['from'], $range['to']])
                ->when($filters['vacancy_status'] ?? null, fn ($q, $v) => $q->where('job_vacancies.status', $v))
                ->when($filters['province'] ?? null, fn ($q, $v) => $q->where('job_vacancies.province', $v))
                ->when($filters['city'] ?? null, fn ($q, $v) => $q->where('job_vacancies.city_municipality', $v))
                ->when($filters['barangay'] ?? null, fn ($q, $v) => $q->where('job_vacancies.barangay', $v))
                ->when($filters['broad_field'] ?? null, fn ($q, $v) => $q->where('job_vacancies.general_term', $v))
                ->when($filters['occupation'] ?? null, fn ($q, $v) => is_numeric($v) ? $q->where('job_vacancies.occupation_id', $v) : $q->where('job_vacancies.job_title', 'like', "%{$v}%"));
            $label = "COALESCE(skill_catalog_entries.name, job_vacancy_skills.original_name)";
        } else {
            $query = DB::table('seeker_skills')->join('job_seekers', 'job_seekers.seeker_id', '=', 'seeker_skills.seeker_id')
                ->leftJoin('skill_catalog_entries', 'skill_catalog_entries.id', '=', 'seeker_skills.skill_id')
                ->whereBetween('job_seekers.created_at', [$range['from'], $range['to']])
                ->when($filters['province'] ?? null, fn ($q, $v) => $q->where('job_seekers.address_province', $v))
                ->when($filters['city'] ?? null, fn ($q, $v) => $q->where('job_seekers.address_municipality_city', $v))
                ->when($filters['barangay'] ?? null, fn ($q, $v) => $q->where('job_seekers.address_barangay', $v));
            $label = "COALESCE(skill_catalog_entries.name, seeker_skills.skill_name)";
        }

        return $query->when($filters['skill'] ?? null, fn ($q, $v) => $q->whereRaw("{$label} LIKE ?", ["%{$v}%"]))
            ->selectRaw("{$label} as label, COUNT(*) as value")->groupByRaw($label)
            ->orderByDesc('value')->limit(self::TOP_LIMIT)->get()
            ->map(fn ($row) => ['label' => $row->label ?: 'Not specified', 'value' => (int) $row->value])->all();
    }

    private function periodExpression(string $column, string $period): string
    {
        $sqlite = DB::connection()->getDriverName() === 'sqlite';
        if ($period === 'yearly') {
            return $sqlite ? "strftime('%Y', {$column})" : "DATE_FORMAT({$column}, '%Y')";
        }

        return $sqlite ? "strftime('%Y-%m', {$column})" : "DATE_FORMAT({$column}, '%Y-%m')";
    }

    private function range(array $filters): array
    {
        $period = $filters['period'] ?? 'monthly';
        $to = isset($filters['date_to']) ? CarbonImmutable::parse($filters['date_to'])->endOfDay() : now()->toImmutable()->endOfDay();
        $from = isset($filters['date_from'])
            ? CarbonImmutable::parse($filters['date_from'])->startOfDay()
            : ($period === 'yearly' ? $to->subYears(4)->startOfYear() : $to->subMonths(11)->startOfMonth());

        return ['from' => $from, 'to' => $to];
    }

    private function monthLabels(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $labels = [];
        for ($cursor = $from->startOfMonth(); $cursor <= $to; $cursor = $cursor->addMonth()) {
            $labels[] = $cursor->format('Y-m');
        }

        return array_slice($labels, -24);
    }

    private function linearRegression(array $values): array
    {
        $count = count($values);
        $xs = range(1, $count);
        $meanX = array_sum($xs) / $count;
        $meanY = array_sum($values) / $count;
        $numerator = 0.0;
        $denominator = 0.0;
        foreach ($values as $index => $value) {
            $xDelta = $xs[$index] - $meanX;
            $numerator += $xDelta * ($value - $meanY);
            $denominator += $xDelta ** 2;
        }
        $slope = $denominator > 0 ? $numerator / $denominator : 0.0;
        $intercept = $meanY - ($slope * $meanX);
        $ssResidual = 0.0;
        $ssTotal = 0.0;
        foreach ($values as $index => $value) {
            $fitted = ($slope * $xs[$index]) + $intercept;
            $ssResidual += ($value - $fitted) ** 2;
            $ssTotal += ($value - $meanY) ** 2;
        }

        return [
            'slope' => $slope,
            'prediction' => ($slope * ($count + 1)) + $intercept,
            'r_squared' => $ssTotal > 0 ? max(0, 1 - ($ssResidual / $ssTotal)) : 1,
        ];
    }

    private function unavailableForecast(): array
    {
        return [
            'available' => false,
            'label' => 'Experimental Forecast',
            'message' => 'Not enough historical data yet to generate reliable predictions.',
        ];
    }

    private function humanize(string $value): string
    {
        return str($value)->replace('_', ' ')->title()->toString();
    }
}
