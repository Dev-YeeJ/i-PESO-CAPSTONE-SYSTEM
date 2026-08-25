<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobFair;
use App\Models\JobFairConfirmationSlip;
use App\Models\JobFairEmployer;
use App\Models\JobFairRequirement;
use App\Models\JobFairRequirementSubmission;
use App\Models\JobFairResultReport;
use App\Notifications\JobFairNotification;
use App\Services\JobFairReportService;
use App\Services\JobFairService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployerJobFairController extends Controller
{
    public function index(Request $request, JobFairService $service): JsonResponse
    {
        $employer = $this->employer($request);
        $fairs = JobFair::query()
            ->where(fn ($query) => $query->where(fn ($public) => $public->where('is_public', true)->whereIn('status', JobFairService::PUBLIC_STATUSES))
                ->orWhereHas('employerJoins', fn ($joins) => $joins->where('employer_id', $employer->employer_id)))
            ->orderByRaw('COALESCE(start_date, event_date) asc')
            // Same relations eventPayload() requests via loadMissing() — see
            // the identical fix + explanation in JobFairController::index().
            ->with([
                'requirements' => fn ($query) => $query->orderBy('sort_order'),
                'employerJoins.employer:employer_id,company_name,trade_name',
                'vacancyLinks.vacancy:post_id,job_title,vacancies_count,status',
            ])
            ->get()
            ->map(fn (JobFair $fair) => $service->eventPayload($fair, $employer));

        return response()->json(['data' => $fairs]);
    }

    public function interest(Request $request, JobFair $jobFair): JsonResponse
    {
        $employer = $this->employer($request);
        abort_unless($jobFair->is_public && in_array($jobFair->status, ['published', 'accepting_employers', 'upcoming'], true), 422, 'This event is not accepting employer interest.');

        $participation = JobFairEmployer::updateOrCreate(
            ['job_fair_id' => $jobFair->job_fair_id, 'employer_id' => $employer->employer_id],
            ['participation_status' => 'interested', 'source' => 'employer_self_service', 'joined_at' => now(), 'responded_at' => now()],
        );
        Notification::send(Administrator::query()->where('status', 'active')->get(), new JobFairNotification($jobFair, 'interest_submitted', $participation));

        return response()->json(['message' => 'Interest recorded. PESO may also confirm your participation by phone or email.', 'participation' => $participation]);
    }

    public function respond(Request $request, JobFair $jobFair): JsonResponse
    {
        $employer = $this->employer($request);
        $validated = $request->validate(['response' => ['required', Rule::in(['accepted', 'declined'])], 'remarks' => ['nullable', 'string', 'max:2000']]);
        $participation = $this->participation($jobFair, $employer);
        $participation->update([
            'participation_status' => $validated['response'],
            'responded_at' => now(),
            'remarks' => $validated['remarks'] ?? $participation->remarks,
        ]);

        return response()->json(['message' => 'Invitation response saved.', 'participation' => $participation->fresh()]);
    }

    public function uploadRequirement(Request $request, JobFair $jobFair, JobFairRequirement $requirement): JsonResponse
    {
        $employer = $this->employer($request);
        abort_unless($requirement->job_fair_id === $jobFair->job_fair_id, 404);
        $participation = $this->participation($jobFair, $employer);
        $validated = $request->validate(['document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120']]);
        $file = $validated['document'];
        $path = $file->store("job_fair_requirements/{$jobFair->job_fair_id}/{$employer->employer_id}", 'local');
        $oldPath = null;

        try {
            $submission = DB::transaction(function () use ($requirement, $participation, $employer, $file, $path, &$oldPath) {
                $existing = JobFairRequirementSubmission::query()
                    ->where('job_fair_requirement_id', $requirement->id)
                    ->where('job_fair_employer_id', $participation->id)->first();
                $oldPath = $existing?->document_path;

                return JobFairRequirementSubmission::updateOrCreate(
                    ['job_fair_requirement_id' => $requirement->id, 'job_fair_employer_id' => $participation->id],
                    [
                        'employer_id' => $employer->employer_id, 'document_path' => $path,
                        'original_filename' => $file->getClientOriginalName(), 'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(), 'status' => 'submitted', 'admin_remarks' => null,
                        'submitted_at' => now(), 'reviewed_at' => null, 'reviewed_by' => null,
                    ],
                );
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        if ($oldPath && $oldPath !== $path) Storage::disk('local')->delete($oldPath);
        $this->syncRequirementStatus($participation);
        Notification::send(Administrator::query()->where('status', 'active')->get(), new JobFairNotification($jobFair, 'requirements_submitted', $participation));

        return response()->json(['message' => 'Requirement submitted for PESO review.', 'submission' => [
            'id' => $submission->id, 'job_fair_requirement_id' => $submission->job_fair_requirement_id,
            'status' => $submission->status, 'original_filename' => $submission->original_filename,
            'submitted_at' => $submission->submitted_at?->toIso8601String(),
        ]]);
    }

    public function viewRequirement(Request $request, JobFairRequirementSubmission $submission): StreamedResponse
    {
        $employer = $this->employer($request);
        abort_unless($submission->employer_id === $employer->employer_id && filled($submission->document_path), 403);

        // A requirement reused from employer accreditation lives on
        // whichever disk verification documents are configured for, which
        // may differ from the 'local' disk direct Job Fair uploads use.
        $disk = $submission->employer_document_id
            ? (string) config('filesystems.employer_documents_disk', 'local')
            : 'local';

        abort_unless(Storage::disk($disk)->exists($submission->document_path), 404);

        return Storage::disk($disk)->response($submission->document_path, $submission->original_filename, [
            'Content-Type' => $submission->mime_type,
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    public function confirmation(Request $request, JobFair $jobFair): JsonResponse
    {
        $employer = $this->employer($request);
        $participation = $this->participation($jobFair, $employer);
        $validated = $request->validate([
            'representative_1_name' => ['required', 'string', 'max:255'], 'representative_1_contact' => ['required', 'string', 'max:40'],
            'representative_2_name' => ['nullable', 'string', 'max:255'], 'representative_2_contact' => ['nullable', 'string', 'max:40'],
            'email' => ['required', 'email', 'max:255'], 'number_of_job_vacancies' => ['required', 'integer', 'min:0'],
            'will_conduct_onsite_interview' => ['required', 'boolean'], 'logistics_requests' => ['nullable', 'string', 'max:3000'],
        ]);
        if (($jobFair->maximum_representatives ?? 2) < 2 && filled($validated['representative_2_name'] ?? null)) {
            return response()->json(['message' => 'This event allows only one company representative.', 'errors' => ['representative_2_name' => ['Remove the second representative.']]], 422);
        }

        $slip = JobFairConfirmationSlip::updateOrCreate(
            ['job_fair_id' => $jobFair->job_fair_id, 'dedupe_key' => 'employer:'.$employer->employer_id],
            [...$validated, 'job_fair_employer_id' => $participation->id, 'employer_id' => $employer->employer_id,
                'company_name' => $employer->company_name ?: $employer->trade_name ?: $employer->email,
                'source' => 'employer_self_service', 'submitted_by' => $employer->email, 'submitted_at' => now()],
        );

        $confirmationRequirement = $jobFair->requirements()->where('code', 'confirmation_slip')->first();
        if ($confirmationRequirement) {
            JobFairRequirementSubmission::updateOrCreate(
                ['job_fair_requirement_id' => $confirmationRequirement->id, 'job_fair_employer_id' => $participation->id],
                ['employer_id' => $employer->employer_id, 'status' => 'submitted', 'original_filename' => 'Digital confirmation slip', 'submitted_at' => now()],
            );
            $this->syncRequirementStatus($participation);
        }

        return response()->json(['message' => 'Confirmation slip submitted.', 'confirmation_slip' => $slip]);
    }

    public function results(Request $request, JobFair $jobFair, JobFairReportService $reports): JsonResponse
    {
        $employer = $this->employer($request);
        $validated = $request->validate($this->resultRules(true));
        $report = $reports->saveEmployer($jobFair, $employer, $validated);
        Notification::send(Administrator::query()->where('status', 'active')->get(), new JobFairNotification($jobFair, 'results_submitted', $report->participation));

        return response()->json(['message' => 'Post-event results saved.', 'result_report' => $report]);
    }

    public function downloadReport(Request $request, JobFairResultReport $resultReport, JobFairReportService $reports)
    {
        $employer = $this->employer($request);
        abort_unless($resultReport->employer_id === $employer->employer_id && $resultReport->source === 'employer_self_service', 403);
        return $reports->download($resultReport);
    }

    private function resultRules(bool $entries): array
    {
        $rules = [
            'office_location' => ['nullable', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'], 'contact_number' => ['nullable', 'string', 'max:40'],
            'total_male' => ['required', 'integer', 'min:0'], 'total_female' => ['required', 'integer', 'min:0'],
            'total_applicants' => ['required', 'integer', 'min:0'], 'total_hots' => ['required', 'integer', 'min:0'],
            'total_near_hired' => ['required', 'integer', 'min:0'], 'total_rejected' => ['required', 'integer', 'min:0'],
            'total_vacancies_solicited' => ['required', 'integer', 'min:0'], 'total_vacancies_offered' => ['required', 'integer', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:5000'],
        ];
        if ($entries) $rules += [
            'entries' => ['required', 'array'], 'entries.*.applicant_name' => ['required', 'string', 'max:255'],
            'entries.*.gender' => ['required', Rule::in(['male', 'female'])], 'entries.*.position_applied_for' => ['required', 'string', 'max:255'],
            'entries.*.status' => ['required', Rule::in(['hots', 'near_hired', 'rejected'])],
            // RO1-JF Form 3 per-applicant DOLE columns (optional so short-form entries still submit).
            'entries.*.city_municipality' => ['nullable', 'string', 'max:255'],
            'entries.*.contact_number' => ['nullable', 'string', 'max:40'],
            'entries.*.age_group' => ['nullable', Rule::in(['A', 'B', 'C', 'D', 'E', 'F'])],
            'entries.*.highest_education' => ['nullable', 'string', 'max:40'],
            'entries.*.mismatch_code' => ['nullable', Rule::in(JobFairReportService::MISMATCH_CODES)], 'entries.*.remarks' => ['nullable', 'string', 'max:2000'],
        ];
        return $rules;
    }

    private function participation(JobFair $fair, Employer $employer): JobFairEmployer
    {
        return JobFairEmployer::query()->where('job_fair_id', $fair->job_fair_id)->where('employer_id', $employer->employer_id)->firstOrFail();
    }

    private function employer(Request $request): Employer
    {
        abort_unless($request->user() instanceof Employer, 403, 'Employer account required.');
        return $request->user();
    }

    private function syncRequirementStatus(JobFairEmployer $participation): void
    {
        $required = $participation->jobFair->requirements()->where('is_required', true)->count();
        $submitted = $participation->requirementSubmissions()->whereIn('status', ['submitted', 'approved'])->count();
        $participation->update(['participation_status' => $submitted >= $required ? 'requirements_submitted' : 'requirements_pending']);
    }
}
