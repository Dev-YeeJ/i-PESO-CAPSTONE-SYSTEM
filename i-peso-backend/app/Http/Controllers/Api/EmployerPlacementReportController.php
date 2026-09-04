<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\PlacementRecord;
use App\Models\PlacementReportMapping;
use App\Models\PlacementReportUpload;
use App\Services\PlacementImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class EmployerPlacementReportController extends Controller
{
    public function __construct(
        private readonly PlacementImportService $imports,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $employer = $this->employer($request);

        $uploads = PlacementReportUpload::query()
            ->where('employer_id', $employer->employer_id)
            ->withCount('records')
            ->latest()
            ->get()
            ->map(fn (PlacementReportUpload $upload) => $this->summary($upload));

        return response()->json([
            'data' => $uploads,
            'deadline_day' => (int) config('placement_reports.deadline_day', 10),
        ]);
    }

    /**
     * Step 1 — upload a spreadsheet, detect its columns, and return a suggested mapping.
     * Nothing is finalized here; the employer must map + preview + submit afterwards.
     */
    public function store(Request $request): JsonResponse
    {
        $employer = $this->employer($request);

        $validated = $request->validate([
            // `txt` is included alongside `csv` because Laravel's `mimes` rule
            // sniffs actual file content, and CSVs frequently sniff as
            // text/plain rather than text/csv — without it, legitimate CSV
            // uploads get rejected. This also replaces the old check, which
            // trusted the client-supplied filename extension rather than the
            // file's real content type.
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:5120'],
            // Coverage is required rather than optional: compliance tracking and
            // the duplicate guard both key off the period a report covers.
            'coverage_month' => ['required', 'integer', 'min:1', 'max:12'],
            'coverage_year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'sheet' => ['nullable', 'string', 'max:255'],
        ]);

        $this->assertCoverageNotInFuture($validated['coverage_month'], $validated['coverage_year']);
        $this->assertNoSettledReportFor($employer, $validated['coverage_month'], $validated['coverage_year']);

        $file = $request->file('file');
        $storedPath = $file->store("placement_reports/{$employer->employer_id}", 'local');
        $absolutePath = Storage::disk('local')->path($storedPath);

        try {
            $sheetNames = $this->imports->listSheets($absolutePath);
            $selectedSheet = $this->imports->resolveSheet($sheetNames, $validated['sheet'] ?? null, $validated['coverage_month']);
            $parsed = $this->imports->parse($absolutePath, $selectedSheet);
        } catch (Throwable) {
            Storage::disk('local')->delete($storedPath);
            throw ValidationException::withMessages([
                'file' => ['This file could not be read. Make sure it is a valid Excel or CSV spreadsheet.'],
            ]);
        }

        if ($parsed['headers'] === []) {
            Storage::disk('local')->delete($storedPath);
            throw ValidationException::withMessages([
                'file' => [$sheetNames !== [] && count($sheetNames) > 1
                    ? "No column headers were found in the \"{$selectedSheet}\" sheet. Pick a different sheet and try again."
                    : 'No column headers were found in this file.'],
            ]);
        }

        $upload = PlacementReportUpload::create([
            'employer_id' => $employer->employer_id,
            'original_filename' => $file->getClientOriginalName(),
            'stored_path' => $storedPath,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'detected_headers' => $parsed['headers'],
            'sample_rows' => array_slice($parsed['rows'], 0, 5),
            'sheet_names' => $sheetNames,
            'selected_sheet' => $selectedSheet,
            'row_count' => $parsed['row_count'],
            'status' => PlacementReportUpload::STATUS_PENDING_MAPPING,
            'coverage_month' => $validated['coverage_month'],
            'coverage_year' => $validated['coverage_year'],
        ]);

        $this->rememberSuggestedMapping($upload, $employer, $parsed['headers']);

        return response()->json([
            'message' => count($sheetNames) > 1
                ? "File uploaded. Reading the \"{$selectedSheet}\" sheet — switch sheets below if that is not the right month."
                : 'File uploaded. Review the column mapping before submitting.',
            'data' => $this->detail($upload->fresh(['mappings'])),
        ], 201);
    }

    /**
     * Declare that no one was hired in a coverage period.
     *
     * Without this, PESO cannot tell "hired nobody" apart from "never
     * submitted", which is exactly what the compliance view needs to know.
     */
    public function storeNil(Request $request): JsonResponse
    {
        $employer = $this->employer($request);

        $validated = $request->validate([
            'coverage_month' => ['required', 'integer', 'min:1', 'max:12'],
            'coverage_year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'employer_remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->assertCoverageNotInFuture($validated['coverage_month'], $validated['coverage_year']);
        $this->assertNoSettledReportFor($employer, $validated['coverage_month'], $validated['coverage_year']);

        $upload = PlacementReportUpload::create([
            'employer_id' => $employer->employer_id,
            'original_filename' => 'No hires declared',
            'stored_path' => null,
            'row_count' => 0,
            'status' => PlacementReportUpload::STATUS_PENDING_REVIEW,
            'is_nil_report' => true,
            'coverage_month' => $validated['coverage_month'],
            'coverage_year' => $validated['coverage_year'],
            'employer_remarks' => $validated['employer_remarks'] ?? null,
            'submitted_at' => now(),
        ]);

        return response()->json([
            'message' => 'Recorded: no hires to report for this period.',
            'data' => $this->summary($upload->fresh()->loadCount('records')),
        ], 201);
    }

    public function show(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $this->authorizeOwner($request, $placementReport);

        return response()->json(['data' => $this->detail($placementReport->load('mappings'))]);
    }

    /**
     * Switch which worksheet the report is built from.
     *
     * Employers routinely keep one workbook with a tab per month, so the wrong
     * tab landing in a submission is the likeliest data error in this flow.
     */
    public function selectSheet(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $this->authorizeOwner($request, $placementReport);
        $this->assertEditable($placementReport);

        $validated = $request->validate(['sheet' => ['required', 'string', 'max:255']]);

        if ($placementReport->stored_path === null) {
            throw ValidationException::withMessages(['sheet' => ['This report has no spreadsheet attached.']]);
        }

        $sheetNames = $placementReport->sheet_names ?? [];
        if (! in_array($validated['sheet'], $sheetNames, true)) {
            throw ValidationException::withMessages(['sheet' => ['That sheet is not part of this workbook.']]);
        }

        $absolutePath = Storage::disk('local')->path($placementReport->stored_path);

        try {
            $parsed = $this->imports->parse($absolutePath, $validated['sheet']);
        } catch (Throwable) {
            throw ValidationException::withMessages(['sheet' => ['That sheet could not be read.']]);
        }

        if ($parsed['headers'] === []) {
            throw ValidationException::withMessages([
                'sheet' => ["No column headers were found in the \"{$validated['sheet']}\" sheet."],
            ]);
        }

        $placementReport->update([
            'selected_sheet' => $validated['sheet'],
            'detected_headers' => $parsed['headers'],
            'sample_rows' => array_slice($parsed['rows'], 0, 5),
            'row_count' => $parsed['row_count'],
        ]);

        // Columns differ between sheets, so the old mapping no longer applies.
        $placementReport->records()->delete();
        $placementReport->mappings()->delete();
        $this->rememberSuggestedMapping($placementReport, $this->employer($request), $parsed['headers']);

        return response()->json([
            'message' => "Now reading the \"{$validated['sheet']}\" sheet ({$parsed['row_count']} row(s)). Review the column mapping.",
            'data' => $this->detail($placementReport->fresh(['mappings'])),
        ]);
    }

    /**
     * Step 2 — persist the confirmed mapping, rebuild normalized records, and
     * return a preview. Stays in pending_mapping so the employer can keep editing.
     */
    public function preview(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $this->authorizeOwner($request, $placementReport);
        $this->assertEditable($placementReport);

        $mapping = $this->validateMapping($request, $placementReport);
        $this->persistMapping($placementReport, $mapping);

        $created = $this->imports->buildRecords($placementReport, $mapping);

        return response()->json([
            'message' => "Mapping saved. {$created} placement record(s) ready for review.",
            'data' => $this->detail($placementReport->fresh(['mappings'])),
            'records' => $this->recordPreview($placementReport),
        ]);
    }

    /**
     * Step 3 — submit the mapped + previewed upload for PESO admin review.
     */
    public function submit(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $employer = $this->employer($request);
        $this->authorizeOwner($request, $placementReport);
        $this->assertEditable($placementReport);

        $request->validate(['employer_remarks' => ['nullable', 'string', 'max:1000']]);

        if (! $placementReport->coverage_month || ! $placementReport->coverage_year) {
            throw ValidationException::withMessages([
                'coverage_month' => ['Set the coverage month and year before submitting this report.'],
            ]);
        }

        $this->assertNoSettledReportFor(
            $employer,
            $placementReport->coverage_month,
            $placementReport->coverage_year,
            $placementReport->id,
        );

        $mapping = $placementReport->mappings->pluck('target_field', 'source_column')->filter()->all();
        $this->assertRequiredMapped($mapping);

        // Rebuild once more so submitted records always reflect the saved mapping.
        $created = $this->imports->buildRecords($placementReport, $placementReport->mappings->pluck('target_field', 'source_column')->all());
        if ($created === 0) {
            throw ValidationException::withMessages([
                'records' => ['No valid placement records were produced from this file. Check your column mapping.'],
            ]);
        }

        $placementReport->update([
            'status' => PlacementReportUpload::STATUS_PENDING_REVIEW,
            'employer_remarks' => $request->input('employer_remarks'),
            'submitted_at' => now(),
        ]);

        return response()->json([
            'message' => 'Placement report submitted to PESO for review.',
            'data' => $this->summary($placementReport->fresh()->loadCount('records')),
        ]);
    }

    public function destroy(Request $request, PlacementReportUpload $placementReport): JsonResponse
    {
        $this->authorizeOwner($request, $placementReport);

        if ($placementReport->status === PlacementReportUpload::STATUS_APPROVED) {
            throw ValidationException::withMessages([
                'status' => ['Approved reports can no longer be deleted.'],
            ]);
        }

        if ($placementReport->stored_path !== null) {
            Storage::disk('local')->delete($placementReport->stored_path);
        }
        $placementReport->delete();

        return response()->json(['message' => 'Placement report deleted.']);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Reject a second report for a period the employer has already settled.
     *
     * Two approved reports covering the same month would each contribute their
     * rows to the SPRS placement totals, silently inflating the figure PESO
     * submits to DOLE. A rejected report is not settled — resubmission is the
     * whole point of rejecting one.
     */
    private function assertNoSettledReportFor(Employer $employer, int $month, int $year, ?int $exceptUploadId = null): void
    {
        $existing = PlacementReportUpload::query()
            ->where('employer_id', $employer->employer_id)
            ->where('coverage_month', $month)
            ->where('coverage_year', $year)
            ->whereIn('status', [PlacementReportUpload::STATUS_PENDING_REVIEW, PlacementReportUpload::STATUS_APPROVED])
            ->when($exceptUploadId, fn ($query, $id) => $query->whereKeyNot($id))
            ->first();

        if (! $existing) {
            return;
        }

        $period = Carbon::create($year, $month, 1)->format('F Y');
        $state = $existing->status === PlacementReportUpload::STATUS_APPROVED ? 'already approved' : 'awaiting PESO review';

        throw ValidationException::withMessages([
            'coverage_month' => ["You already have a report for {$period} that is {$state}. Delete or wait for that one instead of sending a second."],
        ]);
    }

    private function assertCoverageNotInFuture(int $month, int $year): void
    {
        if (Carbon::create($year, $month, 1)->startOfMonth()->greaterThan(Carbon::now()->startOfMonth())) {
            throw ValidationException::withMessages([
                'coverage_month' => ['A placement report cannot cover a month that has not started yet.'],
            ]);
        }
    }

    /** Store the auto-suggested mapping rows for a freshly detected header set. */
    private function rememberSuggestedMapping(PlacementReportUpload $upload, Employer $employer, array $headers): void
    {
        foreach ($this->suggestedMapping($employer, $headers) as $sourceColumn => $targetField) {
            $upload->mappings()->create(['source_column' => $sourceColumn, 'target_field' => $targetField]);
        }
    }

    private function suggestedMapping(Employer $employer, array $headers): array
    {
        $suggested = $this->imports->suggestMapping($headers);

        // Prefer the employer's previously confirmed mapping for identical columns.
        $remembered = PlacementReportMapping::query()
            ->whereHas('upload', fn ($query) => $query->where('employer_id', $employer->employer_id))
            ->whereIn('source_column', $headers)
            ->latest('id')
            ->get()
            ->unique('source_column')
            ->pluck('target_field', 'source_column');

        foreach ($headers as $header) {
            if ($remembered->has($header) && filled($remembered->get($header))) {
                $suggested[$header] = $remembered->get($header);
            }
        }

        return $suggested;
    }

    private function validateMapping(Request $request, PlacementReportUpload $upload): array
    {
        $validated = $request->validate([
            'mapping' => ['required', 'array', 'min:1'],
            'mapping.*' => ['nullable', 'string'],
        ]);

        $allowedColumns = collect($upload->detected_headers ?? []);
        $allowedFields = array_keys(PlacementRecord::MAPPABLE_FIELDS);
        $mapping = [];

        foreach ($validated['mapping'] as $sourceColumn => $targetField) {
            if (! $allowedColumns->contains($sourceColumn)) {
                continue;
            }
            $mapping[$sourceColumn] = ($targetField && in_array($targetField, $allowedFields, true)) ? $targetField : null;
        }

        $mapped = collect($mapping)->filter();
        if ($mapped->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages([
                'mapping' => ['Each standard field can be mapped to only one column.'],
            ]);
        }

        return $mapping;
    }

    private function persistMapping(PlacementReportUpload $upload, array $mapping): void
    {
        DB::transaction(function () use ($upload, $mapping) {
            $upload->mappings()->delete();
            foreach ($mapping as $sourceColumn => $targetField) {
                $upload->mappings()->create(['source_column' => $sourceColumn, 'target_field' => $targetField]);
            }
        });
    }

    private function assertRequiredMapped(array $mapping): void
    {
        $mappedFields = array_values($mapping);
        $missing = array_diff(PlacementRecord::REQUIRED_FIELDS, $mappedFields);

        if ($missing !== []) {
            $labels = collect($missing)->map(fn ($field) => PlacementRecord::MAPPABLE_FIELDS[$field] ?? $field)->join(', ');
            throw ValidationException::withMessages([
                'mapping' => ["Map these required fields before submitting: {$labels}."],
            ]);
        }
    }

    private function assertEditable(PlacementReportUpload $upload): void
    {
        if (! in_array($upload->status, [PlacementReportUpload::STATUS_PENDING_MAPPING, PlacementReportUpload::STATUS_REJECTED], true)) {
            throw ValidationException::withMessages([
                'status' => ['This report has already been submitted and can no longer be edited.'],
            ]);
        }
    }

    private function summary(PlacementReportUpload $upload): array
    {
        return [
            'id' => $upload->id,
            'original_filename' => $upload->original_filename,
            'status' => $upload->status,
            'is_nil_report' => (bool) $upload->is_nil_report,
            'row_count' => $upload->row_count,
            'record_count' => $upload->records_count ?? $upload->records()->count(),
            'coverage_month' => $upload->coverage_month,
            'coverage_year' => $upload->coverage_year,
            'sheet_names' => $upload->sheet_names ?? [],
            'selected_sheet' => $upload->selected_sheet,
            'employer_remarks' => $upload->employer_remarks,
            'review_remarks' => $upload->review_remarks,
            'submitted_at' => $upload->submitted_at,
            'reviewed_at' => $upload->reviewed_at,
            'created_at' => $upload->created_at,
        ];
    }

    private function detail(PlacementReportUpload $upload): array
    {
        return array_merge($this->summary($upload), [
            'detected_headers' => $upload->detected_headers ?? [],
            'sample_rows' => $upload->sample_rows ?? [],
            'mapping' => $upload->mappings->pluck('target_field', 'source_column'),
            'mappable_fields' => PlacementRecord::MAPPABLE_FIELDS,
            'required_fields' => PlacementRecord::REQUIRED_FIELDS,
        ]);
    }

    private function recordPreview(PlacementReportUpload $upload): array
    {
        return $upload->records()
            ->orderBy('id')
            ->limit(10)
            ->get()
            ->map(fn (PlacementRecord $record) => collect($record->only(array_keys(PlacementRecord::MAPPABLE_FIELDS)))
                ->merge([
                    'id' => $record->id,
                    'linked_seeker_id' => $record->seeker_id,
                    'seeker_match_confidence' => $record->seeker_match_confidence,
                ])
                ->all())
            ->all();
    }

    private function employer(Request $request): Employer
    {
        abort_unless($request->user() instanceof Employer, 403, 'Employer account required.');

        return $request->user();
    }

    private function authorizeOwner(Request $request, PlacementReportUpload $upload): void
    {
        $employer = $this->employer($request);
        abort_unless($upload->employer_id === $employer->employer_id, 404);
    }
}
