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
            ->where(fn ($query) => $query->where(fn ($public) => $public->where('is_public', true)->whereIn('status', JobFairService::PUBLIC_STATUSES)->has('employerJoins'))
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

    public function interest(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $employer = $this->employer($request);
        abort_unless($jobFair->is_public && in_array($jobFair->status, ['published', 'accepting_employers', 'upcoming'], true), 422, 'This event is not accepting employer interest.');

        $participation = JobFairEmployer::updateOrCreate(
            ['job_fair_id' => $jobFair->job_fair_id, 'employer_id' => $employer->employer_id],
            ['participation_status' => 'interested', 'source' => 'employer_self_service', 'joined_at' => now(), 'responded_at' => now()],
        );
        // Standing accreditation documents already satisfy some requirements
        // regardless of where they are in this fair's own pipeline — no
        // reason to make them wait until formally accepted to see that.
        $service->reuseVerifiedDocuments($jobFair, $participation);
        Notification::send(Administrator::query()->where('status', 'active')->get(), new JobFairNotification($jobFair, 'interest_submitted', $participation));

        return response()->json(['message' => 'Interest recorded. PESO may also confirm your participation by phone or email.', 'participation' => $service->participationPayload($participation->fresh(['requirementSubmissions.requirement']))]);
    }

    public function respond(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $employer = $this->employer($request);
        $validated = $request->validate(['response' => ['required', Rule::in(['accepted', 'declined'])], 'remarks' => ['nullable', 'string', 'max:2000']]);
        $participation = $this->participation($jobFair, $employer);
        $participation->update([
            'participation_status' => $validated['response'],
            'responded_at' => now(),
            'remarks' => $validated['remarks'] ?? $participation->remarks,
        ]);

        if ($validated['response'] === 'accepted') {
            $service->processAcceptance($jobFair, $participation);
        }

        $participation = $participation->fresh(['requirementSubmissions.requirement']);

        return response()->json(['message' => 'Invitation response saved.', 'participation' => $service->participationPayload($participation)]);
    }

    public function uploadRequirement(Request $request, JobFair $jobFair, JobFairRequirement $requirement, JobFairService $service): JsonResponse
    {
        $employer = $this->employer($request);
        abort_unless($requirement->job_fair_id === $jobFair->job_fair_id, 404);
        $participation = $this->participation($jobFair, $employer);

        // Posterized Job Vacancy accepts any file type/extension at all --
        // no mimes/extensions restriction — since employers export flyers
        // from a wide range of tools and formats kept tripping up an
        // allowlist. Safe to leave unrestricted: this disk ('local') isn't
        // web-accessible, files are only ever served back through the
        // authenticated view/download endpoints below, never executed.
        // Every other requirement stays document-only (pdf/jpg/jpeg/png).
        $isGallery = $requirement->code === 'posterized_vacancy';
        $fileRules = $isGallery
            ? ['file', 'max:10240']
            : ['file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'];

        $validated = $request->validate([
            'document' => array_merge(['nullable'], $fileRules),
            'documents' => ['nullable', 'array', 'max:5'],
            'documents.*' => $fileRules,
        ]);

        $files = $validated['documents'] ?? ($validated['document'] ? [$validated['document']] : []);
        abort_unless(count($files) > 0, 422, 'Please upload at least one document.');

        // A new upload for the gallery requirement adds to what's already
        // there (rejected copies aside) instead of wiping it out, up to 5
        // photos total. Every other requirement is a single canonical
        // document, so a re-upload still fully replaces it.
        $paths = [];
        try {
            $submissions = DB::transaction(function () use ($requirement, $participation, $employer, $files, $jobFair, $isGallery, &$paths) {
                $existing = JobFairRequirementSubmission::query()
                    ->where('job_fair_requirement_id', $requirement->id)
                    ->where('job_fair_employer_id', $participation->id)->get();

                $toDelete = $isGallery ? $existing->where('status', 'rejected') : $existing;
                foreach ($toDelete as $ex) {
                    if ($ex->document_path) Storage::disk('local')->delete($ex->document_path);
                    $ex->delete();
                }

                if ($isGallery) {
                    $kept = $existing->count() - $toDelete->count();
                    abort_if($kept + count($files) > 5, 422, 'You can have up to 5 photos for this requirement.');
                }

                $subs = [];
                foreach($files as $file) {
                    $path = $file->store("job_fair_requirements/{$jobFair->job_fair_id}/{$employer->employer_id}", 'local');
                    $paths[] = $path;
                    $subs[] = JobFairRequirementSubmission::create([
                        'job_fair_requirement_id' => $requirement->id, 
                        'job_fair_employer_id' => $participation->id,
                        'employer_id' => $employer->employer_id, 'document_path' => $path,
                        'original_filename' => $file->getClientOriginalName(), 'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(), 'status' => 'submitted', 'admin_remarks' => null,
                        'submitted_at' => now(), 'reviewed_at' => null, 'reviewed_by' => null,
                    ]);
                }
                return collect($subs);
            });
        } catch (\Throwable $exception) {
            foreach($paths as $p) Storage::disk('local')->delete($p);
            throw $exception;
        }

        $service->syncRequirementStatus($participation);
        Notification::send(Administrator::query()->where('status', 'active')->get(), new JobFairNotification($jobFair, 'requirements_submitted', $participation));

        return response()->json(['message' => 'Requirement submitted for PESO review.', 'submission' => [
            'id' => $submissions->first()->id, 'job_fair_requirement_id' => $submissions->first()->job_fair_requirement_id,
            'status' => $submissions->first()->status, 'original_filename' => count($submissions) > 1 ? count($submissions) . ' files uploaded' : $submissions->first()->original_filename,
            'submitted_at' => $submissions->first()->submitted_at?->toIso8601String(),
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

    public function confirmation(Request $request, JobFair $jobFair, JobFairService $service): JsonResponse
    {
        $employer = $this->employer($request);
        $participation = $this->participation($jobFair, $employer);
        $validated = $request->validate([
            'representative_1_name' => ['required', 'string', 'max:255'], 'representative_1_contact' => ['required', 'string', 'max:40'],
            'representative_position' => ['required', 'string', 'max:255'],
            'representative_2_name' => ['nullable', 'string', 'max:255'], 'representative_2_contact' => ['nullable', 'string', 'max:40'],
            ...$this->vacancyListRules(),
        ]);
        if (($jobFair->maximum_representatives ?? 2) < 2 && filled($validated['representative_2_name'] ?? null)) {
            return response()->json(['message' => 'This event allows only one company representative.', 'errors' => ['representative_2_name' => ['Remove the second representative.']]], 422);
        }

        $vacancies = collect($validated['vacancies'] ?? []);

        $slip = DB::transaction(function () use ($jobFair, $employer, $participation, $validated, $vacancies) {
            $slip = JobFairConfirmationSlip::updateOrCreate(
                ['job_fair_id' => $jobFair->job_fair_id, 'dedupe_key' => 'employer:'.$employer->employer_id],
                [...collect($validated)->except('vacancies')->all(),
                    // Derived from the list itself rather than trusted as a
                    // separately-submitted number, so it can never drift from
                    // what the list actually says.
                    'number_of_job_vacancies' => (int) $vacancies->sum('number_needed'),
                    'job_fair_employer_id' => $participation->id, 'employer_id' => $employer->employer_id,
                    'company_name' => $employer->company_name ?: $employer->trade_name ?: $employer->email,
                    'source' => 'employer_self_service', 'submitted_by' => $employer->email, 'submitted_at' => now()],
            );

            $slip->vacancies()->delete();
            foreach ($vacancies as $vacancy) {
                $slip->vacancies()->create($vacancy);
            }

            return $slip;
        });

        $confirmationRequirement = $jobFair->requirements()->where('code', 'confirmation_slip')->first();
        if ($confirmationRequirement) {
            JobFairRequirementSubmission::updateOrCreate(
                ['job_fair_requirement_id' => $confirmationRequirement->id, 'job_fair_employer_id' => $participation->id],
                ['employer_id' => $employer->employer_id, 'status' => 'submitted', 'original_filename' => 'Digital confirmation slip', 'submitted_at' => now()],
            );
            $service->syncRequirementStatus($participation);
        }

        return response()->json(['message' => 'Confirmation slip submitted.', 'confirmation_slip' => $slip->fresh(['vacancies'])]);
    }

    /**
     * Validation for the "LIST OF VACANCIES/ORDERS" table on the paper
     * Confirmation Slip — shared by the employer self-service and admin
     * proxy submission, since both now capture the same structured list
     * instead of a single number_of_job_vacancies count.
     */
    private function vacancyListRules(): array
    {
        return [
            'vacancies' => ['nullable', 'array'],
            'vacancies.*.number_needed' => ['required_with:vacancies', 'integer', 'min:0'],
            'vacancies.*.position_title' => ['required_with:vacancies', 'string', 'max:255'],
            'vacancies.*.qualifications' => ['nullable', 'string', 'max:2000'],
            'vacancies.*.place_of_work' => ['nullable', 'string', 'max:255'],
            'vacancies.*.job_vacancy_id' => ['nullable', 'integer', 'exists:job_vacancies,post_id'],
        ];
    }

    public function results(Request $request, JobFair $jobFair, JobFairReportService $reports): JsonResponse
    {
        $employer = $this->employer($request);
        $validated = $request->validate($this->resultRules(true));
        // Office location and who to contact are already on file from
        // employer registration — no need to make them retype it here.
        $validated['office_location'] = $employer->full_address ?: $employer->complete_address;
        $validated['contact_person'] = $employer->representative_name ?: null;
        $validated['contact_number'] = $employer->representative_contact_number ?: null;
        $report = $reports->saveEmployer($jobFair, $employer, $validated);
        Notification::send(Administrator::query()->where('status', 'active')->get(), new JobFairNotification($jobFair, 'results_submitted', $report->participation));

        return response()->json(['message' => 'Establishment Report saved.', 'result_report' => $report]);
    }

    public function downloadReport(Request $request, JobFairResultReport $resultReport, JobFairReportService $reports)
    {
        $employer = $this->employer($request);
        abort_unless($resultReport->employer_id === $employer->employer_id && $resultReport->source === 'employer_self_service', 403);
        return $reports->download($resultReport);
    }

    /**
     * "Smart typing" name suggestions for the applicant-name field on the
     * results register — powers autofill of the rest of that row.
     */
    public function applicantSuggestions(Request $request, JobFairReportService $reports): JsonResponse
    {
        $this->employer($request);
        $validated = $request->validate(['q' => ['nullable', 'string', 'max:255']]);

        return response()->json(['data' => $reports->suggestApplicants($validated['q'] ?? '')]);
    }

    private function resultRules(bool $entries): array
    {
        $rules = [
            'clearance_no' => ['nullable', 'string', 'max:100'],
            'total_male' => ['required', 'integer', 'min:0'], 'total_female' => ['required', 'integer', 'min:0'],
            'total_applicants' => ['required', 'integer', 'min:0'], 'total_qualified' => ['required', 'integer', 'min:0'],
            'total_hots' => ['required', 'integer', 'min:0'],
            'total_near_hired' => ['required', 'integer', 'min:0'], 'total_rejected' => ['required', 'integer', 'min:0'],
            'total_vacancies_solicited' => ['required', 'integer', 'min:0'], 'total_vacancies_offered' => ['required', 'integer', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:5000'],
        ];
        if ($entries) $rules += [
            'entries' => ['required', 'array'], 'entries.*.applicant_name' => ['required', 'string', 'max:255'],
            'entries.*.seeker_id' => ['nullable', 'integer', 'exists:job_seekers,seeker_id'],
            'entries.*.gender' => ['required', Rule::in(['male', 'female'])], 'entries.*.position_applied_for' => ['required', 'string', 'max:255'],
            'entries.*.status' => ['required', Rule::in(['qualified', 'near_hired', 'hots', 'employer_mismatch', 'seeker_mismatch'])],
            // RO1-JF Form 3 per-applicant DOLE columns (optional so short-form entries still submit).
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

}
