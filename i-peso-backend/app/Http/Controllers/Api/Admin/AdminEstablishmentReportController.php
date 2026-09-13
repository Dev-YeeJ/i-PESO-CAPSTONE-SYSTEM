<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\JobFairReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Establishment Report = post-event job-fair results only (RO1-JF Form 3),
 * browsed here across every fair and every establishment. Per-fair encoding
 * still happens on the admin Job Fair dashboard's "reports"/"paper encoding"
 * tabs (Admin\GovernmentDole\JobFairController); this is a read-only index
 * over what's already been submitted there.
 */
class AdminEstablishmentReportController extends Controller
{
    public function preview(Request $request, JobFairReportService $reports): JsonResponse
    {
        return response()->json($reports->browseReports(null, $this->filters($request)));
    }

    private function filters(Request $request): array
    {
        return $request->validate([
            'employer_id' => ['nullable', 'integer', 'exists:employers,employer_id'],
            'job_fair_id' => ['nullable', 'integer', 'exists:job_fairs,job_fair_id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);
    }
}
