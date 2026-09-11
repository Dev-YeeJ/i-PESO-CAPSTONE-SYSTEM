<?php

namespace App\Services;

use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobFair;
use App\Models\JobFairEmployer;
use App\Models\JobFairResultReport;
use App\Models\JobSeeker;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class JobFairReportService
{
    // Legacy generic codes — still accepted so historical reports/tallies stay valid.
    public const MISMATCH_CODES = [
        'skills_mismatch', 'qualification_mismatch', 'experience_mismatch', 'education_mismatch',
        'salary_expectation_mismatch', 'location_mismatch', 'availability_mismatch',
        'incomplete_documents', 'failed_interview', 'other',
    ];

    // RO1-JF Form 3 employer-side mismatch codes (1-4), shown when an entry's
    // status is 'employer_mismatch'.
    public const EMPLOYER_MISMATCH_CODES = [
        '1' => 'Lack required work experience',
        '2' => 'Lack needed education/competency/skill',
        '3' => 'Lack professional license/TESDA certification/skill',
        '4' => 'Failed to submit documentary requirements',
    ];

    // RO1-JF Form 3 job-seeker-side mismatch codes (A-D), shown when an
    // entry's status is 'seeker_mismatch'.
    public const SEEKER_MISMATCH_CODES = [
        'A' => 'Salary expectation is not met',
        'B' => 'Applicant prefers another position',
        'C' => 'Place of work/location is not acceptable',
        'D' => 'Applicant did not push through with the application/Unresponsive',
    ];

    // RO1-JF Form 3 Jobseeker Classification codes (1-4), a per-entry checklist.
    public const CLASSIFICATION_CODES = [
        '1' => 'K-12/Senior High School graduate',
        '2' => 'Person with disability (PWD)/Senior Citizen (SC)',
        '3' => 'Displaced OFW',
        '4' => '4Ps/TUPAD Beneficiary',
    ];

    public function saveEmployer(JobFair $fair, Employer $employer, array $data): JobFairResultReport
    {
        $participation = JobFairEmployer::query()
            ->where('job_fair_id', $fair->job_fair_id)
            ->where('employer_id', $employer->employer_id)
            ->firstOrFail();

        return $this->save($fair, [
            ...$data,
            'job_fair_employer_id' => $participation->id,
            'employer_id' => $employer->employer_id,
            'company_name' => $employer->company_name ?: $employer->trade_name ?: $employer->email,
            'employer_type' => 'registered_employer',
            'source' => 'employer_self_service',
            'submitted_by_employer_id' => $employer->employer_id,
            'encoded_by_admin_id' => null,
        ], $participation);
    }

    public function saveProxy(JobFair $fair, Administrator $admin, array $data): JobFairResultReport
    {
        return $this->save($fair, [
            ...$data,
            'job_fair_employer_id' => null,
            'employer_id' => $data['employer_id'] ?? null,
            'source' => 'admin_proxy',
            'encoded_by_admin_id' => $admin->admin_id,
            'submitted_by_employer_id' => null,
            'entries' => $data['entries'] ?? [],
        ]);
    }

    /**
     * Job seekers matching a free-text name search, pre-shaped to drop
     * straight into a result-entry row — the "smart typing" autofill behind
     * the applicant-name field on both the employer and admin encoding
     * screens. Every word in the query must appear somewhere in the name, so
     * incremental/partial full-name typing matches (e.g. "judy salu" already
     * matches "Judy Ann Gukentre Salu" before the whole name is typed).
     *
     * @return array<int, array<string, mixed>>
     */
    public function suggestApplicants(string $query, int $limit = 8): array
    {
        $terms = collect(preg_split('/\s+/', trim($query)))->filter();
        if ($terms->isEmpty()) {
            return [];
        }

        return JobSeeker::query()
            ->where(function ($outer) use ($terms) {
                foreach ($terms as $term) {
                    $outer->where(function ($inner) use ($term) {
                        $inner->where('first_name', 'like', "%{$term}%")
                            ->orWhere('middle_name', 'like', "%{$term}%")
                            ->orWhere('last_name', 'like', "%{$term}%");
                    });
                }
            })
            ->with('disabilities')
            ->limit($limit)
            ->get()
            ->map(fn (JobSeeker $seeker) => $this->applicantSuggestion($seeker))
            ->all();
    }

    private function save(JobFair $fair, array $data, ?JobFairEmployer $participation = null): JobFairResultReport
    {
        $this->assertTallies($data);
        $normalizer = app(JobFairService::class);
        $normalized = $normalizer->normalizedCompanyName($data['company_name']);
        $dedupeKey = filled($data['employer_id'] ?? null) ? 'employer:'.$data['employer_id'] : 'company:'.$normalized;
        $existing = JobFairResultReport::query()->where('job_fair_id', $fair->job_fair_id)
            ->where(function ($query) use ($data, $normalized) {
                if (filled($data['employer_id'] ?? null)) $query->where('employer_id', $data['employer_id']);
                $query->orWhere('normalized_company_name', $normalized);
            })->first();
        if ($existing && $existing->source !== $data['source']) {
            throw ValidationException::withMessages(['company_name' => ['A result report for this company and event already exists through another encoding channel. Review the existing report instead of creating a duplicate.']]);
        }
        if ($existing) $dedupeKey = $existing->dedupe_key;

        return DB::transaction(function () use ($fair, $data, $participation, $normalized, $dedupeKey, $existing) {
            $attributes = collect($data)->except(['entries', 'mismatch_tallies'])->merge([
                'normalized_company_name' => $normalized,
                'dedupe_key' => $dedupeKey,
                'submitted_at' => now(),
            ]);

            // A resubmission that omits employer_id (e.g. the employer picker
            // wasn't re-used) must not silently detach an existing report
            // from the employer it was already correctly linked to.
            if (blank($attributes->get('employer_id')) && $existing?->employer_id) {
                $attributes = $attributes->put('employer_id', $existing->employer_id);
            }

            $report = JobFairResultReport::updateOrCreate(
                ['job_fair_id' => $fair->job_fair_id, 'dedupe_key' => $dedupeKey],
                $attributes->all(),
            );

            $report->entries()->delete();
            foreach ($data['entries'] ?? [] as $entry) {
                $report->entries()->create($entry);
            }

            $report->mismatchTallies()->delete();
            // Once entries are supplied, they are the source of truth for the
            // mismatch breakdown — any explicitly-passed mismatch_tallies is
            // ignored rather than silently overriding (or, if empty, wiping)
            // what the entries themselves say. Explicit mismatch_tallies only
            // applies to a genuine aggregate-only submission with no entries.
            $tallies = filled($data['entries'] ?? null)
                ? collect($data['entries'])
                    ->whereIn('status', ['employer_mismatch', 'seeker_mismatch', 'rejected'])->whereNotNull('mismatch_code')
                    ->countBy('mismatch_code')->map(fn ($count, $code) => ['mismatch_code' => $code, 'count' => $count])->values()->all()
                : ($data['mismatch_tallies'] ?? []);
            foreach ($tallies as $tally) {
                if ((int) ($tally['count'] ?? 0) > 0) {
                    $report->mismatchTallies()->create($tally);
                }
            }

            if ($participation) {
                $participation->update(['participation_status' => 'encoded_results', 'encoded_results_at' => now()]);
            }

            return $report->fresh(['jobFair', 'employer', 'entries', 'mismatchTallies']);
        });
    }

    public function download(JobFairResultReport $report)
    {
        $report->loadMissing(['jobFair', 'employer', 'entries', 'mismatchTallies', 'encodedByAdmin']);
        $report->update(['report_generated_at' => now()]);
        $report->participation?->update(['participation_status' => 'report_generated', 'report_generated_at' => now()]);

        $submittedByName = $report->source === 'admin_proxy'
            ? trim(($report->encodedByAdmin?->first_name ?? '').' '.($report->encodedByAdmin?->last_name ?? '')) ?: null
            : ($report->contact_person ?: $report->employer?->representative_name);
        $submittedByEmail = $report->source === 'admin_proxy'
            ? $report->encodedByAdmin?->email
            : $report->employer?->email;

        return Pdf::loadView('pdf.job_fairs.roi_form_3', [
            'report' => $report,
            'submittedByName' => $submittedByName,
            'submittedByEmail' => $submittedByEmail,
        ])
            ->setPaper('a4', 'landscape')
            ->download('ro1-jf-form-3-'.$report->job_fair_id.'-'.$report->id.'.pdf');
    }

    public function sprs(JobFair $fair): array
    {
        $reports = $fair->resultReports()->get();

        return [
            '1.6.1_fairs_conducted_local' => in_array($fair->sector, ['local', 'both'], true) ? 1 : 0,
            '1.6.2_fairs_conducted_overseas' => in_array($fair->sector, ['overseas', 'both'], true) ? 1 : 0,
            '1.6.3_total_fairs_conducted' => 1,
            '1.6.4_establishments_participated' => $reports->count(),
            '1.6.5_job_vacancies_solicited' => (int) $reports->sum('total_vacancies_solicited'),
            '1.6.6_job_applicants_registered' => (int) $reports->sum('total_applicants'),
            '1.6.7_total_hots' => (int) $reports->sum('total_hots'),
            'near_hired' => (int) $reports->sum('total_near_hired'),
            'rejected' => (int) $reports->sum('total_rejected'),
            'self_service_reports' => $reports->where('source', 'employer_self_service')->count(),
            'admin_proxy_reports' => $reports->where('source', 'admin_proxy')->count(),
        ];
    }

    private function assertTallies(array $data): void
    {
        $errors = [];
        $totalQualified = (int) ($data['total_qualified'] ?? 0);
        if ((int) $data['total_male'] + (int) $data['total_female'] !== (int) $data['total_applicants']) {
            $errors['total_applicants'][] = 'Total applicants must equal male plus female applicants.';
        }
        if ($totalQualified + (int) $data['total_hots'] + (int) $data['total_near_hired'] + (int) $data['total_rejected'] !== (int) $data['total_applicants']) {
            $errors['outcomes'][] = 'Qualified, HOTS, near hired, and mismatched totals must equal total applicants.';
        }
        if (collect($data['mismatch_tallies'] ?? [])->sum('count') > (int) $data['total_rejected']) {
            $errors['mismatch_tallies'][] = 'Mismatch tallies cannot exceed the mismatched applicant total.';
        }
        // Entry-level detail is optional for admin proxy encoding (aggregate-only
        // paper submissions are still allowed), but whenever rows are supplied —
        // by either source — they must reconcile with the summary totals above.
        if (filled($data['entries'] ?? null)) {
            $entries = collect($data['entries']);
            if ($entries->count() !== (int) $data['total_applicants']) $errors['entries'][] = 'Detailed applicant rows must equal total applicants.';
            if ($entries->where('gender', 'male')->count() !== (int) $data['total_male'] || $entries->where('gender', 'female')->count() !== (int) $data['total_female']) $errors['entries'][] = 'Detailed applicant gender counts must match the summary.';
            if ($entries->whereIn('status', ['employer_mismatch', 'seeker_mismatch', 'rejected'])->contains(fn ($entry) => blank($entry['mismatch_code'] ?? null))) $errors['entries'][] = 'Every mismatched applicant requires a mismatch reason.';

            // The per-applicant register is what actually prints on the RO1-JF
            // Form 3 — if its status breakdown doesn't match the summary
            // totals, the printed report would contradict itself.
            if ($entries->where('status', 'qualified')->count() !== $totalQualified) $errors['entries'][] = 'Qualified applicant count must match the summary total.';
            if ($entries->where('status', 'hots')->count() !== (int) $data['total_hots']) $errors['entries'][] = 'Hired-on-the-spot count must match the summary total.';
            if ($entries->where('status', 'near_hired')->count() !== (int) $data['total_near_hired']) $errors['entries'][] = 'Near-hired count must match the summary total.';
            if ($entries->whereIn('status', ['employer_mismatch', 'seeker_mismatch'])->count() !== (int) $data['total_rejected']) $errors['entries'][] = 'Mismatched applicant count must match the summary total.';

            // A mismatch reason code only makes sense within its own status's
            // code family (Employer 1-4 vs Job Seeker A-D) — otherwise the
            // wrong legend column gets checked on the printed form.
            if ($entries->contains(function ($entry) {
                $code = $entry['mismatch_code'] ?? null;
                if (blank($code)) return false;

                return match ($entry['status'] ?? null) {
                    'employer_mismatch' => ! array_key_exists($code, self::EMPLOYER_MISMATCH_CODES),
                    'seeker_mismatch' => ! array_key_exists($code, self::SEEKER_MISMATCH_CODES),
                    default => false,
                };
            })) {
                $errors['entries'][] = 'Each mismatch reason code must match its own mismatch type (Employer codes 1-4, Job Seeker codes A-D).';
            }
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function applicantSuggestion(JobSeeker $seeker): array
    {
        return [
            'seeker_id' => $seeker->seeker_id,
            'name' => collect([$seeker->first_name, $seeker->middle_name, $seeker->last_name])->filter()->join(' '),
            'gender' => in_array($seeker->sex, ['male', 'female'], true) ? $seeker->sex : null,
            'city_municipality' => $seeker->address_municipality_city,
            'contact_number' => $seeker->mobile_number,
            'age_group' => $this->ageGroupCode($seeker->date_of_birth),
            'highest_education' => $this->resolveEducationValue($seeker),
            'classification_codes' => $this->classificationCodesFor($seeker),
        ];
    }

    private function ageGroupCode(?Carbon $dateOfBirth): ?string
    {
        if (! $dateOfBirth) {
            return null;
        }
        $age = $dateOfBirth->age;

        return match (true) {
            $age < 15 => null,
            $age <= 24 => 'A',
            $age <= 34 => 'B',
            $age <= 44 => 'C',
            $age <= 54 => 'D',
            $age <= 64 => 'E',
            default => 'F',
        };
    }

    /**
     * Best-effort mapping from a seeker's freeform educational attainment to
     * the fixed vocabulary JobFairResultEntry.highest_education expects —
     * mirrors the same keyword matching EstablishmentReportService and the
     * roi_form_3 PDF template already use for the identical problem.
     */
    private function resolveEducationValue(JobSeeker $seeker): ?string
    {
        $raw = $seeker->educ_attainment ?: $seeker->educations->sortByDesc('year_graduated')->first()?->level;
        $value = Str::lower((string) $raw);
        if ($value === '') {
            return null;
        }

        return match (true) {
            str_contains($value, 'post') || str_contains($value, 'master') || str_contains($value, 'doctor') => 'post_graduate',
            str_contains($value, 'college') || str_contains($value, 'tertiary') || str_contains($value, 'bachelor') => 'college',
            str_contains($value, 'vocational') || str_contains($value, 'tvet') => 'vocational',
            str_contains($value, 'senior high') || str_contains($value, 'k-12') || str_contains($value, 'k12') => 'senior_high',
            str_contains($value, 'high school') || str_contains($value, 'secondary') => 'high_school',
            str_contains($value, 'elementary') => 'elementary',
            default => null,
        };
    }

    /**
     * Best-effort RO1-JF Form 3 classification codes derivable from stored
     * seeker data. TUPAD (part of code 4) has no stored flag anywhere in this
     * schema, so it's intentionally left undetected here — the same known
     * gap already accepted in EstablishmentReportService::classifications().
     *
     * @return array<int, string>
     */
    private function classificationCodesFor(JobSeeker $seeker): array
    {
        $codes = [];
        if ($this->resolveEducationValue($seeker) === 'senior_high') {
            $codes[] = '1';
        }
        $isSeniorCitizen = $seeker->date_of_birth && $seeker->date_of_birth->age >= 60;
        if ($seeker->disabilities->isNotEmpty() || $isSeniorCitizen) {
            $codes[] = '2';
        }
        if ($seeker->is_former_ofw) {
            $codes[] = '3';
        }
        if ($seeker->is_4ps_beneficiary) {
            $codes[] = '4';
        }

        return $codes;
    }
}
