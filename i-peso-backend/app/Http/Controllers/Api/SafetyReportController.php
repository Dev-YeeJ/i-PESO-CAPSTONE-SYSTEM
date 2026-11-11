<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Models\SafetyReport;
use App\Services\Safety\SafetyReportService;
use App\Support\SafetyReportCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

/**
 * Report & Safety for the people filing reports — job seekers reporting
 * employers (/api/seeker/safety-reports) and employers reporting job seekers
 * (/api/employer/safety-reports). A reporter only ever sees their own cases,
 * and only the reporter-safe view of them.
 */
class SafetyReportController extends Controller
{
    public function __construct(private readonly SafetyReportService $reports) {}

    public function options(Request $request): JsonResponse
    {
        return response()->json(SafetyReportCatalog::formOptions($this->subjectTypeFor($this->reporter($request))));
    }

    public function index(Request $request): JsonResponse
    {
        $reporter = $this->reporter($request);

        $reports = SafetyReport::query()
            ->filedBy($reporter)
            ->with(['subjectEmployer', 'subjectSeeker', 'vacancy'])
            ->latest('id')
            ->paginate(max(1, min($request->integer('per_page', 20), 50)));

        $reports->through(fn (SafetyReport $report) => $this->reports->reporterView($report));

        return response()->json($reports);
    }

    public function show(Request $request, SafetyReport $safetyReport): JsonResponse
    {
        $this->authorizeOwner($request, $safetyReport);
        $safetyReport->load(['subjectEmployer', 'subjectSeeker', 'vacancy', 'attachments', 'events']);

        return response()->json(['report' => $this->reports->reporterView($safetyReport, detailed: true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $reporter = $this->reporter($request);
        $subjectType = $this->subjectTypeFor($reporter);

        $validated = $request->validate([
            'subject_id' => ['nullable', 'integer'],
            'post_id' => ['nullable', 'integer'],
            'application_id' => [$reporter instanceof Employer ? 'required' : 'nullable', 'integer'],
            'category' => ['required', Rule::in(array_keys(SafetyReportCatalog::categoriesFor($subjectType)))],
            'description' => ['required', 'string', 'min:30', 'max:3000'],
            'incident_date' => ['nullable', 'date', 'before_or_equal:today', 'after:2015-01-01'],
            'attachments' => ['nullable', 'array', 'max:'.config('safety_reports.max_attachments')],
            'attachments.*' => [$this->attachmentRule()],
            'acknowledge' => ['accepted'],
        ], [
            'application_id.required' => 'Open the report from the job seeker\'s application so PESO can see the context.',
            'description.min' => 'Please describe what happened in at least 30 characters — include dates and what was said or done.',
            'acknowledge.accepted' => 'Please confirm that your report is truthful.',
        ]);

        $report = $this->reports->file($reporter, [...$validated, 'subject_type' => $subjectType], $request->file('attachments', []));
        $report->load(['subjectEmployer', 'subjectSeeker', 'vacancy', 'attachments', 'events']);

        return response()->json([
            'message' => "Report received as case {$report->case_number}. An authorized PESO administrator will review it.",
            'report' => $this->reports->reporterView($report, detailed: true),
        ], 201);
    }

    /** Add more information or evidence to one's own open case. */
    public function addDetails(Request $request, SafetyReport $safetyReport): JsonResponse
    {
        $this->authorizeOwner($request, $safetyReport);

        $validated = $request->validate([
            'details' => ['nullable', 'string', 'min:10', 'max:3000'],
            'attachments' => ['nullable', 'array', 'max:'.config('safety_reports.max_attachments')],
            'attachments.*' => [$this->attachmentRule()],
        ]);

        $report = $this->reports->addReporterUpdate($safetyReport, $validated['details'] ?? null, $request->file('attachments', []));
        $report->load(['subjectEmployer', 'subjectSeeker', 'vacancy', 'attachments', 'events']);

        return response()->json([
            'message' => 'Your additional information was added to the case.',
            'report' => $this->reports->reporterView($report, detailed: true),
        ]);
    }

    /**
     * POST /api/seeker/employers/{employer}/report — the original endpoint,
     * kept so installed copies of the mobile app keep working. Old reason
     * codes are mapped onto the new categories.
     */
    public function legacyEmployerReport(Request $request, Employer $employer): JsonResponse
    {
        $seeker = $this->reporter($request);
        abort_unless($seeker instanceof JobSeeker, 403, 'Job seeker account required.');

        $legacy = [
            'fake_job' => 'fake_vacancy', 'misleading' => 'misleading_terms', 'abusive' => 'discrimination_harassment',
            'discrimination' => 'discrimination_harassment', 'illegal_fees' => 'illegal_fees', 'other' => 'other',
        ];

        $validated = $request->validate([
            'reason' => ['required', Rule::in(array_merge(array_keys($legacy), array_keys(SafetyReportCatalog::EMPLOYER_CATEGORIES)))],
            'description' => ['required', 'string', 'min:10', 'max:3000'],
            'post_id' => ['nullable', 'integer'],
        ]);

        $report = $this->reports->file($seeker, [
            'subject_type' => SafetyReportCatalog::SUBJECT_EMPLOYER,
            'subject_id' => $employer->employer_id,
            'post_id' => $validated['post_id'] ?? null,
            'category' => $legacy[$validated['reason']] ?? $validated['reason'],
            'description' => $validated['description'],
        ]);

        return response()->json([
            'message' => "Report submitted as case {$report->case_number}. Thank you for helping keep i-PESO safe.",
            'report' => [
                'id' => $report->id,
                'case_number' => $report->case_number,
                'reason' => $validated['reason'],
                'status' => $report->status,
                'created_at' => $report->created_at,
            ],
        ], 201);
    }

    private function attachmentRule(): File
    {
        return File::types(config('safety_reports.attachment_types'))->max((int) config('safety_reports.max_attachment_kb'));
    }

    private function reporter(Request $request): JobSeeker|Employer
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker || $user instanceof Employer, 403, 'A job seeker or employer account is required.');

        return $user;
    }

    private function subjectTypeFor(JobSeeker|Employer $reporter): string
    {
        return $reporter instanceof JobSeeker ? SafetyReportCatalog::SUBJECT_EMPLOYER : SafetyReportCatalog::SUBJECT_SEEKER;
    }

    private function authorizeOwner(Request $request, SafetyReport $report): void
    {
        $reporter = $this->reporter($request);
        $owns = $reporter instanceof Employer
            ? $report->reporter_type === SafetyReportCatalog::REPORTER_EMPLOYER && (int) $report->reporter_employer_id === (int) $reporter->employer_id
            : $report->reporter_type === SafetyReportCatalog::REPORTER_SEEKER && (int) $report->reporter_seeker_id === (int) $reporter->seeker_id;

        abort_unless($owns, 404);
    }
}
