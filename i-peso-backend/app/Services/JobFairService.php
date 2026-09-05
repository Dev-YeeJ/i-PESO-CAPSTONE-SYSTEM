<?php

namespace App\Services;

use App\Models\Employer;
use App\Models\EmployerDocument;
use App\Models\JobFair;
use App\Models\JobFairAttendee;
use App\Models\JobFairEmployer;
use App\Models\JobFairRequirement;
use App\Models\JobFairRequirementSubmission;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class JobFairService
{
    public const PUBLIC_STATUSES = ['published', 'accepting_employers', 'closed', 'completed', 'upcoming', 'ongoing'];

    /**
     * Statuses eligible for a live map pin — a stricter subset of
     * PUBLIC_STATUSES. The job fair bulletin keeps closed/completed events
     * visible as a record, but a "find it on the map right now" pin for an
     * event that already happened is just confusing clutter.
     */
    public const MAP_STATUSES = ['published', 'accepting_employers', 'upcoming', 'ongoing'];

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

    // Job Fair requirement codes that duplicate documents already collected
    // during employer accreditation. An approved document of any of these
    // types satisfies the matching Job Fair requirement automatically.
    public const REQUIREMENT_DOCUMENT_TYPES = [
        'business_permit' => ['mayors_permit'],
        'business_registration' => ['dti_certificate', 'bir_certificate', 'sec_certificate'],
        'philjobnet_registration' => ['philJobnet_proof'],
        'no_pending_case' => ['no_pending_case_certificate'],
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
            'province' => $fair->province,
            'province_code' => $fair->province_code,
            'city_municipality' => $fair->city_municipality,
            'city_code' => $fair->city_code,
            'barangay' => $fair->barangay,
            'barangay_code' => $fair->barangay_code,
            'specific_address' => $fair->specific_address,
            'latitude' => $fair->latitude,
            'longitude' => $fair->longitude,
            'google_place_id' => $fair->google_place_id,
            // Convenience string for map/display components (LocationPreviewCard,
            // "Open in Google Maps" links) so callers don't each re-join the parts.
            'full_address' => collect([$fair->venue, $fair->specific_address, $fair->barangay, $fair->city_municipality, $fair->province])
                ->filter()->unique()->join(', '),
            // Single source of truth for "does this fair get a pin on the
            // public Job Map" — computed here so the frontend never has to
            // duplicate the status list to decide it.
            'map_eligible' => (bool) $fair->is_public
                && in_array($fair->status, self::MAP_STATUSES, true)
                && $fair->latitude !== null && $fair->longitude !== null,
            'sector' => $fair->sector,
            'target_sector' => $fair->target_sector,
            'partner_agencies' => $fair->partner_agencies ?? [],
            'submission_deadline' => $fair->submission_deadline?->toIso8601String(),
            // Per-fair override still supported, but the field is no longer
            // asked for at creation — PESO's office email is constant.
            'contact_email' => $fair->contact_email ?: config('peso_knowledge.office.email'),
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
            $this->reuseVerifiedDocuments($fair, $participation);
            $this->autoSatisfyVacancyCount($fair, $participation);
            $payload['participation'] = $this->participationPayload($participation);
        }

        if ($user instanceof JobSeeker) {
            $payload['is_rsvped'] = $fair->relationLoaded('attendees')
                ? $fair->attendees->isNotEmpty()
                : JobFairAttendee::query()
                    ->where('job_fair_id', $fair->job_fair_id)
                    ->where('seeker_id', $user->seeker_id)
                    ->exists();
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
                    'reused_from_verification' => (bool) $item->employer_document_id,
                    'auto_satisfied' => $item->original_filename === self::AUTO_SATISFIED_VACANCY_LABEL,
                ])->values() : [],
            'confirmation_slip' => $participation->relationLoaded('confirmationSlip') ? $participation->confirmationSlip : null,
            'result_report' => $participation->relationLoaded('resultReport') ? $participation->resultReport : null,
        ];
    }

    /** Marks a requirement submission created by autoSatisfyVacancyCount() rather than an upload. */
    public const AUTO_SATISFIED_VACANCY_LABEL = 'Verified from active job postings';

    /**
     * "Job Vacancy Count" doesn't need a file the way Business Permit or DTI/
     * SEC registration do — PESO already knows the number, it's the sum of
     * the employer's own active job vacancy postings. Auto-satisfy it from
     * that instead of making the employer produce a document that proves a
     * number the system can already see.
     */
    public function autoSatisfyVacancyCount(JobFair $fair, JobFairEmployer $participation): void
    {
        $requirement = $fair->requirements->firstWhere('code', 'job_vacancy_count');
        if (! $requirement) {
            return;
        }

        $alreadySubmitted = $participation->requirementSubmissions
            ->contains(fn (JobFairRequirementSubmission $submission) => $submission->job_fair_requirement_id === $requirement->id);
        if ($alreadySubmitted) {
            return;
        }

        $hasActivePosting = JobVacancy::where('employer_id', $participation->employer_id)
            ->where('status', 'active')
            ->exists();
        if (! $hasActivePosting) {
            return;
        }

        JobFairRequirementSubmission::create([
            'job_fair_requirement_id' => $requirement->id,
            'job_fair_employer_id' => $participation->id,
            'employer_id' => $participation->employer_id,
            'original_filename' => self::AUTO_SATISFIED_VACANCY_LABEL,
            'status' => 'approved',
            'submitted_at' => now(),
        ]);

        $participation->load('requirementSubmissions.requirement');
        $this->syncRequirementStatus($participation);
    }

    // A verified employer has already submitted business_permit /
    // business_registration / philjobnet_registration / no_pending_case
    // documents during accreditation. Auto-satisfy the matching Job Fair
    // requirement from that record instead of asking for a duplicate
    // upload — skips any requirement already covered by a submission
    // (manual or previously reused).
    public function reuseVerifiedDocuments(JobFair $fair, JobFairEmployer $participation): void
    {
        // Callers (eventPayload) may have already eager-loaded a
        // column-limited `employer` relation (e.g. employer_id,
        // company_name, trade_name only) for display purposes — that
        // cached instance won't have verification_status, so re-fetch the
        // full record instead of trusting whatever is already attached.
        if (! Schema::hasTable('employer_documents')) {
            return;
        }

        $employer = Employer::find($participation->employer_id);

        if (! $employer || ! $employer->canPostJobs()) {
            return;
        }

        // Takes $fair directly rather than $participation->jobFair — that
        // reverse relation is never eager-loaded by callers that pull
        // participation out of an already-loaded JobFair (e.g. eventPayload's
        // $fair->employerJoins->firstWhere(...)), and lazy loading is disabled.
        $requirements = $fair->requirements
            ->whereIn('code', array_keys(self::REQUIREMENT_DOCUMENT_TYPES));

        $existingRequirementIds = $participation->requirementSubmissions->pluck('job_fair_requirement_id')->all();
        $missingRequirements = $requirements->reject(
            fn (JobFairRequirement $requirement) => in_array($requirement->id, $existingRequirementIds, true)
        );

        if ($missingRequirements->isEmpty()) {
            return;
        }

        $documentsByType = EmployerDocument::query()
            ->where('employer_id', $employer->employer_id)
            ->where('verification_status', 'approved')
            ->get()
            ->keyBy('document_type');

        $created = false;
        foreach ($missingRequirements as $requirement) {
            $document = collect(self::REQUIREMENT_DOCUMENT_TYPES[$requirement->code] ?? [])
                ->map(fn ($type) => $documentsByType->get($type))
                ->filter()
                ->first();

            if (! $document) {
                continue;
            }

            JobFairRequirementSubmission::create([
                'job_fair_requirement_id' => $requirement->id,
                'job_fair_employer_id' => $participation->id,
                'employer_id' => $employer->employer_id,
                'employer_document_id' => $document->document_id,
                'document_path' => $document->document_path,
                'original_filename' => $document->original_filename,
                'file_size' => $document->file_size,
                'mime_type' => $document->mime_type,
                'status' => 'approved',
                'submitted_at' => $document->uploaded_at ?? now(),
            ]);
            $created = true;
        }

        if ($created) {
            $participation->load('requirementSubmissions.requirement');
            $this->syncRequirementStatus($participation);
        }
    }

    /**
     * What an employer still needs to submit for a job fair, before they've
     * even joined — used for the invitation email so PESO isn't asking a
     * company for paperwork it has already approved on file, or a document
     * type that never applies to its company type (e.g. a SEC certificate
     * for a sole proprietorship).
     *
     * @return Collection<int, array{code: string, label: string}>
     */
    public function outstandingRequirementsFor(JobFair $fair, Employer $employer): Collection
    {
        $fair->loadMissing('requirements');

        // Document types this employer's company type actually needs, per
        // the same rule general accreditation already uses.
        $applicableTypes = array_unique(array_merge(
            $employer->getRequiredDocuments(),
            $employer->getOptionalDocuments(),
        ));

        $approvedTypes = Schema::hasTable('employer_documents')
            ? EmployerDocument::query()
                ->where('employer_id', $employer->employer_id)
                ->where('verification_status', 'approved')
                ->pluck('document_type')
                ->all()
            : [];

        $hasActivePosting = JobVacancy::where('employer_id', $employer->employer_id)
            ->where('status', 'active')
            ->exists();

        return $fair->requirements
            ->reject(function (JobFairRequirement $requirement) use ($applicableTypes, $approvedTypes, $hasActivePosting) {
                // PESO already knows the count from the employer's own active
                // postings — no document needed, see autoSatisfyVacancyCount().
                if ($requirement->code === 'job_vacancy_count') {
                    return $hasActivePosting;
                }

                $mappedTypes = self::REQUIREMENT_DOCUMENT_TYPES[$requirement->code] ?? null;

                // Not backed by an accreditation document (posterized vacancy,
                // confirmation slip) — always still needed.
                if ($mappedTypes === null) {
                    return false;
                }

                // Narrow to the sub-types relevant to this company type (e.g.
                // DTI for a sole proprietorship, SEC for a corporation) —
                // requirements with no company-type mapping (no pending case)
                // fall back to the full set instead of being skipped outright.
                $relevant = array_intersect($mappedTypes, $applicableTypes) ?: $mappedTypes;

                return collect($relevant)->intersect($approvedTypes)->isNotEmpty();
            })
            ->map(fn (JobFairRequirement $requirement) => [
                'code' => $requirement->code,
                'label' => $requirement->code === 'business_registration'
                    ? $this->businessRegistrationLabel($employer)
                    : $requirement->label,
            ])
            ->values();
    }

    /** DTI applies to sole proprietors, SEC to everyone else that needs it. */
    private function businessRegistrationLabel(Employer $employer): string
    {
        return match ($employer->company_type) {
            'sole_proprietorship' => 'BIR Certificate of Registration + DTI Business Name Registration',
            default => 'BIR Certificate of Registration + SEC Registration',
        };
    }

    private function syncRequirementStatus(JobFairEmployer $participation): void
    {
        $required = $participation->jobFair->requirements()->where('is_required', true)->count();
        $submitted = $participation->requirementSubmissions()->whereIn('status', ['submitted', 'approved'])->count();
        $participation->update(['participation_status' => $submitted >= $required ? 'requirements_submitted' : 'requirements_pending']);
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
