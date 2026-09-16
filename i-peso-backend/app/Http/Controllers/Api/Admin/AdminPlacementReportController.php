<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Models\PlacementRecord;
use App\Models\PlacementReportUpload;
use App\Services\PlacementComplianceService;
use App\Services\PlacementImportService;
use Illuminate\Database\UniqueConstraintViolationException;
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
            'records' => $records->map(fn (PlacementRecord $record) => collect($record->only(array_keys(PlacementRecord::MAPPABLE_FIELDS)))
                ->merge([
                    'id' => $record->id,
                ])
                ->all()),
        ]);
    }



    public function approve(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $admin = $this->admin($request);
        $this->assertPending($placementReport);
        $this->assertNoApprovedTwin($placementReport);

        $validated = $request->validate(['review_remarks' => ['nullable', 'string', 'max:1000']]);

        // assertNoApprovedTwin() above is a plain check-then-act: two
        // concurrent approvals for the same employer+period can each pass it
        // before either has written. The unique index on the DB side is the
        // actual race-proof backstop; this converts that DB-level rejection
        // into the same kind of friendly error the check above already
        // throws for the ordinary (non-concurrent) case.
        try {
            $placementReport->update([
                'status' => PlacementReportUpload::STATUS_APPROVED,
                'reviewed_by_admin_id' => $admin->admin_id,
                'review_remarks' => $validated['review_remarks'] ?? null,
                'reviewed_at' => now(),
            ]);
        } catch (UniqueConstraintViolationException $e) {
            if (! str_contains($e->getMessage(), 'settlement_key')) {
                throw $e;
            }

            throw ValidationException::withMessages([
                'status' => ['Another approval for this employer and period was recorded at the same moment. Refresh and check which report is now approved before retrying.'],
            ]);
        }

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
            fputcsv($handle, array_map(fn ($f) => PlacementRecord::MAPPABLE_FIELDS[$f], $fields));

            $placementReport->records()->orderBy('id')->chunk(200, function ($records) use ($handle, $fields) {
                foreach ($records as $record) {
                    fputcsv($handle, array_map(fn ($f) => (string) ($record->{$f} ?? ''), $fields));
                }
            });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function exportPdf(Request $request, PlacementReportUpload $placementReport)
    {
        $this->admin($request);
        $this->assertSubmitted($placementReport);

        $placementReport->load('employer:employer_id,company_name,trade_name');
        $records = $placementReport->records()->orderBy('id')->get();

        $html = '<style>body { font-family: sans-serif; font-size: 10px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 4px; text-align: left; }</style>';
        $html .= '<h2>Placement Report</h2>';
        $html .= '<p><strong>Employer:</strong> ' . e($placementReport->employer?->company_name ?: $placementReport->employer?->trade_name) . '</p>';
        $html .= '<p><strong>Coverage:</strong> ' . $placementReport->coverage_year . '-' . str_pad($placementReport->coverage_month, 2, '0', STR_PAD_LEFT) . '</p>';
        $html .= '<table><thead><tr>';
        foreach (PlacementRecord::MAPPABLE_FIELDS as $label) {
            $html .= '<th>' . e($label) . '</th>';
        }
        $html .= '</tr></thead><tbody>';
        foreach ($records as $record) {
            $html .= '<tr>';
            foreach (array_keys(PlacementRecord::MAPPABLE_FIELDS) as $field) {
                $html .= '<td>' . e($record->{$field} ?? '') . '</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</tbody></table>';

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)->setPaper('a4', 'landscape');
        return $pdf->download('placement-report-'.$placementReport->id.'-'.now()->format('Ymd').'.pdf');
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
            'is_manual_entry' => $upload->stored_path === null && ! $upload->is_nil_report,
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

    public function compliance(Request $request): JsonResponse
    {
        $this->admin($request);
        $validated = $request->validate([
            'coverage_month' => ['required', 'integer', 'min:1', 'max:12'],
            'coverage_year' => ['required', 'integer', 'min:2020', 'max:2100'],
        ]);

        $statuses = $this->compliance->statusFor($validated['coverage_year'], $validated['coverage_month']);

        return response()->json([
            'due_date' => $this->compliance->dueDate($validated['coverage_year'], $validated['coverage_month'])->toDateString(),
            'totals' => [
                'expected' => $statuses->count(),
                'submitted' => $statuses->whereIn('state', [PlacementReportUpload::STATUS_PENDING_REVIEW, PlacementReportUpload::STATUS_APPROVED])->count(),
                'nil_reports' => $statuses->where('is_nil_report', true)->count(),
                'overdue' => $statuses->where('state', 'overdue')->count(),
                'needs_revision' => $statuses->where('state', 'needs_revision')->count(),
            ],
            'data' => $statuses->values(),
        ]);
    }

    public function candidates(Request $request, PlacementReportUpload $placementReport, PlacementRecord $record): JsonResponse
    {
        $this->admin($request);
        $this->assertSubmitted($placementReport);
        abort_unless($record->upload_id === $placementReport->id, 404);

        $query = JobSeeker::query();
        if ($record->first_name) {
            $query->where('first_name', 'like', "%{$record->first_name}%");
        }
        if ($record->last_name) {
            $query->where('last_name', 'like', "%{$record->last_name}%");
        }

        $candidates = $query->limit(10)->get(['seeker_id', 'first_name', 'middle_name', 'last_name']);

        $mapped = $candidates->map(fn($seeker) => [
            'seeker_id' => $seeker->seeker_id,
            'name' => trim("{$seeker->first_name} {$seeker->middle_name} {$seeker->last_name}")
        ]);

        return response()->json(['data' => $mapped]);
    }

    public function linkRecord(Request $request, PlacementReportUpload $placementReport, PlacementRecord $record): JsonResponse
    {
        $this->admin($request);
        $this->assertSubmitted($placementReport);
        abort_unless($record->upload_id === $placementReport->id, 404);

        $validated = $request->validate([
            'seeker_id' => ['nullable', 'integer', 'exists:job_seekers,seeker_id']
        ]);

        $record->update([
            'seeker_id' => $validated['seeker_id'],
            'seeker_match_confirmed_at' => $validated['seeker_id'] ? now() : null,
            'seeker_match_confidence' => $validated['seeker_id'] ? PlacementRecord::MATCH_EXACT : PlacementRecord::MATCH_NONE,
        ]);

        return response()->json([
            'message' => 'Seeker link updated.', 
            'data' => [
                'linked_seeker_id' => $record->seeker_id,
                'seeker_match_confidence' => $record->seeker_match_confidence
            ]
        ]);
    }
}
