<?php

namespace App\Http\Controllers\Api\Admin\GovernmentDole;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobFair;
use App\Models\JobFairEmployer;
use App\Models\JobFairConfirmationSlip;
use App\Models\JobFairRequirementSubmission;
use App\Models\JobFairResultReport;
use App\Notifications\JobFairNotification;
use App\Services\GoogleMapsService;
use App\Services\JobFairReportService;
use App\Services\JobFairService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $query = JobFair::query();
        if ($filters['search'] ?? null) $query->where('title', 'like', '%'.$filters['search'].'%');
        if ($filters['status'] ?? null) $query->where('status', $filters['status']);
        $fairs = $query->orderByRaw('COALESCE(start_date, event_date) desc')->paginate($filters['per_page'] ?? 15);
        $fairs->getCollection()->transform(fn (JobFair $fair) => $service->eventPayload($fair, null, true));
        return response()->json($fairs);
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
            'employerJoins.confirmationSlip', 'employerJoins.resultReport', 'resultReports.mismatchTallies',
        ])->findOrFail($id);
        $payload = $service->eventPayload($fair, null, true);
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
        abort_if($fair->employerJoins()->exists() || $fair->resultReports()->exists(), 422, 'A job fair with participation or report records cannot be deleted. Cancel it instead.');
        $fair->delete();
        return response()->json(['message' => 'Unused draft Job Fair deleted.']);
    }

    public function publish(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate(['status' => ['nullable', Rule::in(['published', 'accepting_employers'])]]);
        $service->seedRequirements($jobFair);

        // Only the first publish fires the invitation blast — re-publishing
        // after a later status change must not re-email every employer.
        $isFirstPublish = $jobFair->published_at === null;

        $jobFair->update(['status' => $validated['status'] ?? 'published', 'is_public' => true, 'published_at' => now(), 'published_by' => $admin->admin_id]);

        $invited = 0;
        if ($isFirstPublish) {
            $invited = $this->broadcastInvitations($jobFair, $service);
        }

        return response()->json([
            'message' => $isFirstPublish
                ? "Job Fair announcement published. {$invited} verified employer(s) notified by email."
                : 'Job Fair announcement published.',
            'job_fair' => $service->eventPayload($jobFair->fresh(), null, true),
        ]);
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
        $employer->notify(new JobFairNotification($jobFair, 'invited', $participation, $service->outstandingRequirementsFor($jobFair, $employer)));
        return response()->json(['message' => 'Employer invited.', 'participation' => $participation], 201);
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
                    $employer->notify(new JobFairNotification($jobFair, 'invited', $participation, $service->outstandingRequirementsFor($jobFair, $employer)));
                    $invited++;
                }
            }, 'employer_id');

        return $invited;
    }

    public function participationStatus(Request $request, JobFair $jobFair, JobFairEmployer $participation): JsonResponse
    {
        $admin = $this->admin($request);
        abort_unless($participation->job_fair_id === $jobFair->job_fair_id, 404);
        $validated = $request->validate([
            'status' => ['required', Rule::in(JobFairService::PARTICIPATION_STATUSES)],
            'remarks' => ['nullable', 'string', 'max:3000'], 'confirmation_channel' => ['nullable', Rule::in(['digital', 'phone', 'email', 'walk_in'])],
        ]);
        $timestamps = match ($validated['status']) {
            'accepted', 'declined' => ['responded_at' => now()], 'under_review', 'approved', 'rejected' => ['reviewed_at' => now(), 'reviewed_by' => $admin->admin_id],
            'attended' => ['attended_at' => now()], 'no_show' => ['no_show_at' => now()], default => [],
        };
        if ($validated['status'] === 'approved') $timestamps['approved_at'] = now();
        $participation->update([...$timestamps, 'participation_status' => $validated['status'], 'remarks' => $validated['remarks'] ?? $participation->remarks,
            'confirmation_channel' => $validated['confirmation_channel'] ?? $participation->confirmation_channel]);
        if (in_array($validated['status'], ['approved', 'rejected'], true)) {
            $participation->employer->notify(new JobFairNotification($jobFair, 'participation_'.$validated['status'], $participation));
        }
        return response()->json(['message' => 'Participation status updated.', 'participation' => $participation->fresh()]);
    }

    public function reviewRequirement(Request $request, JobFairRequirementSubmission $submission): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate(['status' => ['required', Rule::in(['approved', 'rejected'])], 'admin_remarks' => ['nullable', 'string', 'max:3000']]);
        if ($validated['status'] === 'rejected' && blank($validated['admin_remarks'] ?? null)) {
            return response()->json(['message' => 'A rejection remark is required.', 'errors' => ['admin_remarks' => ['Explain what must be corrected.']]], 422);
        }
        $submission->update([...$validated, 'reviewed_at' => now(), 'reviewed_by' => $admin->admin_id]);
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
            'total_male' => ['required', 'integer', 'min:0'], 'total_female' => ['required', 'integer', 'min:0'], 'total_applicants' => ['required', 'integer', 'min:0'],
            'total_hots' => ['required', 'integer', 'min:0'], 'total_near_hired' => ['required', 'integer', 'min:0'], 'total_rejected' => ['required', 'integer', 'min:0'],
            'total_vacancies_solicited' => ['required', 'integer', 'min:0'], 'total_vacancies_offered' => ['required', 'integer', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:5000'], 'mismatch_tallies' => ['nullable', 'array'],
            'mismatch_tallies.*.mismatch_code' => ['required', Rule::in(JobFairReportService::MISMATCH_CODES)], 'mismatch_tallies.*.count' => ['required', 'integer', 'min:0'],
        ]);
        return response()->json(['message' => 'Admin proxy report saved.', 'result_report' => $reports->saveProxy($jobFair, $admin, $validated)], 201);
    }

    public function proxyConfirmation(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $admin = $this->admin($request);
        $validated = $request->validate([
            'employer_id' => ['nullable', 'integer', 'exists:employers,employer_id'], 'company_name' => ['required', 'string', 'max:255'],
            'representative_1_name' => ['required', 'string', 'max:255'], 'representative_1_contact' => ['required', 'string', 'max:40'],
            'representative_2_name' => ['nullable', 'string', 'max:255'], 'representative_2_contact' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'], 'number_of_job_vacancies' => ['required', 'integer', 'min:0'],
            'will_conduct_onsite_interview' => ['required', 'boolean'], 'logistics_requests' => ['nullable', 'string', 'max:3000'],
        ]);
        if (($jobFair->maximum_representatives ?? 2) < 2 && filled($validated['representative_2_name'] ?? null)) {
            return response()->json(['message' => 'This event allows only one company representative.', 'errors' => ['representative_2_name' => ['Remove the second representative.']]], 422);
        }
        $dedupe = filled($validated['employer_id'] ?? null) ? 'employer:'.$validated['employer_id'] : 'company:'.$service->normalizedCompanyName($validated['company_name']);
        $slip = JobFairConfirmationSlip::updateOrCreate(
            ['job_fair_id' => $jobFair->job_fair_id, 'dedupe_key' => $dedupe],
            [...$validated, 'source' => 'admin_proxy', 'submitted_by' => trim($admin->first_name.' '.$admin->last_name), 'submitted_at' => now()],
        );
        return response()->json(['message' => 'Admin proxy confirmation slip saved.', 'confirmation_slip' => $slip], 201);
    }

    public function downloadResult(Request $request, JobFairResultReport $resultReport, JobFairReportService $reports)
    {
        $this->admin($request);
        return $reports->download($resultReport);
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
            'venue' => [$required, 'string', 'max:500'], 'sector' => [$required, Rule::in(['local', 'overseas', 'both'])],
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
