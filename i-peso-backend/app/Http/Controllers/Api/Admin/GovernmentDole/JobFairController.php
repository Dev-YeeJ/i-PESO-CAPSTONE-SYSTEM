<?php

namespace App\Http\Controllers\Api\Admin\GovernmentDole;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobFair;
use App\Models\JobFairAttendee;
use App\Models\JobFairEmployer;
use App\Models\JobFairConfirmationSlip;
use App\Models\JobFairRequirementSubmission;
use App\Models\JobFairResultReport;
use App\Models\JobSeeker;
use App\Models\SeekerEducation;
use App\Notifications\JobFairNotification;
use App\Notifications\JobFairPublished;
use App\Services\GoogleMapsService;
use App\Services\JobFairReportService;
use App\Services\JobFairService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JobFairController extends Controller
{
    public function index(Request $request, JobFairService $service): JsonResponse
    {
        $this->admin($request);
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['draft', 'published', 'accepting_employers', 'closed', 'completed', 'cancelled', 'upcoming', 'ongoing'])],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'title'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $query = JobFair::query();
        if ($filters['search'] ?? null) $query->where('title', 'like', '%'.$filters['search'].'%');
        if ($filters['status'] ?? null) $query->where('status', $filters['status']);
        match ($filters['sort'] ?? 'newest') {
            'oldest' => $query->orderByRaw('COALESCE(start_date, event_date) asc'),
            'title' => $query->orderBy('title'),
            default => $query->orderByRaw('COALESCE(start_date, event_date) desc'),
        };
        $fairs = $query->paginate($filters['per_page'] ?? 15);
        $fairs->getCollection()->transform(fn (JobFair $fair) => $service->eventPayload($fair, null, true));
        return response()->json($fairs);
    }

    /**
     * Summary counts for the directory's stat-card row — mirrors
     * Admin\ConstituentCRM\EmployerController::summary()'s shape/purpose.
     */
    public function summary(Request $request): JsonResponse
    {
        $this->admin($request);
        $summary = JobFair::query()->selectRaw(
            'COUNT(*) AS total'
            ." , SUM(CASE WHEN status IN ('published', 'accepting_employers', 'upcoming') THEN 1 ELSE 0 END) AS upcoming"
            ." , SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) AS ongoing"
            ." , SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed"
        )->first();

        return response()->json([
            'total' => (int) ($summary->total ?? 0),
            'upcoming' => (int) ($summary->upcoming ?? 0),
            'ongoing' => (int) ($summary->ongoing ?? 0),
            'completed' => (int) ($summary->completed ?? 0),
        ]);
    }

    public function store(Request $request, JobFairService $service, GoogleMapsService $maps): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate($this->eventRules());
        $validated = $this->applyLocationFallback($validated, null, $maps);
        // Status is no longer collected on the create form — every new fair
        // starts as an unpublished draft; PESO publishes it explicitly
        // afterward (the moment that also fires the employer invitation blast).
        $validated['status'] = 'draft';
        $fair = JobFair::create([...$validated, 'admin_id' => $admin->admin_id, 'created_by' => $admin->admin_id,
            'event_date' => $validated['start_date'], 'is_public' => false, 'published_at' => null, 'published_by' => null]);
        $service->seedRequirements($fair);
        return response()->json(['message' => 'Job Fair created as a draft.', 'job_fair' => $service->eventPayload($fair, null, true)], 201);
    }

    public function show(Request $request, int $id, JobFairService $service): JsonResponse
    {
        $this->admin($request);
        $fair = JobFair::with([
            'employerJoins.employer', 'employerJoins.requirementSubmissions.requirement',
            'employerJoins.confirmationSlip.vacancies', 'employerJoins.resultReport',
            'resultReports.mismatchTallies', 'resultReports.entries',
            'resultReports.employer:employer_id,company_name,representative_name,email',
            'resultReports.encodedByAdmin:admin_id,first_name,last_name,email',
        ])->findOrFail($id);
        $payload = $service->eventPayload($fair, null, true);

        // This list is the admin's own source of truth for each employer's
        // participation_status, built straight off $fair->employerJoins —
        // it bypasses eventPayload()'s single-participation self-heal
        // entirely (that only runs for the one employer matching $user, and
        // $user is null here), so without this it can show an employer
        // stuck at "requirements_pending" indefinitely even after every one
        // of their requirements has actually been approved.
        $fair->employerJoins->each(function (JobFairEmployer $item) use ($fair, $service) {
            if ($item->participation_status === 'declined') {
                return;
            }
            $item->setRelation('jobFair', $fair);
            $service->reuseVerifiedDocuments($fair, $item);
            $service->syncRequirementStatus($item);
        });
        $payload['participants'] = $fair->employerJoins->map(fn ($item) => $service->participationPayload($item))->values();
        $payload['result_reports'] = $fair->resultReports;
        $payload['proxy_confirmation_slips'] = $fair->confirmationSlips()->where('source', 'admin_proxy')->get();
        return response()->json($payload);
    }

    public function update(Request $request, int $id, JobFairService $service, GoogleMapsService $maps): JsonResponse
    {
        $this->admin($request);
        $fair = JobFair::findOrFail($id);
        $validated = $request->validate($this->eventRules(true));
        $validated = $this->applyLocationFallback($validated, $fair, $maps);
        if (isset($validated['start_date'])) $validated['event_date'] = $validated['start_date'];
        if (isset($validated['status']) && in_array($validated['status'], ['published', 'accepting_employers'], true)) {
            $validated['is_public'] = true; $validated['published_at'] = $fair->published_at ?: now(); $validated['published_by'] = $request->user()->admin_id;
        }
        $fair->update($validated);
        $service->seedRequirements($fair);
        return response()->json(['message' => 'Job Fair updated.', 'job_fair' => $service->eventPayload($fair->fresh(), null, true)]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->admin($request);
        $fair = JobFair::findOrFail($id);
        
        $hasActiveParticipation = $fair->employerJoins()->where('participation_status', 'approved')->exists();
        
        abort_if($hasActiveParticipation || $fair->resultReports()->exists(), 422, 'A job fair with active employer participation or report records cannot be deleted. Cancel it instead.');
        $fair->delete();
        return response()->json(['message' => 'Job Fair deleted.']);
    }

    public function uploadBanner(Request $request, int $id): JsonResponse
    {
        $this->admin($request);
        $fair = JobFair::findOrFail($id);
        
        $request->validate([
            'banner' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,svg', 'max:5120'],
        ]);

        if ($fair->banner_url) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $fair->banner_url));
        }

        $path = $request->file('banner')->store('job-fair-banners', 'public');
        $fair->update(['banner_url' => '/storage/' . $path]);

        return response()->json(['message' => 'Banner uploaded successfully.', 'banner_url' => $fair->banner_url]);
    }

    public function publish(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate(['status' => ['nullable', Rule::in(['published', 'accepting_employers'])]]);
        $service->seedRequirements($jobFair);

        // Only the first publish fires the invitation blast — re-publishing
        // after a later status change must not re-email every employer.
        $isFirstPublish = $jobFair->published_at === null;

        $attributes = ['is_public' => true];

        if ($isFirstPublish) {
            $attributes['status'] = $validated['status'] ?? 'published';
            $attributes['published_at'] = now();
            $attributes['published_by'] = $admin->admin_id;
        } else {
            // A second publish used to overwrite published_at with now()
            // (losing the real announcement date, which the invitation
            // letter and the audit trail both read) and force the status
            // back to whatever the button sent — silently re-opening a fair
            // staff had already moved to closed/completed. Re-publishing now
            // only changes the status when one was explicitly asked for, and
            // only ever from another still-open status.
            if (($validated['status'] ?? null) !== null && in_array($jobFair->status, JobFairService::EMPLOYER_OPEN_STATUSES, true)) {
                $attributes['status'] = $validated['status'];
            }
        }

        $jobFair->update($attributes);

        $invited = 0;
        $seekersNotified = 0;

        if ($isFirstPublish) {
            // Pre-calculate counts since defer() runs after the response is sent.
            $alreadyTracked = \App\Models\JobFairEmployer::where('job_fair_id', $jobFair->job_fair_id)->pluck('employer_id');
            $invited = \App\Models\Employer::where('verification_status', 'verified')->whereNotIn('employer_id', $alreadyTracked)->count();
            $seekersNotified = \App\Models\JobSeeker::count();

            // Because shared hosting often kills requests longer than 30-60s,
            // we use defer() to send the emails *after* the fast JSON response
            // is returned to the frontend. This prevents the 504 Gateway Timeout
            // and lets the admin see the success modal instantly.
            defer(function () use ($jobFair, $service) {
                set_time_limit(0);
                $this->broadcastInvitations($jobFair, $service);
                $this->broadcastToSeekers($jobFair);
            });
        }

        return response()->json([
            'message' => $isFirstPublish
                ? "Job Fair announcement published. {$invited} verified employer(s) notified by email, {$seekersNotified} job seeker(s) notified."
                : 'Job Fair announcement updated. Use "Invite new employers" to reach employers accredited since the announcement.',
            'job_fair' => $service->eventPayload($jobFair->fresh(), null, true),
        ]);
    }

    /**
     * The deliberate second half of what the old always-visible "Publish"
     * button was silently being asked to do. broadcastInvitations() only ever
     * ran on first publish and only ever covered employers verified in that
     * instant, so a company accredited the following week was never invited
     * to an ongoing fair. This re-runs it on demand: employers already
     * tracked on the fair are skipped, so it is safe to press repeatedly and
     * never re-mails anyone who was already invited.
     */
    public function resendInvitations(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $this->admin($request);
        abort_if($jobFair->published_at === null, 422, 'Publish the announcement before inviting employers.');
        $registration = $service->employerRegistrationState($jobFair);
        abort_unless($registration['open'], 422, $registration['reason'] ?? 'This event is no longer accepting employer participation.');

        $service->seedRequirements($jobFair);
        set_time_limit(0);
        $invited = $this->broadcastInvitations($jobFair, $service);

        return response()->json([
            'message' => $invited > 0
                ? "{$invited} newly accredited employer(s) invited."
                : 'Every verified employer is already tracked on this event.',
            'invited' => $invited,
            'job_fair' => $service->eventPayload($jobFair->fresh(), null, true),
        ]);
    }

    /**
     * Info-desk scan: staff points their phone camera at a seeker's digital
     * QR pass (or types a seeker in via the manual-search fallback) and gets
     * their pre-registration back, marking attendance on first scan. Scanning
     * the same pass twice is not an error — it just reports the original
     * check-in time instead of overwriting it.
     */
    public function checkIn(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $this->admin($request);
        $validated = $request->validate([
            'qr_code_uuid' => ['required_without_all:seeker_id,attendee_id', 'uuid'],
            'seeker_id' => ['required_without_all:qr_code_uuid,attendee_id', 'integer', 'exists:job_seekers,seeker_id'],
            // Lets the manual-search fallback re-select a result row directly —
            // the only option for a guest walk-in, which has no seeker_id or QR.
            'attendee_id' => ['required_without_all:qr_code_uuid,seeker_id', 'integer', 'exists:job_fair_attendees,id'],
        ]);

        $attendee = JobFairAttendee::query()
            ->with(['seeker.seekerSkills', 'seeker.educations', 'seeker.workExperiences', 'seeker.occupations'])
            ->where('job_fair_id', $jobFair->job_fair_id)
            ->when($validated['qr_code_uuid'] ?? null, fn ($query, $uuid) => $query->where('qr_code_uuid', $uuid))
            ->when($validated['seeker_id'] ?? null, fn ($query, $seekerId) => $query->where('seeker_id', $seekerId))
            ->when($validated['attendee_id'] ?? null, fn ($query, $attendeeId) => $query->where('id', $attendeeId))
            ->first();

        if (! $attendee) {
            return response()->json(['message' => 'No pre-registration found for this job fair.'], 404);
        }

        if ($attendee->is_attended) {
            return response()->json([
                'message' => 'Already checked in.',
                'status' => 'already_checked_in',
                'attendee' => $service->attendeeProfile($attendee),
            ]);
        }

        $attendee->forceFill(['scanned_at' => now(), 'is_attended' => true])->save();

        return response()->json([
            'message' => 'Checked in.',
            'status' => 'checked_in',
            'attendee' => $service->attendeeProfile($attendee),
        ]);
    }

    /**
     * Manual fallback for when the camera can't read a pass — glare, a
     * cracked screen, low battery brightness, all normal at a mall event.
     * Covers both app-registered attendees and previously-encoded guests.
     */
    public function attendees(Request $request, JobFair $jobFair): JsonResponse
    {
        $this->admin($request);
        $validated = $request->validate(['search' => ['nullable', 'string', 'max:255']]);
        $search = $validated['search'] ?? null;

        $attendees = JobFairAttendee::query()
            ->with('seeker:seeker_id,first_name,last_name,mobile_number,email')
            ->where('job_fair_id', $jobFair->job_fair_id)
            ->when($search, fn ($query) => $query->where(function ($outer) use ($search) {
                $outer->whereHas('seeker', function ($seekerQuery) use ($search) {
                    $seekerQuery->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('mobile_number', 'like', "%{$search}%");
                })
                    ->orWhere('guest_name', 'like', "%{$search}%")
                    ->orWhere('guest_mobile_number', 'like', "%{$search}%");
            }))
            ->orderByDesc('is_attended')
            ->orderByDesc('scanned_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (JobFairAttendee $attendee) => [
                'id' => $attendee->id,
                'seeker_id' => $attendee->seeker_id,
                'name' => $attendee->seeker ? trim("{$attendee->seeker->first_name} {$attendee->seeker->last_name}") : $attendee->guest_name,
                'mobile_number' => $attendee->seeker?->mobile_number ?? $attendee->guest_mobile_number,
                'email' => $attendee->seeker?->email ?? $attendee->guest_email,
                'is_guest' => $attendee->seeker_id === null,
                'is_attended' => (bool) $attendee->is_attended,
                'scanned_at' => $attendee->scanned_at?->toISOString(),
                'preferred_job' => $attendee->guest_preferred_job,
            ])
            ->values();

        return response()->json(['data' => $attendees]);
    }

    /**
     * For attendees with no i-peso account at all — only the physical/Google
     * Form pre-registration exists for them. Staff types what the form would
     * have captured and this both checks them in and makes them count
     * correctly in the SPRS "job applicants registered" tally.
     */
    public function encodeWalkIn(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $this->admin($request);
        $validated = $request->validate([
            'guest_name' => ['required', 'string', 'max:255'],
            'guest_mobile_number' => ['nullable', 'string', 'max:40'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_educ_attainment' => ['nullable', 'string', 'max:100'],
            'guest_preferred_job' => ['nullable', 'string', 'max:255'],
        ]);

        $attendee = JobFairAttendee::create([
            'job_fair_id' => $jobFair->job_fair_id,
            'qr_code_uuid' => (string) Str::uuid(),
            'scanned_at' => now(),
            'is_attended' => true,
            ...$validated,
        ]);

        return response()->json([
            'message' => 'Walk-in registration encoded and checked in.',
            'status' => 'checked_in',
            'attendee' => $service->attendeeProfile($attendee),
        ], 201);
    }

    public function invite(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $this->admin($request);
        $validated = $request->validate(['employer_id' => ['required', 'integer', 'exists:employers,employer_id'], 'remarks' => ['nullable', 'string', 'max:2000']]);
        $employer = Employer::findOrFail($validated['employer_id']);
        abort_unless($employer->verification_status === 'verified', 422, 'Only verified employers may be invited digitally.');
        $participation = JobFairEmployer::updateOrCreate(
            ['job_fair_id' => $jobFair->job_fair_id, 'employer_id' => $employer->employer_id],
            ['participation_status' => 'invited', 'source' => 'admin_invitation', 'confirmation_channel' => 'digital', 'invited_at' => now(), 'remarks' => $validated['remarks'] ?? null],
        );
        $service->reuseVerifiedDocuments($jobFair, $participation);
        $employer->notify(new JobFairNotification($jobFair, 'invited', $participation, $service->outstandingRequirementsFor($jobFair, $employer)));
        return response()->json(['message' => 'Employer invited.', 'participation' => $service->participationPayload($participation->fresh(['requirementSubmissions.requirement']))], 201);
    }

    /**
     * Broadcasts the formal invitation letter to every verified employer not
     * already tracked on this fair, the digital equivalent of PESO mailing
     * the same letter to every company on file. Each employer only sees the
     * documentary requirements still outstanding for their company type and
     * accreditation record — see JobFairService::outstandingRequirementsFor().
     */
    private function broadcastInvitations(JobFair $jobFair, JobFairService $service): int
    {
        $alreadyTracked = JobFairEmployer::where('job_fair_id', $jobFair->job_fair_id)->pluck('employer_id');
        $invited = 0;

        Employer::query()
            ->where('verification_status', 'verified')
            ->whereNotIn('employer_id', $alreadyTracked)
            ->chunkById(50, function ($employers) use ($jobFair, $service, &$invited) {
                foreach ($employers as $employer) {
                    $participation = JobFairEmployer::create([
                        'job_fair_id' => $jobFair->job_fair_id,
                        'employer_id' => $employer->employer_id,
                        'participation_status' => 'invited',
                        'source' => 'peso_broadcast',
                        'confirmation_channel' => 'digital',
                        'invited_at' => now(),
                    ]);
                    $service->reuseVerifiedDocuments($jobFair, $participation);

                    // These notifications go out over SMTP and SMS, inline,
                    // one employer at a time. A single bad address or a
                    // gateway hiccup used to throw straight out of the
                    // chunk callback and abandon the rest of the blast
                    // mid-list, leaving the remaining employers with no
                    // invitation at all. The participation row above is
                    // what actually makes the fair actionable for them, and
                    // it is already committed, so log and keep going.
                    try {
                        $employer->notify(new JobFairNotification($jobFair, 'invited', $participation, $service->outstandingRequirementsFor($jobFair, $employer)));
                    } catch (\Throwable $exception) {
                        report($exception);
                    }

                    $invited++;
                }
            }, 'employer_id');

        return $invited;
    }

    /**
     * Tells every registered job seeker a fair just went public — the
     * seeker-side mirror of broadcastInvitations() above, same trigger,
     * same one-shot-on-first-publish guard. In-app + push only (see
     * JobFairPublished), not email — this is an FYI nudge, not a business
     * letter, so it uses the same channel pair GovernmentProgramNotification
     * already uses for "something new to see" announcements.
     */
    private function broadcastToSeekers(JobFair $jobFair): int
    {
        $notified = 0;

        JobSeeker::query()->chunkById(200, function ($seekers) use ($jobFair, &$notified) {
            foreach ($seekers as $seeker) {
                $seeker->notify(new JobFairPublished($jobFair));
                $notified++;
            }
        }, 'seeker_id');

        return $notified;
    }

    public function participationStatus(Request $request, JobFair $jobFair, JobFairEmployer $participation, JobFairService $service): JsonResponse
    {
        $admin = $this->admin($request);
        abort_unless($participation->job_fair_id === $jobFair->job_fair_id, 404);
        $validated = $request->validate([
            'status' => ['required', Rule::in(JobFairService::PARTICIPATION_STATUSES)],
            'remarks' => ['nullable', 'string', 'max:3000'], 'confirmation_channel' => ['nullable', Rule::in(['digital', 'phone', 'email', 'walk_in'])],
        ]);
        $timestamps = match ($validated['status']) {
            'requirements_pending', 'declined' => ['responded_at' => now()], 'under_review', 'approved', 'rejected' => ['reviewed_at' => now(), 'reviewed_by' => $admin->admin_id],
            'attended' => ['attended_at' => now()], 'no_show' => ['no_show_at' => now()], default => [],
        };
        if ($validated['status'] === 'approved') $timestamps['approved_at'] = now();
        $participation->update([...$timestamps, 'participation_status' => $validated['status'], 'remarks' => $validated['remarks'] ?? $participation->remarks,
            'confirmation_channel' => $validated['confirmation_channel'] ?? $participation->confirmation_channel]);
        if (in_array($validated['status'], ['approved', 'rejected'], true)) {
            $participation->employer->notify(new JobFairNotification($jobFair, 'participation_'.$validated['status'], $participation));
        }

        // A PESO staff member recording a phone/walk-in acceptance on the
        // employer's behalf needs the exact same auto-satisfaction the
        // employer's own "Accept Invitation" click triggers — otherwise this
        // second acceptance path leaves the requirement checklist just as
        // empty as the bug being fixed here.
        if ($validated['status'] === 'requirements_pending') {
            $service->processAcceptance($jobFair, $participation);
        }

        return response()->json(['message' => 'Participation status updated.', 'participation' => $service->participationPayload($participation->fresh(['requirementSubmissions.requirement']))]);
    }

    public function reviewRequirement(Request $request, JobFairRequirementSubmission $submission, JobFairService $service): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate(['status' => ['required', Rule::in(['approved', 'rejected'])], 'admin_remarks' => ['nullable', 'string', 'max:3000']]);
        if ($validated['status'] === 'rejected' && blank($validated['admin_remarks'] ?? null)) {
            return response()->json(['message' => 'A rejection remark is required.', 'errors' => ['admin_remarks' => ['Explain what must be corrected.']]], 422);
        }
        $submission->update([...$validated, 'reviewed_at' => now(), 'reviewed_by' => $admin->admin_id]);

        // Mirrors the employer-accreditation pattern (approve every document,
        // the account itself becomes verified with no separate step): an
        // admin who has already approved each individual requirement
        // shouldn't also have to remember to flip participation_status to
        // "approved" by hand — syncRequirementStatus() already does exactly
        // this check for the auto-satisfied/reused-document paths.
        if ($submission->participation) {
            $service->syncRequirementStatus($submission->participation);
        }

        return response()->json(['message' => 'Requirement review saved.', 'submission' => $submission->fresh()]);
    }

    public function viewRequirement(Request $request, JobFairRequirementSubmission $submission): StreamedResponse
    {
        $this->admin($request);
        // A requirement reused from employer accreditation lives on
        // whichever disk verification documents are configured for.
        $disk = $submission->employer_document_id
            ? (string) config('filesystems.employer_documents_disk', 'local')
            : 'local';
        abort_unless(filled($submission->document_path) && Storage::disk($disk)->exists($submission->document_path), 404);
        return Storage::disk($disk)->response($submission->document_path, $submission->original_filename, [
            'Content-Type' => $submission->mime_type, 'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    public function proxyResults(Request $request, JobFair $jobFair, JobFairReportService $reports): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate([
            'employer_id' => ['nullable', 'integer', 'exists:employers,employer_id'], 'company_name' => ['required', 'string', 'max:255'],
            'employer_type' => ['required', Rule::in(['registered_employer', 'walk_in_employer', 'out_of_town_employer', 'paper_only_employer'])],
            'contact_person' => ['nullable', 'string', 'max:255'], 'contact_number' => ['nullable', 'string', 'max:40'],
            'clearance_no' => ['nullable', 'string', 'max:100'],
            'total_male' => ['required', 'integer', 'min:0'], 'total_female' => ['required', 'integer', 'min:0'], 'total_applicants' => ['required', 'integer', 'min:0'],
            'total_qualified' => ['required', 'integer', 'min:0'],
            'total_hots' => ['required', 'integer', 'min:0'], 'total_near_hired' => ['required', 'integer', 'min:0'], 'total_rejected' => ['required', 'integer', 'min:0'],
            'total_vacancies_solicited' => ['required', 'integer', 'min:0'], 'total_vacancies_offered' => ['required', 'integer', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:5000'], 'mismatch_tallies' => ['nullable', 'array'],
            'mismatch_tallies.*.mismatch_code' => ['required', Rule::in([
                ...array_keys(JobFairReportService::EMPLOYER_MISMATCH_CODES),
                ...array_keys(JobFairReportService::SEEKER_MISMATCH_CODES),
                ...JobFairReportService::MISMATCH_CODES,
            ])], 'mismatch_tallies.*.count' => ['required', 'integer', 'min:0'],
            // Optional per-applicant register — same shape as employer self-service,
            // for admin staff transcribing a full paper RO1-JF Form 3 register.
            'entries' => ['nullable', 'array'], 'entries.*.applicant_name' => ['required_with:entries', 'string', 'max:255'],
            'entries.*.seeker_id' => ['nullable', 'integer', 'exists:job_seekers,seeker_id'],
            'entries.*.gender' => ['required_with:entries', Rule::in(['male', 'female'])],
            'entries.*.position_applied_for' => ['required_with:entries', 'string', 'max:255'],
            'entries.*.status' => ['required_with:entries', Rule::in(['qualified', 'near_hired', 'hots', 'employer_mismatch', 'seeker_mismatch'])],
            'entries.*.city_municipality' => ['nullable', 'string', 'max:255'],
            'entries.*.contact_number' => ['nullable', 'string', 'max:40'],
            'entries.*.age_group' => ['nullable', Rule::in(['A', 'B', 'C', 'D', 'E', 'F'])],
            'entries.*.highest_education' => ['nullable', 'string', 'max:40'],
            'entries.*.classification_codes' => ['nullable', 'array'],
            'entries.*.classification_codes.*' => [Rule::in(array_keys(JobFairReportService::CLASSIFICATION_CODES))],
            'entries.*.mismatch_code' => ['nullable', Rule::in([
                ...array_keys(JobFairReportService::EMPLOYER_MISMATCH_CODES),
                ...array_keys(JobFairReportService::SEEKER_MISMATCH_CODES),
                ...JobFairReportService::MISMATCH_CODES,
            ])],
            'entries.*.remarks' => ['nullable', 'string', 'max:2000'],
        ]);
        return response()->json(['message' => 'Admin proxy report saved.', 'result_report' => $reports->saveProxy($jobFair, $admin, $validated)], 201);
    }

    public function reviewResult(Request $request, \App\Models\JobFairResultReport $resultReport): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'admin_remarks' => ['required_if:status,rejected', 'nullable', 'string', 'max:2000'],
        ]);

        $resultReport->update([
            'status' => $validated['status'],
            'reviewed_by_admin_id' => $admin->admin_id,
            'review_remarks' => $validated['admin_remarks'],
        ]);

        return response()->json([
            'message' => 'Establishment report status updated.',
            'result_report' => $resultReport->fresh(['jobFair', 'employer', 'entries', 'mismatchTallies']),
        ]);
    }

    public function proxyConfirmation(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate([
            'employer_id' => ['nullable', 'integer', 'exists:employers,employer_id'], 'company_name' => ['required', 'string', 'max:255'],
            'representative_1_name' => ['required', 'string', 'max:255'], 'representative_1_contact' => ['required', 'string', 'max:40'],
            'representative_position' => ['required', 'string', 'max:255'],
            'representative_2_name' => ['nullable', 'string', 'max:255'], 'representative_2_contact' => ['nullable', 'string', 'max:40'],
            'vacancies' => ['nullable', 'array'],
            'vacancies.*.number_needed' => ['required_with:vacancies', 'integer', 'min:0'],
            'vacancies.*.position_title' => ['required_with:vacancies', 'string', 'max:255'],
            'vacancies.*.qualifications' => ['nullable', 'string', 'max:2000'],
            'vacancies.*.place_of_work' => ['nullable', 'string', 'max:255'],
            'vacancies.*.job_vacancy_id' => ['nullable', 'integer', 'exists:job_vacancies,post_id'],
        ]);
        if (($jobFair->maximum_representatives ?? 2) < 2 && filled($validated['representative_2_name'] ?? null)) {
            return response()->json(['message' => 'This event allows only one company representative.', 'errors' => ['representative_2_name' => ['Remove the second representative.']]], 422);
        }
        $dedupe = filled($validated['employer_id'] ?? null) ? 'employer:'.$validated['employer_id'] : 'company:'.$service->normalizedCompanyName($validated['company_name']);
        $vacancies = collect($validated['vacancies'] ?? []);

        $slip = DB::transaction(function () use ($jobFair, $dedupe, $validated, $vacancies, $admin) {
            $slip = JobFairConfirmationSlip::updateOrCreate(
                ['job_fair_id' => $jobFair->job_fair_id, 'dedupe_key' => $dedupe],
                [...collect($validated)->except('vacancies')->all(),
                    'number_of_job_vacancies' => (int) $vacancies->sum('number_needed'),
                    'source' => 'admin_proxy', 'submitted_by' => trim($admin->first_name.' '.$admin->last_name), 'submitted_at' => now()],
            );

            $slip->vacancies()->delete();
            foreach ($vacancies as $vacancy) {
                $slip->vacancies()->create($vacancy);
            }

            return $slip;
        });

        return response()->json(['message' => 'Admin proxy confirmation slip saved.', 'confirmation_slip' => $slip->fresh(['vacancies'])], 201);
    }

    public function reviewConfirmationSlip(Request $request, \App\Models\JobFairConfirmationSlip $confirmationSlip): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'admin_remarks' => ['required_if:status,rejected', 'nullable', 'string', 'max:2000'],
        ]);

        $confirmationSlip->update([
            'status' => $validated['status'],
            'reviewed_by_admin_id' => $admin->admin_id,
            'review_remarks' => $validated['admin_remarks'],
        ]);

        return response()->json([
            'message' => 'Confirmation slip status updated.',
            'confirmation_slip' => $confirmationSlip->fresh(['vacancies']),
        ]);
    }

    /**
     * "Smart typing" name suggestions for the applicant-name field on the
     * proxy-encoding register — powers autofill of the rest of that row.
     */
    public function applicantSuggestions(Request $request, JobFairReportService $reports): JsonResponse
    {
        $this->admin($request);
        $validated = $request->validate(['q' => ['nullable', 'string', 'max:255']]);

        return response()->json(['data' => $reports->suggestApplicants($validated['q'] ?? '')]);
    }

    public function downloadResult(Request $request, JobFairResultReport $resultReport, JobFairReportService $reports)
    {
        $this->admin($request);
        return $reports->download($resultReport);
    }

    public function downloadAttendancePdf(Request $request, JobFair $jobFair)
    {
        $this->admin($request);
        $rows = $this->attendanceRows($jobFair);

        return Pdf::loadView('pdf.job_fairs.attendance', ['fair' => $jobFair, 'rows' => $rows])
            ->setPaper('a4', 'landscape')
            ->download('job-fair-attendance-'.$jobFair->job_fair_id.'.pdf');
    }

    public function downloadAttendanceExcel(Request $request, JobFair $jobFair)
    {
        $this->admin($request);
        $rows = $this->attendanceRows($jobFair);

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, [
            'Time In', 'Name', 'Gender', 'Contact Number', 'Email', 'Job Preference',
            'Preferred Work Location', 'Language', 'Education Attainment',
            'School/College/University', 'Year Graduated/Last Attended', 'Course', 'Registration Type',
        ]);

        foreach ($rows as $row) {
            fputcsv($csv, [
                $row['time_in'], $row['name'], $row['gender'], $row['contact_number'], $row['email'],
                $row['job_preference'], $row['preferred_work_location'], $row['language'],
                $row['education_attainment'], $row['school'], $row['year_graduated'], $row['course'],
                $row['type'],
            ]);
        }
        rewind($csv);
        $content = stream_get_contents($csv);
        fclose($csv);

        return response($content)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="job-fair-attendance-'.$jobFair->job_fair_id.'.csv"');
    }

    /**
     * Shared row-builder for the attendance PDF and CSV — keeps the
     * seeker-vs-guest fallback logic (and the "best" education record pick)
     * in one place instead of duplicated per export format.
     *
     * @return array<int, array<string, string>>
     */
    private function attendanceRows(JobFair $jobFair): array
    {
        $attendees = JobFairAttendee::with(['seeker.educations', 'seeker.occupations', 'seeker.languages'])
            ->where('job_fair_id', $jobFair->job_fair_id)
            ->where('is_attended', true)
            ->orderBy('scanned_at', 'asc')
            ->get();

        return $attendees->map(function (JobFairAttendee $att) {
            $seeker = $att->seeker;
            $education = $seeker ? $this->bestEducation($seeker) : null;

            return [
                'time_in' => $att->scanned_at ? $att->scanned_at->setTimezone('Asia/Manila')->format('h:i A') : '-',
                'name' => $seeker ? trim($seeker->first_name.' '.$seeker->last_name) : $att->guest_name,
                'gender' => $seeker ? ucfirst($seeker->sex ?? 'Unknown') : 'Unknown',
                'contact_number' => $seeker ? $seeker->mobile_number : $att->guest_mobile_number,
                'email' => $seeker?->email ?? $att->guest_email ?? 'N/A',
                'job_preference' => $this->seekerJobPreference($seeker) ?? $att->guest_preferred_job ?? 'N/A',
                'preferred_work_location' => $this->seekerPreferredWorkLocation($seeker) ?? 'N/A',
                'language' => $this->seekerLanguages($seeker) ?? 'N/A',
                'education_attainment' => $seeker?->educ_attainment ?? $att->guest_educ_attainment ?? 'N/A',
                'school' => $education?->institution_name ?: 'N/A',
                'year_graduated' => $education?->year_graduated ?? $education?->undergrad_year_last_attended ?? 'N/A',
                'course' => $education?->course_strand ?: 'N/A',
                'type' => $seeker ? 'Registered' : 'Walk-in',
            ];
        })->all();
    }

    /**
     * The seeker's highest-ranked education record — same level ordering
     * JobMatchingService::seekerEducationRank uses for match scoring, refined
     * with a distinct rank per K-12 stage since this report needs to tell
     * junior high, senior high and vocational apart rather than bucket them.
     */
    private function bestEducation(JobSeeker $seeker): ?SeekerEducation
    {
        return $seeker->educations->sortByDesc(fn ($education) => match ($education->level) {
            'graduate_studies', 'graduate' => 6, // 'graduate' is the pre-rename legacy value
            'tertiary' => 5,
            'vocational', 'senior_high_strand', 'senior_high' => 4, // 'senior_high' is legacy
            'secondary_k12', 'secondary_non_k12', 'secondary' => 3, // 'secondary' is legacy
            'elementary' => 1,
            default => 0,
        })->first();
    }

    private function seekerJobPreference(?JobSeeker $seeker): ?string
    {
        if (! $seeker) {
            return null;
        }
        $top = $seeker->occupations->sortBy('preference_order')->first();

        return $top ? ($top->occupation_title ?: $top->raw_job_title) : null;
    }

    private function seekerPreferredWorkLocation(?JobSeeker $seeker): ?string
    {
        if (! $seeker) {
            return null;
        }
        $locations = collect($seeker->preferred_locations_details ?? [])->filter()->values();
        if ($locations->isEmpty()) {
            return null;
        }
        $sector = $seeker->preferred_work_location === 'overseas' ? 'Overseas' : 'Local';

        return $sector.': '.$locations->implode(', ');
    }

    private function seekerLanguages(?JobSeeker $seeker): ?string
    {
        if (! $seeker || $seeker->languages->isEmpty()) {
            return null;
        }

        return $seeker->languages
            ->map(fn ($lang) => $lang->language === 'others' ? ($lang->language_other ?: 'Others') : ucfirst($lang->language))
            ->filter()
            ->unique()
            ->implode(', ');
    }

    public function exportSprs(Request $request, JobFair $jobFair, JobFairReportService $reports)
    {
        $this->admin($request);
        return Pdf::loadView('pdf.job_fairs.sprs_1_6', ['fair' => $jobFair, 'summary' => $reports->sprs($jobFair)])
            ->setPaper('a4')->download('sprs-1-6-job-fair-'.$jobFair->job_fair_id.'.pdf');
    }

    public function invitation(Request $request, JobFair $jobFair)
    {
        $this->admin($request);
        $validated = $request->validate(['employer_id' => ['nullable', 'integer', 'exists:employers,employer_id'], 'recipient_name' => ['nullable', 'string', 'max:255']]);
        $employer = isset($validated['employer_id']) ? Employer::find($validated['employer_id']) : null;
        return Pdf::loadView('pdf.job_fairs.invitation', ['fair' => $jobFair, 'employer' => $employer, 'recipientName' => $validated['recipient_name'] ?? null])
            ->setPaper('a4')->download('job-fair-invitation-'.$jobFair->job_fair_id.'.pdf');
    }

    private function eventRules(bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';
        return [
            'title' => [$required, 'string', 'max:255'], 'description' => ['nullable', 'string'],
            // A new event can't start in the past; editing an existing
            // (possibly historical) record isn't held to that.
            'start_date' => $partial ? [$required, 'date'] : [$required, 'date', 'after_or_equal:today'],
            'end_date' => [$required, 'date', 'after_or_equal:start_date'],
            'venue' => [$required, 'string', 'max:500'],
            // Structured PSGC location, mirroring how job vacancy posting captures
            // its work address — same field names so the same map picker UI applies.
            'province' => [$required, 'string', 'max:100'], 'province_code' => ['nullable', 'string', 'max:20'],
            'city_municipality' => [$required, 'string', 'max:150'], 'city_code' => ['nullable', 'string', 'max:20'],
            'barangay' => [$required, 'string', 'max:150'], 'barangay_code' => ['nullable', 'string', 'max:20'],
            'specific_address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'], 'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'google_place_id' => ['nullable', 'string', 'max:255'],
            'target_sector' => ['nullable', 'string', 'max:255'], 'partner_agencies' => ['nullable', 'array'], 'partner_agencies.*' => ['string', 'max:255'],
            'start_time' => [$required, 'date_format:H:i'], 'end_time' => [$required, 'date_format:H:i'],
            // Requirements need to be in PESO's hands before the event, so the
            // deadline is required, can't already be in the past, and can't
            // land after the fair has already started.
            'submission_deadline' => $partial
                ? ['nullable', 'date']
                : [$required, 'date', 'after_or_equal:today', 'before_or_equal:start_date'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'maximum_representatives' => ['nullable', 'integer', 'min:1', 'max:10'],
            // No longer collected from the create/edit form — status changes
            // go through the dedicated publish/cancel actions instead.
            'status' => ['nullable', Rule::in(['draft', 'published', 'accepting_employers', 'closed', 'completed', 'cancelled', 'upcoming', 'ongoing'])],
        ];
    }

    /**
     * Fill in coordinates from the PSGC address when the admin didn't drop a
     * map pin, the same fallback EmployerJobVacancyController uses for job
     * postings. Only runs when a location field actually changed, so unrelated
     * edits (e.g. flipping status) never trigger a geocode lookup.
     */
    private function applyLocationFallback(array $validated, ?JobFair $existing, GoogleMapsService $maps): array
    {
        $locationFields = ['venue', 'province', 'city_municipality', 'barangay', 'specific_address'];
        if (! collect($locationFields)->contains(fn (string $field) => array_key_exists($field, $validated))) {
            return $validated;
        }

        if (isset($validated['latitude'], $validated['longitude'])) {
            return $validated;
        }

        $province = $validated['province'] ?? $existing?->province;
        $city = $validated['city_municipality'] ?? $existing?->city_municipality;
        if (! $province || ! $city) {
            return $validated;
        }

        $addressLine = collect([
            $validated['venue'] ?? $existing?->venue,
            $validated['specific_address'] ?? $existing?->specific_address,
            $validated['barangay'] ?? $existing?->barangay,
            $city,
            $province,
        ])->filter()->unique()->join(', ');

        try {
            $location = $maps->geocode($addressLine.', Philippines');
            if ($location) {
                $validated['latitude'] = $location['latitude'];
                $validated['longitude'] = $location['longitude'];
                $validated['google_place_id'] = $location['place_id'];
            }
        } catch (\Throwable) {
            // Preserve the job fair save when optional coordinate lookup is unavailable.
        }

        return $validated;
    }

    private function admin(Request $request): Administrator
    {
        abort_unless($request->user() instanceof Administrator, 403, 'Administrator account required.');
        return $request->user();
    }

}
