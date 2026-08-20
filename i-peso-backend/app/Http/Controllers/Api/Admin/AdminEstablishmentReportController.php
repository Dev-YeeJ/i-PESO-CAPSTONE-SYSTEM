<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\EstablishmentReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminEstablishmentReportController extends Controller
{
    public function preview(Request $request, EstablishmentReportService $reports): JsonResponse
    {
        return response()->json($reports->build($this->filters($request)));
    }

    public function export(Request $request, EstablishmentReportService $reports)
    {
        $validated = $this->filters($request, true);
        $format = $validated['format'] ?? 'pdf';
        unset($validated['format']);
        $data = $reports->build($validated);
        $suffix = ($validated['employer_id'] ?? null)
            ? 'employer-'.$validated['employer_id'].'-'.now()->format('Ymd')
            : 'all-establishments-'.now()->format('Ymd');

        return $format === 'csv'
            ? $reports->downloadCsv($data, $suffix)
            : $reports->downloadPdf($data, $suffix);
    }

    private function filters(Request $request, bool $includeFormat = false): array
    {
        $rules = [
            'employer_id' => ['nullable', 'integer', 'exists:employers,employer_id'],
            'job_fair_id' => ['nullable', 'integer', 'exists:job_fairs,job_fair_id'],
            'vacancy_id' => ['nullable', 'integer', 'exists:job_vacancies,post_id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'status' => ['nullable', Rule::in(['pending', 'reviewed', 'shortlisted', 'interview', 'hired', 'rejected', 'hots'])],
            'source' => ['nullable', Rule::in(['online', 'job_fair', 'all'])],
        ];
        if ($includeFormat) {
            $rules['format'] = ['nullable', Rule::in(['pdf', 'csv'])];
        }

        $validated = $request->validate($rules);

        // Bound unscoped requests to a recent window by default. `applications`
        // is an unbounded, ever-growing table; the frontend's initial preview
        // call (before an admin picks any filter) sends none of employer_id /
        // job_fair_id / vacancy_id / date range, which previously loaded every
        // application ever submitted — three eager relations each — into
        // memory. An admin can still request a wider or unbounded range by
        // explicitly setting date_from/date_to.
        $isScoped = ($validated['employer_id'] ?? null)
            || ($validated['job_fair_id'] ?? null)
            || ($validated['vacancy_id'] ?? null);

        if (! $isScoped && empty($validated['date_from']) && empty($validated['date_to'])) {
            $validated['date_from'] = now()->subDays(90)->toDateString();
            $validated['date_to'] = now()->toDateString();
        }

        return $validated;
    }
}
