<?php

namespace App\Services;

use App\Models\Employer;
use App\Models\JobFair;
use App\Models\JobFairEmployer;
use App\Models\JobFairRequirement;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class JobFairService
{
    public const PUBLIC_STATUSES = ['published', 'accepting_employers', 'closed', 'completed', 'upcoming', 'ongoing'];

    public const PARTICIPATION_STATUSES = [
        'invited', 'interested', 'called_peso', 'pending_response', 'accepted', 'declined',
        'requirements_pending', 'requirements_submitted', 'under_review', 'approved', 'rejected',
        'attended', 'no_show', 'encoded_results', 'report_generated',
    ];

    public const REQUIREMENTS = [
        'business_permit' => 'Business Permit',
        'business_registration' => 'DTI / BIR / SEC Registration',
        'philjobnet_registration' => 'PhilJobNet Registration',
        'job_vacancy_count' => 'Job Vacancy Count',
        'posterized_vacancy' => 'Posterized Job Vacancy with Contact Details',
        'no_pending_case' => 'Certificate of No Pending Case from DOLE',
        'confirmation_slip' => 'Confirmation Slip',
    ];

    public function seedRequirements(JobFair $fair): void
    {
        foreach (self::REQUIREMENTS as $order => $label) {
            $code = is_string($order) ? $order : Str::slug($label, '_');
            JobFairRequirement::firstOrCreate(
                ['job_fair_id' => $fair->job_fair_id, 'code' => $code],
                ['label' => $label, 'is_required' => true, 'sort_order' => array_search($code, array_keys(self::REQUIREMENTS), true)],
            );
        }
    }

    public function eventPayload(JobFair $fair, mixed $user = null, bool $admin = false): array
    {
        $fair->loadMissing([
            'requirements' => fn ($query) => $query->orderBy('sort_order'),
            'employerJoins.employer:employer_id,company_name,trade_name',
            'vacancyLinks.vacancy:post_id,job_title,vacancies_count,status',
        ]);

        $participation = $user instanceof Employer
            ? $fair->employerJoins->firstWhere('employer_id', $user->employer_id)
            : null;

        $publicParticipants = $fair->employerJoins
            ->whereIn('participation_status', ['approved', 'attended', 'encoded_results', 'report_generated'])
            ->map(fn (JobFairEmployer $item) => [
                'employer_id' => $item->employer_id,
                'company_name' => $item->employer?->company_name ?: $item->employer?->trade_name,
                'status' => $item->participation_status,
            ])->filter(fn (array $item) => filled($item['company_name']))->values();

        $payload = [
            'job_fair_id' => $fair->job_fair_id,
            'title' => $fair->title,
            'description' => $fair->description,
            'start_date' => $fair->start_date?->toDateString() ?? $fair->event_date?->toDateString(),
            'end_date' => $fair->end_date?->toDateString() ?? $fair->event_date?->toDateString(),
            'event_date' => $fair->event_date?->toDateString(),
            'start_time' => $fair->start_time,
            'end_time' => $fair->end_time,
            'venue' => $fair->venue,
            'sector' => $fair->sector,
            'target_sector' => $fair->target_sector,
            'partner_agencies' => $fair->partner_agencies ?? [],
            'submission_deadline' => $fair->submission_deadline?->toIso8601String(),
            'contact_email' => $fair->contact_email,
            'maximum_representatives' => $fair->maximum_representatives ?? 2,
            'status' => $fair->status,
            'is_public' => (bool) $fair->is_public,
            'published_at' => $fair->published_at?->toIso8601String(),
            'requirements' => $fair->requirements->map(fn ($requirement) => [
                'id' => $requirement->id,
                'code' => $requirement->code,
                'label' => $requirement->label,
                'is_required' => (bool) $requirement->is_required,
            ])->values(),
            'participating_employers' => $publicParticipants,
            'published_vacancies' => $fair->vacancyLinks
                ->filter(fn ($link) => $link->vacancy?->status === 'active')
                ->map(fn ($link) => [
                    'post_id' => $link->vacancy_id,
                    'job_title' => $link->vacancy?->job_title,
                    'vacancies_count' => (int) ($link->vacancy?->vacancies_count ?? 0),
                ])->values(),
        ];

        if ($participation) {
            $participation->loadMissing(['requirementSubmissions.requirement', 'confirmationSlip', 'resultReport.entries', 'resultReport.mismatchTallies']);
            $payload['participation'] = $this->participationPayload($participation);
        }

        if ($admin) {
            $payload['metrics'] = $this->dashboard($fair);
        }

        return $payload;
    }

    public function participationPayload(JobFairEmployer $participation): array
    {
        return [
            'id' => $participation->id,
            'employer_id' => $participation->employer_id,
            'company_name' => $participation->employer?->company_name ?: $participation->employer?->trade_name,
            'status' => $participation->participation_status,
            'source' => $participation->source,
            'confirmation_channel' => $participation->confirmation_channel,
            'remarks' => $participation->remarks,
            'joined_at' => $participation->joined_at?->toIso8601String(),
            'invited_at' => $participation->invited_at?->toIso8601String(),
            'requirements' => $participation->relationLoaded('requirementSubmissions')
                ? $participation->requirementSubmissions->map(fn ($item) => [
                    'id' => $item->id,
                    'job_fair_requirement_id' => $item->job_fair_requirement_id,
                    'label' => $item->requirement?->label,
                    'status' => $item->status,
                    'original_filename' => $item->original_filename,
                    'admin_remarks' => $item->admin_remarks,
                    'submitted_at' => $item->submitted_at?->toIso8601String(),
                ])->values() : [],
            'confirmation_slip' => $participation->relationLoaded('confirmationSlip') ? $participation->confirmationSlip : null,
            'result_report' => $participation->relationLoaded('resultReport') ? $participation->resultReport : null,
        ];
    }

    public function dashboard(JobFair $fair): array
    {
        $participants = $fair->employerJoins()->get();
        $reports = $fair->resultReports()->get();
        $statusCount = fn (string $status): int => $participants->where('participation_status', $status)->count();

        return [
            'total_invited' => $participants->whereNotNull('invited_at')->count(),
            'interested' => $statusCount('interested'),
            'accepted' => $statusCount('accepted'),
            'declined' => $statusCount('declined'),
            'requirements_submitted' => $statusCount('requirements_submitted'),
            'requirements_incomplete' => $participants->whereIn('participation_status', ['requirements_pending', 'accepted'])->count(),
            'approved' => $statusCount('approved'),
            'attended' => $participants->whereNotNull('attended_at')->count(),
            'no_show' => $participants->whereNotNull('no_show_at')->count(),
            'self_service_reports' => $reports->where('source', 'employer_self_service')->count(),
            'proxy_reports' => $reports->where('source', 'admin_proxy')->count(),
            'total_applicants' => (int) $reports->sum('total_applicants'),
            'total_male' => (int) $reports->sum('total_male'),
            'total_female' => (int) $reports->sum('total_female'),
            'total_hots' => (int) $reports->sum('total_hots'),
            'total_near_hired' => (int) $reports->sum('total_near_hired'),
            'total_rejected' => (int) $reports->sum('total_rejected'),
            'total_vacancies_solicited' => (int) $reports->sum('total_vacancies_solicited'),
            'total_vacancies_offered' => (int) $reports->sum('total_vacancies_offered'),
        ];
    }

    public function normalizedCompanyName(string $name): string
    {
        return Str::of($name)->lower()->ascii()->replaceMatches('/[^a-z0-9]+/', ' ')->squish()->value();
    }
}
