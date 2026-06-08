<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\JobSeeker;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class NSRPPdfExportController extends Controller
{
    /**
     * Export a Job Seeker's NSRP profile as PDF
     * Properly loads skills grouped by type for rendering
     */
    public function exportNSRPPdf(int $seekerId): Response
    {
        // Verify admin authorization
        $admin = auth()->user();
        if (! $admin instanceof Administrator) {
            abort(403, 'Unauthorized');
        }

        // Fetch job seeker with all related data (Steps 1-7)
        $seeker = JobSeeker::with([
            'disabilities',
            'occupations',
            'languages',
            'workLocations',
            'educations',      // Step 5
            'seekerSkills',    // All skills (will be filtered in template)
            'trainings',       // Step 6
            'eligibilities',   // Step 6
            'workExperiences', // Step 7
        ])->findOrFail($seekerId);

        // Organize skills by type for cleaner template rendering
        $skillsByType = [
            'dole_standard' => $seeker->seekerSkills->where('skill_type', 'dole_standard')->pluck('skill_name')->toArray(),
            'technical' => $seeker->seekerSkills->where('skill_type', 'technical')->pluck('skill_name')->toArray(),
            'soft' => $seeker->seekerSkills->where('skill_type', 'soft')->pluck('skill_name')->toArray(),
        ];

        // Generate PDF from Blade template
        $pdf = Pdf::loadView('pdf.nsrp-form', [
            'seeker' => $seeker,
            'skillsByType' => $skillsByType,
            'generatedDate' => now(),
        ]);

        // Configure PDF options
        $pdf->setPaper('A4', 'portrait');
        $pdf->setOption('margin-top', 0.5);
        $pdf->setOption('margin-right', 0.5);
        $pdf->setOption('margin-bottom', 0.5);
        $pdf->setOption('margin-left', 0.5);
        $pdf->setOption('dpi', 150);

        // Return PDF as download
        $filename = 'NSRP_Form_'.$seeker->seeker_id.'_'.$seeker->last_name.'.pdf';

        return $pdf->download($filename);
    }
}
