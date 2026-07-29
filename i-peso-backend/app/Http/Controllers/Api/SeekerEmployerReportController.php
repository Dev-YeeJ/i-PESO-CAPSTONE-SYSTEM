<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\EmployerReport;
use App\Models\JobSeeker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SeekerEmployerReportController extends Controller
{
    /**
     * Store a seeker's report about an employer / job posting.
     * POST /api/seeker/employers/{employer}/report
     */
    public function store(Request $request, Employer $employer): JsonResponse
    {
        $seeker = $this->seeker($request);

        $validated = $request->validate([
            'reason' => ['required', Rule::in(EmployerReport::REASONS)],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        // Prevent spamming the same employer with duplicate open reports.
        $hasOpenReport = EmployerReport::query()
            ->where('employer_id', $employer->employer_id)
            ->where('seeker_id', $seeker->seeker_id)
            ->whereIn('status', ['pending', 'investigating'])
            ->exists();

        if ($hasOpenReport) {
            throw ValidationException::withMessages([
                'reason' => ['You already have an open report for this employer. PESO is reviewing it.'],
            ]);
        }

        $report = EmployerReport::create([
            'employer_id' => $employer->employer_id,
            'seeker_id' => $seeker->seeker_id,
            'reason' => $validated['reason'],
            'description' => trim($validated['description']),
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Report submitted. Thank you for helping keep i-PESO safe.',
            'report' => [
                'id' => $report->id,
                'reason' => $report->reason,
                'status' => $report->status,
                'created_at' => $report->created_at,
            ],
        ], 201);
    }

    private function seeker(Request $request): JobSeeker
    {
        abort_unless($request->user() instanceof JobSeeker, 403, 'Job seeker account required.');

        return $request->user();
    }
}
