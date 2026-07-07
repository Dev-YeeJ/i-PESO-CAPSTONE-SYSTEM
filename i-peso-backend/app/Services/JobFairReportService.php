<?php

namespace App\Services;

use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobFair;
use App\Models\JobFairEmployer;
use App\Models\JobFairResultReport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JobFairReportService
{
    public const MISMATCH_CODES = [
        'skills_mismatch', 'qualification_mismatch', 'experience_mismatch', 'education_mismatch',
        'salary_expectation_mismatch', 'location_mismatch', 'availability_mismatch',
        'incomplete_documents', 'failed_interview', 'other',
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
            'entries' => [],
        ]);
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

        return DB::transaction(function () use ($fair, $data, $participation, $normalized, $dedupeKey) {
            $report = JobFairResultReport::updateOrCreate(
                ['job_fair_id' => $fair->job_fair_id, 'dedupe_key' => $dedupeKey],
                collect($data)->except(['entries', 'mismatch_tallies'])->merge([
                    'normalized_company_name' => $normalized,
                    'dedupe_key' => $dedupeKey,
                    'submitted_at' => now(),
                ])->all(),
            );

            $report->entries()->delete();
            foreach ($data['entries'] ?? [] as $entry) {
                $report->entries()->create($entry);
            }

            $report->mismatchTallies()->delete();
            $tallies = $data['mismatch_tallies'] ?? collect($data['entries'] ?? [])
                ->where('status', 'rejected')->whereNotNull('mismatch_code')
                ->countBy('mismatch_code')->map(fn ($count, $code) => ['mismatch_code' => $code, 'count' => $count])->values()->all();
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
        $report->loadMissing(['jobFair', 'employer', 'entries', 'mismatchTallies']);
        $report->update(['report_generated_at' => now()]);
        $report->participation?->update(['participation_status' => 'report_generated', 'report_generated_at' => now()]);

        return Pdf::loadView('pdf.job_fairs.roi_form_3', ['report' => $report])
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
        if ((int) $data['total_male'] + (int) $data['total_female'] !== (int) $data['total_applicants']) {
            $errors['total_applicants'][] = 'Total applicants must equal male plus female applicants.';
        }
        if ((int) $data['total_hots'] + (int) $data['total_near_hired'] + (int) $data['total_rejected'] !== (int) $data['total_applicants']) {
            $errors['outcomes'][] = 'HOTS, near hired, and rejected totals must equal total applicants.';
        }
        if (collect($data['mismatch_tallies'] ?? [])->sum('count') > (int) $data['total_rejected']) {
            $errors['mismatch_tallies'][] = 'Mismatch tallies cannot exceed the rejected applicant total.';
        }
        if (($data['source'] ?? null) === 'employer_self_service') {
            $entries = collect($data['entries'] ?? []);
            if ($entries->count() !== (int) $data['total_applicants']) $errors['entries'][] = 'Detailed applicant rows must equal total applicants.';
            if ($entries->where('gender', 'male')->count() !== (int) $data['total_male'] || $entries->where('gender', 'female')->count() !== (int) $data['total_female']) $errors['entries'][] = 'Detailed applicant gender counts must match the summary.';
            if ($entries->where('status', 'rejected')->contains(fn ($entry) => blank($entry['mismatch_code'] ?? null))) $errors['entries'][] = 'Every rejected applicant requires a mismatch reason.';
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }
}
