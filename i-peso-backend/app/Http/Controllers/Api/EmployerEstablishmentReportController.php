<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Services\JobFairReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Establishment Report = post-event job-fair results only (RO1-JF Form 3),
 * browsed here across every fair the employer has reported on. Per-fair
 * encoding still happens on the Job Fair dashboard's "Post-Event Results"
 * tab (EmployerJobFairController); this is a read-only index over what's
 * already been submitted there.
 */
class EmployerEstablishmentReportController extends Controller
{
    public function preview(Request $request, JobFairReportService $reports): JsonResponse
    {
        $employer = $this->employer($request);

        return response()->json($reports->browseReports($employer->employer_id, $this->filters($request)));
    }

    private function filters(Request $request): array
    {
        return $request->validate([
            'job_fair_id' => ['nullable', 'integer', 'exists:job_fairs,job_fair_id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);
    }

    private function employer(Request $request): Employer
    {
        abort_unless($request->user() instanceof Employer, 403, 'Employer account required.');

        return $request->user();
    }
}
