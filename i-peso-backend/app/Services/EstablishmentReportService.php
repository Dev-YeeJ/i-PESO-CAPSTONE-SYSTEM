<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Employer;
use App\Models\JobFair;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EstablishmentReportService
{
    public const EMPLOYER_MISMATCH_REASONS = [
        'salary_expectation_not_met' => 'Salary expectation is not met',
        'lack_competencies_skills' => 'Lack of competencies/skills',
        'lack_license_certification' => 'Lack of professional license / TESDA certification',
        'documentary_requirements' => 'Failed to submit documentary requirements',
        'other_reason' => 'Other reason',
        // Legacy values kept readable for existing Job Fair records.
        'skills_mismatch' => 'Lack of competencies/skills',
        'education_mismatch' => 'Other reason',
        'experience_mismatch' => 'Lack of competencies/skills',
        'location_unavailable' => 'Other reason',
        'applicant_declined' => 'Other reason',
    ];

    public const SEEKER_MISMATCH_REASONS = [
        'skill_mismatch' => 'Skill mismatch',
        'transportation_location' => 'Transportation or location issue',
        'working_environment' => 'Working environment is not acceptable',
        'other_reason' => 'Other reason',
    ];

    public function build(array $filters, ?Employer $employerScope = null): array
    {
        $filters = $this->normalizeFilters($filters);
        $query = Application::query()
            ->with([
                'jobVacancy.employer',
                'jobSeeker.educations',
                'jobFair',
            ])
            ->whereHas('jobVacancy', function (Builder $vacancies) use ($filters, $employerScope) {
                if ($employerScope) {
                    $vacancies->where('employer_id', $employerScope->employer_id);
                } elseif ($filters['employer_id']) {
                    $vacancies->where('employer_id', $filters['employer_id']);
                }
                if ($filters['vacancy_id']) {
                    $vacancies->where('post_id', $filters['vacancy_id']);
                }
            });

        $this->applyFilters($query, $filters);

        $applications = $query->oldest('applications.created_at')->get()
            ->unique(fn (Application $application) => implode('|', [
                $application->seeker_id,
                $application->jobVacancy?->employer_id,
                $application->post_id,
                $application->job_fair_id ?? 'online',
            ]))
            ->values();

        $employers = $this->reportEmployers($applications, $filters, $employerScope);
        $selectedFair = $filters['job_fair_id'] ? JobFair::find($filters['job_fair_id']) : null;
        $reports = $employers->map(function (Employer $employer) use ($applications, $filters, $selectedFair) {
            $rows = $applications
                ->filter(fn (Application $application) => $application->jobVacancy?->employer_id === $employer->employer_id)
                ->map(fn (Application $application) => $this->entry($application))
                ->values();

            $fair = $selectedFair ?? $this->singleFair($applications, $employer);

            return [
                'establishment' => $this->establishment($employer, $fair, $filters),
                'entries' => $rows,
                'summary' => $this->summary($rows),
            ];
        })->values();

        $allEntries = $reports->pluck('entries')->flatten(1);

        return [
            'title' => 'ESTABLISHMENT REPORT',
            'form_code' => 'RO1-JF Form 3',
            'generated_at' => now()->toIso8601String(),
            'filters' => $filters,
            'reports' => $reports,
            'summary' => $this->summary($allEntries),
            'filter_options' => $this->filterOptions($filters, $employerScope),
            'legends' => $this->legends(),
        ];
    }

    public function downloadPdf(array $data, string $suffix = '')
    {
        $filename = 'establishment-report-ro1-jf-form-3'.($suffix ? '-'.$suffix : '').'.pdf';

        return Pdf::loadView('reports.establishment-report', $data)
            ->setPaper('a4', 'landscape')
            ->download($filename);
    }

    public function downloadCsv(array $data, string $suffix = ''): StreamedResponse
    {
        $filename = 'establishment-report-ro1-jf-form-3'.($suffix ? '-'.$suffix : '').'.csv';

        return response()->streamDownload(function () use ($data) {
            $stream = fopen('php://output', 'wb');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, [
                'Establishment', 'Office Location', 'Job Fair', 'Job Fair Date', 'No.', 'Name of Jobseeker',
                'Position Applying For', 'Sex', 'City/Municipality', 'Mobile Number', 'Age Range',
                'Educational Attainment Code', 'Jobseeker Classification', 'Status of Application',
                'Employer Mismatch Reason', 'Job Seeker Mismatch Reason', 'Mismatch Details', 'Source',
            ]);

            foreach ($data['reports'] as $report) {
                foreach ($report['entries'] as $index => $entry) {
                    fputcsv($stream, [
                        $report['establishment']['name'],
                        $report['establishment']['office_location'],
                        $report['establishment']['job_fair_name'],
                        $report['establishment']['job_fair_date'],
                        $index + 1,
                        $entry['name'],
                        $entry['position_applying_for'],
                        $entry['sex'],
                        $entry['residence_city'],
                        $entry['contact_number'],
                        $entry['age_range'],
                        $entry['educational_attainment_code'],
                        implode('; ', $entry['jobseeker_classifications']),
                        $entry['application_status'],
                        $entry['employer_mismatch_reason'],
                        $entry['seeker_mismatch_reason'],
                        $entry['mismatch_reason_details'],
                        $entry['source_label'],
                    ]);
                }
            }

            fclose($stream);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when($filters['job_fair_id'], fn (Builder $query, int $fairId) => $query->where('job_fair_id', $fairId));
        $query->when($filters['date_from'], fn (Builder $query, string $date) => $query->whereDate('applications.created_at', '>=', $date));
        $query->when($filters['date_to'], fn (Builder $query, string $date) => $query->whereDate('applications.created_at', '<=', $date));

        match ($filters['source']) {
            'online' => $query->whereNull('job_fair_id'),
            'job_fair' => $query->whereNotNull('job_fair_id'),
            default => null,
        };

        if ($filters['status'] === 'hots') {
            $query->where('is_hots', true);
        } elseif ($filters['status']) {
            $query->where('status', $filters['status']);
        }
    }

    private function reportEmployers(Collection $applications, array $filters, ?Employer $scope): Collection
    {
        if ($scope) {
            return collect([$scope]);
        }
        if ($filters['employer_id']) {
            return collect([Employer::findOrFail($filters['employer_id'])]);
        }

        $ids = $applications->pluck('jobVacancy.employer_id')->filter()->unique();

        return Employer::query()->whereIn('employer_id', $ids)->orderBy('company_name')->get();
    }

    private function entry(Application $application): array
    {
        $seeker = $application->jobSeeker;
        $employerReasonCode = $application->employer_mismatch_reason_code ?: $application->dole_mismatch_code;
        $source = $application->job_fair_id ? 'job_fair' : 'online';

        return [
            'application_id' => $application->apply_id,
            'seeker_id' => $application->seeker_id,
            'vacancy_id' => $application->post_id,
            'job_fair_id' => $application->job_fair_id,
            'name' => $this->seekerName($seeker),
            'position_applying_for' => $application->jobVacancy?->job_title ?: 'N/A',
            'sex' => $this->sex($seeker?->sex),
            'residence_city' => $seeker?->address_municipality_city ?: 'N/A',
            'contact_number' => $seeker?->mobile_number ?: 'N/A',
            'age_range' => $this->ageRange($seeker),
            'educational_attainment_code' => $this->educationCode($seeker),
            'educational_attainment' => $this->educationValue($seeker),
            'jobseeker_classifications' => $this->classifications($seeker, $application),
            'application_status_code' => $application->is_hots ? 'hots' : $application->status,
            'application_status' => $this->statusLabel($application),
            'employer_mismatch_reason_code' => $employerReasonCode,
            'employer_mismatch_reason' => self::EMPLOYER_MISMATCH_REASONS[$employerReasonCode] ?? 'N/A',
            'seeker_mismatch_reason_code' => $application->seeker_mismatch_reason_code,
            'seeker_mismatch_reason' => self::SEEKER_MISMATCH_REASONS[$application->seeker_mismatch_reason_code] ?? 'N/A',
            'mismatch_reason_details' => $application->mismatch_reason_details ?: ($application->status === 'rejected' ? ($application->employer_remarks ?: 'N/A') : 'N/A'),
            'source' => $source,
            'source_label' => $source === 'job_fair' ? 'Job Fair' : 'Online',
            'applied_at' => $application->created_at?->toDateString() ?? 'N/A',
        ];
    }

    private function establishment(Employer $employer, ?JobFair $fair, array $filters): array
    {
        $representative = $employer->representative_name ?: trim(implode(' ', array_filter([
            $employer->representative_first_name,
            $employer->representative_middle_name,
            $employer->representative_last_name,
        ])));
        $officeLocation = $employer->complete_address ?: collect([
            $employer->house_unit_street,
            $employer->barangay,
            $employer->city_municipality,
            $employer->province,
        ])->filter()->join(', ');
        $activityDate = $fair?->start_date ?? $fair?->event_date;

        return [
            'employer_id' => $employer->employer_id,
            'name' => $employer->company_name ?: $employer->trade_name ?: $employer->email,
            'office_location' => $officeLocation ?: 'N/A',
            'contact_details' => collect([$employer->email, $employer->mobile_number ?: $employer->representative_contact_number])->filter()->join(' / ') ?: 'N/A',
            'date_of_activity' => $activityDate?->format('F d, Y') ?: ($filters['date_to'] ?: $filters['date_from'] ?: now()->toDateString()),
            'job_fair_name' => $fair?->title ?: ($filters['source'] === 'online' ? 'Online Applications' : 'N/A'),
            'job_fair_venue' => $fair?->venue ?: 'N/A',
            'job_fair_date' => $activityDate?->format('F d, Y') ?: 'N/A',
            'submitted_by' => $representative ?: 'N/A',
            'signature_name' => $representative ?: 'N/A',
            'email' => $employer->email ?: 'N/A',
            'mobile_number' => $employer->mobile_number ?: $employer->representative_contact_number ?: 'N/A',
            'submission_date' => now()->format('F d, Y'),
        ];
    }

    private function filterOptions(array $filters, ?Employer $scope): array
    {
        $employerId = $scope?->employer_id ?: $filters['employer_id'];
        $employers = $scope
            ? collect([$scope])
            : Employer::query()->orderBy('company_name')->get(['employer_id', 'company_name']);
        $vacancies = JobVacancy::query()
            ->when($employerId, fn (Builder $query, int $id) => $query->where('employer_id', $id))
            ->orderBy('job_title')
            ->get(['post_id', 'employer_id', 'job_title']);
        $fairs = JobFair::query()
            ->when($scope, fn (Builder $query) => $query->where(function (Builder $nested) use ($scope) {
                $nested->whereHas('employerJoins', fn (Builder $joins) => $joins->where('employer_id', $scope->employer_id))
                    ->orWhereHas('applications.jobVacancy', fn (Builder $vacancies) => $vacancies->where('employer_id', $scope->employer_id));
            }))
            ->orderByRaw('COALESCE(start_date, event_date) desc')
            ->get(['job_fair_id', 'title', 'start_date', 'event_date']);

        return [
            'employers' => $employers,
            'vacancies' => $vacancies,
            'job_fairs' => $fairs,
            'statuses' => [
                ['value' => 'pending', 'label' => 'For Follow-up'],
                ['value' => 'reviewed', 'label' => 'Near Hired'],
                ['value' => 'shortlisted', 'label' => 'Qualified'],
                ['value' => 'interview', 'label' => 'Interviewed / For Follow-up'],
                ['value' => 'hots', 'label' => 'Hired-on-the-Spot'],
                ['value' => 'hired', 'label' => 'Hired / Qualified'],
                ['value' => 'rejected', 'label' => 'Not Hired / Rejected'],
            ],
            'employer_mismatch_reasons' => self::EMPLOYER_MISMATCH_REASONS,
            'seeker_mismatch_reasons' => self::SEEKER_MISMATCH_REASONS,
        ];
    }

    private function summary(Collection $entries): array
    {
        return [
            'total' => $entries->count(),
            'qualified' => $entries->filter(fn (array $entry) => in_array($entry['application_status_code'], ['shortlisted', 'hired'], true))->count(),
            'near_hired' => $entries->where('application_status_code', 'reviewed')->count(),
            'hots' => $entries->where('application_status_code', 'hots')->count(),
            'interviewed' => $entries->where('application_status_code', 'interview')->count(),
            'rejected' => $entries->where('application_status_code', 'rejected')->count(),
            'mismatch_cases' => $entries->filter(fn (array $entry) => $entry['employer_mismatch_reason'] !== 'N/A' || $entry['seeker_mismatch_reason'] !== 'N/A')->count(),
        ];
    }

    private function singleFair(Collection $applications, Employer $employer): ?JobFair
    {
        $fairs = $applications
            ->filter(fn (Application $application) => $application->jobVacancy?->employer_id === $employer->employer_id)
            ->pluck('jobFair')
            ->filter()
            ->unique('job_fair_id');

        return $fairs->count() === 1 ? $fairs->first() : null;
    }

    private function seekerName(?JobSeeker $seeker): string
    {
        if (! $seeker) {
            return 'N/A';
        }
        $middleInitial = $seeker->middle_name ? mb_strtoupper(mb_substr($seeker->middle_name, 0, 1)).'.' : null;

        return collect([$seeker->last_name.',', $seeker->first_name, $middleInitial])->filter()->join(' ');
    }

    private function sex(?string $value): string
    {
        return match (Str::lower((string) $value)) {
            'male', 'm' => 'Male',
            'female', 'f' => 'Female',
            default => 'N/A',
        };
    }

    private function ageRange(?JobSeeker $seeker): string
    {
        if (! $seeker?->date_of_birth) {
            return 'N/A';
        }
        $age = $seeker->date_of_birth->age;

        return match (true) {
            $age < 15 => 'N/A',
            $age <= 24 => '15-24 years old',
            $age <= 34 => '25-34 years old',
            $age <= 44 => '35-44 years old',
            $age <= 54 => '45-54 years old',
            $age <= 64 => '55-64 years old',
            default => '65 years old and above',
        };
    }

    private function educationValue(?JobSeeker $seeker): string
    {
        return $seeker?->educ_attainment
            ?: $seeker?->educations?->sortByDesc('year_graduated')->first()?->level
            ?: 'N/A';
    }

    private function educationCode(?JobSeeker $seeker): string
    {
        $education = Str::lower($this->educationValue($seeker));

        return match (true) {
            $education === 'n/a' || Str::contains($education, ['not completed', 'no formal']) => 'N',
            Str::contains($education, ['post-graduate', 'post graduate', 'master', 'doctor']) => 'P',
            Str::contains($education, ['college', 'bachelor', 'tertiary']) => 'C',
            Str::contains($education, ['senior high', 'k-12', 'k12']) => 'E',
            Str::contains($education, ['elementary', 'high school', 'secondary']) => 'H',
            default => 'N',
        };
    }

    private function classifications(?JobSeeker $seeker, Application $application): array
    {
        if (! $seeker) {
            return ['Other / N/A'];
        }
        $values = collect();
        $education = Str::lower($this->educationValue($seeker));
        if (Str::contains($education, ['senior high', 'k-12', 'k12'])) {
            $values->push('K-12 Senior High School Graduate');
        }
        if ($seeker->is_former_ofw) {
            $values->push('Displaced OFW');
        }
        $displacement = Str::lower(collect([$seeker->employment_status, $seeker->unemployment_reason, $seeker->unemployment_reason_others])->filter()->join(' '));
        if (Str::contains($displacement, ['displaced', 'terminated', 'laid off', 'retrench'])) {
            $values->push('Displaced Worker');
        }
        if (Str::contains(Str::lower((string) $application->employer_remarks), 'tupad')) {
            $values->push('TUPAD Beneficiary');
        }

        return $values->isEmpty() ? ['Other / N/A'] : $values->unique()->values()->all();
    }

    private function statusLabel(Application $application): string
    {
        if ($application->is_hots) {
            return 'Hired-on-the-Spot';
        }

        return match ($application->status) {
            'shortlisted' => 'Qualified',
            'reviewed' => 'Near Hired',
            'hired' => 'Qualified',
            'interview' => 'Interviewed / For Follow-up',
            'rejected' => 'Not Hired / Rejected',
            default => 'Interviewed / For Follow-up',
        };
    }

    private function normalizeFilters(array $filters): array
    {
        return [
            'employer_id' => isset($filters['employer_id']) ? (int) $filters['employer_id'] : null,
            'job_fair_id' => isset($filters['job_fair_id']) ? (int) $filters['job_fair_id'] : null,
            'vacancy_id' => isset($filters['vacancy_id']) ? (int) $filters['vacancy_id'] : null,
            'date_from' => $filters['date_from'] ?? null,
            'date_to' => $filters['date_to'] ?? null,
            'status' => $filters['status'] ?? null,
            'source' => $filters['source'] ?? 'all',
        ];
    }

    private function legends(): array
    {
        return [
            'education' => [
                'H' => 'Elementary / High School',
                'E' => 'K-12 Senior High School',
                'C' => 'College',
                'P' => 'Post Graduate',
                'N' => 'Education not completed / unavailable',
            ],
            'age_ranges' => [
                '15-24 years old', '25-34 years old', '35-44 years old',
                '45-54 years old', '55-64 years old', '65 years old and above',
            ],
            'employer_mismatch_reasons' => self::EMPLOYER_MISMATCH_REASONS,
            'seeker_mismatch_reasons' => self::SEEKER_MISMATCH_REASONS,
        ];
    }
}
