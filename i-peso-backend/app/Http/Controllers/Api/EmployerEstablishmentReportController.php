<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Services\EstablishmentReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployerEstablishmentReportController extends Controller
{
    public function preview(Request $request, EstablishmentReportService $reports): JsonResponse
    {
        return response()->json($reports->build($this->filters($request), $this->employer($request)));
    }

    public function export(Request $request, EstablishmentReportService $reports)
    {
        $validated = $this->filters($request, true);
        $format = $validated['format'] ?? 'pdf';
        unset($validated['format']);
        $employer = $this->employer($request);
        $data = $reports->build($validated, $employer);
        $suffix = 'employer-'.$employer->employer_id.'-'.now()->format('Ymd');

        return $format === 'csv'
            ? $reports->downloadCsv($data, $suffix)
            : $reports->downloadPdf($data, $suffix);
    }

    private function filters(Request $request, bool $includeFormat = false): array
    {
        $rules = [
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

        return $request->validate($rules);
    }

    private function employer(Request $request): Employer
    {
        abort_unless($request->user() instanceof Employer, 403, 'Employer account required.');

        return $request->user();
    }
}
