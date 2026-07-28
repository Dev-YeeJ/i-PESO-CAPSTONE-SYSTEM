<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\PlacementRecord;
use App\Models\PlacementReportUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminPlacementReportController extends Controller
{
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

        return response()->json([
            'data' => $this->summary($placementReport),
            'records' => $placementReport->records()
                ->orderBy('id')
                ->get()
                ->map(fn (PlacementRecord $record) => collect($record->only(array_keys(PlacementRecord::MAPPABLE_FIELDS)))
                    ->merge(['id' => $record->id, 'linked_seeker_id' => $record->seeker_id])
                    ->all()),
        ]);
    }

    public function approve(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $admin = $this->admin($request);
        $this->assertPending($placementReport);

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
            fputcsv($handle, array_map(fn ($f) => PlacementRecord::MAPPABLE_FIELDS[$f], $fields));

            $placementReport->records()->orderBy('id')->chunk(200, function ($records) use ($handle, $fields) {
                foreach ($records as $record) {
                    fputcsv($handle, array_map(fn ($f) => (string) ($record->{$f} ?? ''), $fields));
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
            'row_count' => $upload->row_count,
            'record_count' => $upload->records_count ?? $upload->records()->count(),
            'coverage_month' => $upload->coverage_month,
            'coverage_year' => $upload->coverage_year,
            'employer_remarks' => $upload->employer_remarks,
            'review_remarks' => $upload->review_remarks,
            'submitted_at' => $upload->submitted_at,
            'reviewed_at' => $upload->reviewed_at,
        ];
    }

    private function assertPending(PlacementReportUpload $upload): void
    {
        if ($upload->status !== PlacementReportUpload::STATUS_PENDING_REVIEW) {
            throw ValidationException::withMessages([
                'status' => ['Only reports pending review can be approved or rejected.'],
            ]);
        }
    }

    private function assertSubmitted(PlacementReportUpload $upload): void
    {
        abort_if($upload->status === PlacementReportUpload::STATUS_PENDING_MAPPING, 404);
    }

    private function admin(Request $request): Administrator
    {
        abort_unless($request->user() instanceof Administrator, 403, 'Administrator account required.');

        return $request->user();
    }
}
