<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Models\PlacementRecord;
use App\Models\PlacementReportUpload;
use App\Services\PlacementComplianceService;
use App\Services\PlacementImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminPlacementReportController extends Controller
{
    public function __construct(
        private readonly PlacementComplianceService $compliance,
        private readonly PlacementImportService $imports,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->admin($request);

        $validated = $request->validate([
            'status' => ['nullable', Rule::in([
                PlacementReportUpload::STATUS_PENDING_REVIEW,
                PlacementReportUpload::STATUS_APPROVED,
                PlacementReportUpload::STATUS_REJECTED,
            ])],
            'employer_id' => ['nullable', 'integer'],
            'coverage_month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'coverage_year' => ['nullable', 'integer', 'min:2020', 'max:2100'],
        ]);

        $uploads = PlacementReportUpload::query()
            ->with('employer:employer_id,company_name,trade_name')
            ->withCount('records')
            // PESO admin only sees reports that employers have actually submitted.
            ->whereIn('status', [
                PlacementReportUpload::STATUS_PENDING_REVIEW,
                PlacementReportUpload::STATUS_APPROVED,
                PlacementReportUpload::STATUS_REJECTED,
            ])
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['employer_id'] ?? null, fn ($query, $id) => $query->where('employer_id', $id))
            ->when($validated['coverage_month'] ?? null, fn ($query, $m) => $query->where('coverage_month', $m))
            ->when($validated['coverage_year'] ?? null, fn ($query, $y) => $query->where('coverage_year', $y))
            ->latest('submitted_at')
            ->paginate($request->integer('per_page', 15));

        $uploads->through(fn (PlacementReportUpload $upload) => $this->summary($upload));

        return response()->json($uploads);
    }

    /**
     * Which employers still owe a report for a coverage period.
     *
     * This is the part PESO does by phone today: knowing who has reported,
     * who declared no hires, and who has gone quiet past the deadline.
     */
    public function compliance(Request $request): JsonResponse
    {
        $this->admin($request);

        $default = $this->compliance->latestOverduePeriod();

        $validated = $request->validate([
            'coverage_month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'coverage_year' => ['nullable', 'integer', 'min:2020', 'max:2100'],
        ]);

        $month = $validated['coverage_month'] ?? $default['month'];
        $year = $validated['coverage_year'] ?? $default['year'];

        $rows = $this->compliance->statusFor($year, $month);

        return response()->json([
            'coverage_month' => $month,
            'coverage_year' => $year,
            'due_date' => $this->compliance->dueDate($year, $month)->toDateString(),
            'deadline_day' => (int) config('placement_reports.deadline_day', 10),
            'totals' => [
                'expected' => $rows->count(),
                'submitted' => $rows->whereIn('state', [
                    PlacementReportUpload::STATUS_PENDING_REVIEW,
                    PlacementReportUpload::STATUS_APPROVED,
                ])->count(),
                'nil_reports' => $rows->where('is_nil_report', true)->count(),
                'needs_revision' => $rows->where('state', 'needs_revision')->count(),
                'overdue' => $rows->where('state', 'overdue')->count(),
                'not_yet_due' => $rows->where('state', 'not_submitted')->count(),
            ],
            'data' => $rows->values(),
        ]);
    }

    public function show(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $this->admin($request);
        $this->assertSubmitted($placementReport);

        $placementReport->load('employer:employer_id,company_name,trade_name');

        $records = $placementReport->records()->orderBy('id')->get();

        $seekers = JobSeeker::query()
            ->whereIn('seeker_id', $records->pluck('seeker_id')->filter()->unique())
            ->get(['seeker_id', 'first_name', 'middle_name', 'last_name'])
            ->keyBy('seeker_id');

        return response()->json([
            'data' => $this->summary($placementReport),
            'match_summary' => [
                'linked' => $records->whereNotNull('seeker_id')->count(),
                'ambiguous' => $records->where('seeker_match_confidence', PlacementRecord::MATCH_AMBIGUOUS)->count(),
                'unmatched' => $records->where('seeker_match_confidence', PlacementRecord::MATCH_NONE)->count(),
                'confirmed' => $records->whereNotNull('seeker_match_confirmed_at')->count(),
            ],
            'records' => $records->map(fn (PlacementRecord $record) => collect($record->only(array_keys(PlacementRecord::MAPPABLE_FIELDS)))
                ->merge([
                    'id' => $record->id,
                    'linked_seeker_id' => $record->seeker_id,
                    'linked_seeker_name' => $this->seekerName($seekers->get($record->seeker_id)),
                    'seeker_match_confidence' => $record->seeker_match_confidence,
                    'seeker_match_confirmed_at' => $record->seeker_match_confirmed_at,
                ])
                ->all()),
        ]);
    }

    /**
     * Candidate registered seekers for one reported row, so an admin can settle
     * an ambiguous name match rather than the importer guessing at it.
     */
    public function recordCandidates(Request $request, PlacementReportUpload $placementReport, PlacementRecord $record): JsonResponse
    {
        $this->admin($request);
        $this->assertSubmitted($placementReport);
        $this->assertRecordBelongs($placementReport, $record);

        $candidates = $this->imports->seekerCandidates($record->first_name, $record->last_name);

        return response()->json([
            'data' => $candidates->map(fn (JobSeeker $seeker) => [
                'seeker_id' => $seeker->seeker_id,
                'name' => $this->seekerName($seeker),
                'date_of_birth' => optional($seeker->date_of_birth)->toDateString(),
            ])->values(),
        ]);
    }

    /**
     * Confirm, correct, or clear the seeker a reported hire is linked to.
     */
    public function linkRecord(Request $request, PlacementReportUpload $placementReport, PlacementRecord $record): JsonResponse
    {
        $admin = $this->admin($request);
        $this->assertSubmitted($placementReport);
        $this->assertRecordBelongs($placementReport, $record);

        $validated = $request->validate([
            'seeker_id' => ['present', 'nullable', 'integer', 'exists:job_seekers,seeker_id'],
        ]);

        $seekerId = $validated['seeker_id'] ?? null;

        $record->update([
            'seeker_id' => $seekerId,
            // An admin decision is the strongest signal available, including a
            // deliberate "this is nobody we have on file".
            'seeker_match_confidence' => $seekerId ? PlacementRecord::MATCH_EXACT : PlacementRecord::MATCH_NONE,
            'seeker_match_confirmed_by' => $admin->admin_id,
            'seeker_match_confirmed_at' => now(),
        ]);

        return response()->json([
            'message' => $seekerId ? 'Placement linked to the selected job seeker.' : 'Link cleared for this row.',
            'data' => [
                'id' => $record->id,
                'linked_seeker_id' => $record->seeker_id,
                'linked_seeker_name' => $seekerId ? $this->seekerName(JobSeeker::find($seekerId)) : null,
                'seeker_match_confidence' => $record->seeker_match_confidence,
                'seeker_match_confirmed_at' => $record->seeker_match_confirmed_at,
            ],
        ]);
    }

    public function approve(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $admin = $this->admin($request);
        $this->assertPending($placementReport);
        $this->assertNoApprovedTwin($placementReport);

        $validated = $request->validate(['review_remarks' => ['nullable', 'string', 'max:1000']]);

        $placementReport->update([
            'status' => PlacementReportUpload::STATUS_APPROVED,
            'reviewed_by_admin_id' => $admin->admin_id,
            'review_remarks' => $validated['review_remarks'] ?? null,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Placement report approved. Its records now feed the SPRS placement totals.',
            'data' => $this->summary($placementReport->fresh()->loadCount('records')),
        ]);
    }

    public function reject(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $admin = $this->admin($request);
        $this->assertPending($placementReport);

        $validated = $request->validate(['review_remarks' => ['required', 'string', 'max:1000']]);

        $placementReport->update([
            'status' => PlacementReportUpload::STATUS_REJECTED,
            'reviewed_by_admin_id' => $admin->admin_id,
            'review_remarks' => $validated['review_remarks'],
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Placement report rejected. The employer can revise and resubmit.',
            'data' => $this->summary($placementReport->fresh()->loadCount('records')),
        ]);
    }

    public function exportCsv(Request $request, PlacementReportUpload $placementReport): StreamedResponse
    {
        $this->admin($request);
        $this->assertSubmitted($placementReport);

        $fields = array_keys(PlacementRecord::MAPPABLE_FIELDS);
        $filename = 'placement-report-'.$placementReport->id.'-'.now()->format('Ymd').'.csv';

        return response()->streamDownload(function () use ($placementReport, $fields) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, array_merge(
                array_map(fn ($f) => PlacementRecord::MAPPABLE_FIELDS[$f], $fields),
                ['Linked Seeker ID', 'Match Confidence'],
            ));

            $placementReport->records()->orderBy('id')->chunk(200, function ($records) use ($handle, $fields) {
                foreach ($records as $record) {
                    fputcsv($handle, array_merge(
                        array_map(fn ($f) => (string) ($record->{$f} ?? ''), $fields),
                        [(string) ($record->seeker_id ?? ''), (string) ($record->seeker_match_confidence ?? '')],
                    ));
                }
            });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private function summary(PlacementReportUpload $upload): array
    {
        return [
            'id' => $upload->id,
            'employer_id' => $upload->employer_id,
            'company_name' => $upload->employer?->company_name ?: $upload->employer?->trade_name,
            'original_filename' => $upload->original_filename,
            'status' => $upload->status,
            'is_nil_report' => (bool) $upload->is_nil_report,
            'row_count' => $upload->row_count,
            'record_count' => $upload->records_count ?? $upload->records()->count(),
            'coverage_month' => $upload->coverage_month,
            'coverage_year' => $upload->coverage_year,
            'selected_sheet' => $upload->selected_sheet,
            'employer_remarks' => $upload->employer_remarks,
            'review_remarks' => $upload->review_remarks,
            'submitted_at' => $upload->submitted_at,
            'reviewed_at' => $upload->reviewed_at,
        ];
    }

    private function seekerName(?JobSeeker $seeker): ?string
    {
        if (! $seeker) {
            return null;
        }

        return collect([$seeker->first_name, $seeker->middle_name, $seeker->last_name])
            ->filter()
            ->join(' ');
    }

    private function assertPending(PlacementReportUpload $upload): void
    {
        if ($upload->status !== PlacementReportUpload::STATUS_PENDING_REVIEW) {
            throw ValidationException::withMessages([
                'status' => ['Only reports pending review can be approved or rejected.'],
            ]);
        }
    }

    /**
     * Refuse to approve a second report for a period this employer already has
     * approved. Both would contribute rows to the same SPRS month, inflating
     * the placement figure PESO submits to DOLE.
     */
    private function assertNoApprovedTwin(PlacementReportUpload $upload): void
    {
        if (! $upload->coverage_month || ! $upload->coverage_year) {
            return;
        }

        $twin = PlacementReportUpload::query()
            ->where('employer_id', $upload->employer_id)
            ->where('coverage_month', $upload->coverage_month)
            ->where('coverage_year', $upload->coverage_year)
            ->where('status', PlacementReportUpload::STATUS_APPROVED)
            ->whereKeyNot($upload->id)
            ->first();

        if ($twin) {
            $period = Carbon::create($upload->coverage_year, $upload->coverage_month, 1)->format('F Y');

            throw ValidationException::withMessages([
                'status' => ["Report #{$twin->id} for {$period} is already approved for this employer. Approving this one too would double-count those placements — reject it instead."],
            ]);
        }
    }

    private function assertSubmitted(PlacementReportUpload $upload): void
    {
        abort_if($upload->status === PlacementReportUpload::STATUS_PENDING_MAPPING, 404);
    }

    private function assertRecordBelongs(PlacementReportUpload $upload, PlacementRecord $record): void
    {
        abort_unless($record->upload_id === $upload->id, 404);
    }

    private function admin(Request $request): Administrator
    {
        abort_unless($request->user() instanceof Administrator, 403, 'Administrator account required.');

        return $request->user();
    }
}
