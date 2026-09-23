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
use App\Notifications\JobFairNotification;
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

    /**
     * Statuses in which a fair is still soliciting employer participation.
     * Deliberately narrower than PUBLIC_STATUSES: a closed/completed fair
     * stays *visible* to an employer (so their own history, requirements and
     * reports don't vanish from the module) but can no longer be joined.
     * Single source of truth for the list interest() used to hardcode.
     */
    public const EMPLOYER_OPEN_STATUSES = ['published', 'accepting_employers', 'upcoming'];

    public const PARTICIPATION_STATUSES = [
        'invited', 'requirements_pending', 'under_review', 'approved', 'declined', 'rejected',
        'attended', 'no_show', 'encoded_results', 'report_generated',
    ];

    public const REQUIREMENTS = [
        'business_permit' => 'Business Permit',
        'business_registration' => 'DTI / BIR / SEC Registration',
        'philjobnet_registration' => 'PhilJobNet Registration',
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

    /**
     * Shared "who is this seeker" payload for anything that looks a job-fair
     * attendee up by QR/seeker_id — currently the admin info-desk check-in;
     * the employer-facing scanQr() this was lifted from stays unrouted.
     */
    public function attendeeProfile(JobFairAttendee $attendee): array
    {
        $seeker = $attendee->seeker;

        return [
            'job_fair_id' => $attendee->job_fair_id,
            'seeker_id' => $attendee->seeker_id,
            'is_guest' => $seeker === null,
            'qr_code_uuid' => $attendee->qr_code_uuid,
            'is_attended' => (bool) $attendee->is_attended,
            'scanned_at' => $attendee->scanned_at?->toISOString(),
            'name' => $seeker ? trim("{$seeker->first_name} {$seeker->last_name}") : $attendee->guest_name,
            'email' => $seeker?->email ?? $attendee->guest_email,
            'mobile_number' => $seeker?->mobile_number ?? $attendee->guest_mobile_number,
            'educ_attainment' => $seeker?->educ_attainment ?? $attendee->guest_educ_attainment,
            'employment_status' => $seeker?->employment_status,
            'preferred_job' => $attendee->guest_preferred_job,
            'skills' => $seeker?->seekerSkills->pluck('skill_name')->filter()->values()->all() ?? [],
            'occupations' => $seeker?->occupations ?? [],
            'educations' => $seeker?->educations ?? [],
            'work_experiences' => $seeker?->workExperiences ?? [],
        ];
    }

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

    /**
     * Single source of truth for "can an employer still join this fair?".
     *
     * Three independent gates, checked in the order an admin would explain
     * them: the fair has to be publicly announced, still in a soliciting
     * status, and the requirements deadline (plus the event itself) must not
     * have passed. Previously interest() hardcoded only the status half of
     * this and the submission_deadline column — required at creation time,
     * shown on every card — was never actually enforced anywhere, so an
     * employer could join the night before a fair they had no chance of
     * filing requirements for.
     *
     * Returns the reason as well as the verdict so the employer UI can say
     * why the Join button is gone instead of just hiding it.
     *
     * @return array{open: bool, reason: ?string}
     */
    public function employerRegistrationState(JobFair $fair): array
    {
        $closed = fn (string $reason) => ['open' => false, 'reason' => $reason];

        if (! $fair->is_public || $fair->published_at === null) {
            return $closed('This event has not been published yet.');
        }

        if (! in_array($fair->status, self::EMPLOYER_OPEN_STATUSES, true)) {
            return $closed('This event is no longer accepting employer participation.');
        }

        if ($fair->submission_deadline !== null && $fair->submission_deadline->isPast()) {
            return $closed('The deadline for employer registration closed on '.$fair->submission_deadline->format('F j, Y').'.');
        }

        // Legacy rows may only carry event_date; new ones always have
        // start_date/end_date (both required by the create form).
        $lastDay = $fair->end_date ?? $fair->start_date ?? $fair->event_date;
        if ($lastDay !== null && $lastDay->copy()->endOfDay()->isPast()) {
            return $closed('This event has already taken place.');
        }

        return ['open' => true, 'reason' => null];
    }

    /** Query-level twin of employerRegistrationState() for list endpoints. */
    public function scopeOpenToEmployers(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query
            ->where('is_public', true)
            ->whereNotNull('published_at')
            ->whereIn('status', self::EMPLOYER_OPEN_STATUSES)
            ->where(fn ($deadline) => $deadline->whereNull('submission_deadline')->orWhere('submission_deadline', '>=', now()))
            ->where(fn ($ended) => $ended
                ->whereRaw('COALESCE(end_date, start_date, event_date) IS NULL')
                ->orWhereRaw('COALESCE(end_date, start_date, event_date) >= ?', [now()->toDateString()]));
    }

    /**
     * Catches an employer up on every fair that is still open to them but
     * that they carry no participation row for — creating the same "invited"
     * record and sending the same invitation letter publish()'s broadcast
     * would have, had they been verified at the time.
     *
     * Without this, invitations were a one-shot event fired at first publish
     * over whoever happened to be verified in that instant: an employer
     * accredited a day later was never invited, never notified, and (before
     * the list query was fixed alongside this) often couldn't even see the
     * fair to join it themselves.
     *
     * @return int number of fairs the employer was newly invited to
     */
    public function inviteEmployerToOpenFairs(Employer $employer): int
    {
        if ($employer->verification_status !== 'verified') {
            return 0;
        }

        $alreadyTracked = JobFairEmployer::query()
            ->where('employer_id', $employer->employer_id)
            ->pluck('job_fair_id');

        $invited = 0;

        $this->scopeOpenToEmployers(JobFair::query())
            ->whereNotIn('job_fair_id', $alreadyTracked)
            ->get()
            ->each(function (JobFair $fair) use ($employer, &$invited) {
                $this->seedRequirements($fair);
                $participation = JobFairEmployer::create([
                    'job_fair_id' => $fair->job_fair_id,
                    'employer_id' => $employer->employer_id,
                    'participation_status' => 'invited',
                    'source' => 'peso_broadcast',
                    'confirmation_channel' => 'digital',
                    'invited_at' => now(),
                ]);
                $this->reuseVerifiedDocuments($fair, $participation);

                // One employer's mail/SMS must never be what stops their
                // accreditation from being approved — the participation row
                // (which is what makes the fair actionable for them) is
                // already committed above either way.
                try {
                    $employer->notify(new JobFairNotification($fair, 'invited', $participation, $this->outstandingRequirementsFor($fair, $employer)));
                } catch (\Throwable $exception) {
                    report($exception);
                }

                $invited++;
            });

        return $invited;
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

        $registration = $this->employerRegistrationState($fair);

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
            'banner_url' => $fair->banner_url ? config('app.url') . $fair->banner_url : null,
            // Whether an employer can still join, decided here rather than
            // re-derived in the employer dashboard from status strings — the
            // old UI showed a "Join Job Fair" button for any fair with no
            // participation row, including closed/past ones, and the click
            // just 422'd.
            'employer_registration_open' => $registration['open'],
            'employer_registration_closed_reason' => $registration['reason'],
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
            // Accreditation is a standing fact about the employer's account,
            // completely independent of where they are in this fair's
            // invite/accept pipeline — there's no reason a merely
            // "interested" or "invited" employer should be told to
            // re-upload a Business Permit PESO already has on file. Self-
            // heals any participation that hasn't picked up its reusable
            // documents yet, at any stage short of an explicit decline
            // (reuseVerifiedDocuments() is a cheap no-op once nothing's
            // missing, so this is safe to call unconditionally otherwise).
            if ($participation->participation_status !== 'declined') {
                $this->reuseVerifiedDocuments($fair, $participation);
                // reuseVerifiedDocuments() only re-syncs participation_status
                // when it just created a submission — a participation whose
                // requirements were already fully approved (nothing left to
                // reuse) never hits that branch, so it can get stuck one
                // status behind forever (e.g. a bulk data migration that
                // overwrites participation_status without touching the
                // underlying submissions). Re-check every time this loads
                // instead; syncRequirementStatus() is already a cheap no-op
                // for anything outside the requirements-gathering phase.
                $participation->setRelation('jobFair', $fair);
                $this->syncRequirementStatus($participation);
            }
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
        // Reused/auto-satisfied documents are now populated the moment a
        // participation exists at all (see reuseVerifiedDocuments()'s call
        // sites — expressing interest, an admin invite, the publish-time
        // broadcast, and this payload's own callers), so the checklist
        // reflects real state at every stage instead of being hidden pre-
        // acceptance: an employer's standing accreditation isn't something
        // that only counts once they've said yes to one specific fair.
        $showRequirements = $participation->relationLoaded('requirementSubmissions');

        return [
            'id' => $participation->id,
            'employer_id' => $participation->employer_id,
            'company_name' => $participation->employer?->company_name ?: $participation->employer?->trade_name,
            'company_logo' => $participation->employer?->company_logo,
            'representative_name' => $participation->employer?->representative_name,
            'status' => $participation->participation_status,
            'source' => $participation->source,
            'confirmation_channel' => $participation->confirmation_channel,
            'remarks' => $participation->remarks,
            'joined_at' => $participation->joined_at?->toIso8601String(),
            'invited_at' => $participation->invited_at?->toIso8601String(),
            'requirements' => $showRequirements
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



    // A verified employer has already submitted business_permit /
    // business_registration / philjobnet_registration / no_pending_case
    // documents during accreditation. Auto-satisfy the matching Job Fair
    // requirement from that record instead of asking for a duplicate
    // upload — skips any requirement already covered by a submission
    // (manual or previously reused).
    public function reuseVerifiedDocuments(JobFair $fair, JobFairEmployer $participation): void
    {
        // Self-contained on purpose: this now gets called from several
        // places (expressing interest, an admin invite, the publish-time
        // broadcast, and eventPayload's self-heal) — loading its own
        // relations here means none of those callers can forget to and
        // hit a lazy-loading violation.
        $fair->loadMissing('requirements');
        $participation->loadMissing('requirementSubmissions.requirement');

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
            ->reject(function (JobFairRequirement $requirement) use ($applicableTypes, $approvedTypes) {

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

    /**
     * Runs the moment a participation is accepted — whether the employer
     * clicked Accept Invitation themselves or PESO recorded a phone/walk-in
     * acceptance from the admin side. Opens the requirements-gathering
     * phase, then immediately pulls in whatever verified accreditation
     * documents and active-posting vacancy count already cover a Job Fair
     * requirement, so an already-verified employer can resolve straight to
     * "approved" instead of being asked to re-upload paperwork PESO already
     * has on file.
     *
     * The status flip to requirements_pending happens *before*
     * reuseVerifiedDocuments()/autoSatisfyVacancyCount() run (rather than
     * after, per the two calls' own internal syncRequirementStatus() calls)
     * so any auto-approval those trigger resolves exactly once, instead of
     * being computed early and then immediately clobbered back to
     * requirements_pending by this method's own status update.
     */
    public function processAcceptance(JobFair $fair, JobFairEmployer $participation): void
    {
        $participation->update(['participation_status' => 'requirements_pending']);

        $this->reuseVerifiedDocuments($fair, $participation);
        $this->syncRequirementStatus($participation);
    }

    /**
     * Recomputes participation_status from actual submission state — never
     * a manual admin pick for these three values. Only touches a
     * participation still in the requirements-gathering phase, so it never
     * downgrades a decisive manual call (rejected/attended/no_show) or a
     * later report-stage status back into this pipeline.
     *
     * Once every *required* requirement is individually approved (whether
     * by an admin reviewing a submission, or auto-satisfied/reused without
     * ever needing review), this jumps straight to "approved" instead of
     * sitting at "requirements_submitted" waiting for someone to notice and
     * flip a separate status dropdown by hand.
     */
    public function syncRequirementStatus(JobFairEmployer $participation): void
    {
        // 'invited' is deliberately excluded even though reuseVerifiedDocuments()
        // already runs (and can create approved submissions) at invite time —
        // an employer's standing accreditation should be visible to the admin
        // immediately, but the participation itself must stay 'invited' until
        // the employer actually accepts. respond()/processAcceptance() are the
        // only things that move a participation out of 'invited', and both set
        // participation_status to 'requirements_pending' before this ever runs.
        if (! in_array($participation->participation_status, ['requirements_pending', 'under_review'], true)) {
            return;
        }

        $requiredIds = $participation->jobFair->requirements()->where('is_required', true)->pluck('id');
        $submissions = $participation->requirementSubmissions()->whereIn('job_fair_requirement_id', $requiredIds)->get(['status']);
        $submittedCount = $submissions->whereIn('status', ['submitted', 'approved'])->count();
        $approvedCount = $submissions->where('status', 'approved')->count();
        $required = $requiredIds->count();

        if ($required === 0 || $approvedCount >= $required) {
            $participation->update(['participation_status' => 'approved', 'approved_at' => now()]);
            $participation->employer->notify(new JobFairNotification($participation->jobFair, 'participation_approved', $participation));
            return;
        }

        $participation->update(['participation_status' => $submittedCount >= $required ? 'under_review' : 'requirements_pending']);
    }

    public function dashboard(JobFair $fair): array
    {
        $participants = $fair->employerJoins()->get();
        $reports = $fair->resultReports()->get();
        $attendees = Schema::hasTable('job_fair_attendees')
            ? $fair->attendees()->get(['is_attended', 'seeker_id'])
            : collect();
        $statusCount = fn (string $status): int => $participants->where('participation_status', $status)->count();

        return [
            'seekers_rsvped' => $attendees->whereNotNull('seeker_id')->count(),
            'attendance' => $attendees->where('is_attended', true)->count(),
            'total_invited' => $participants->whereNotNull('invited_at')->count(),
            'requirements_pending' => $statusCount('requirements_pending'),
            'under_review' => $statusCount('under_review'),
            'declined' => $statusCount('declined'),
            'requirements_incomplete' => $participants->where('participation_status', 'requirements_pending')->count(),
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
