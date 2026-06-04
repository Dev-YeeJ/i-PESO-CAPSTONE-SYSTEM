<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\JobSeeker;
use Illuminate\Http\Response;
use Barryvdh\DomPDF\Facade\Pdf;

class NSRPPdfExportController extends Controller
{
    /**
     * Export a Job Seeker's NSRP profile as PDF
     */
    public function exportNSRPPdf(int $seekerId): Response
    {
        // Verify admin authorization
        $admin = auth()->user();
        if (!$admin instanceof Administrator) {
            abort(403, 'Unauthorized');
        }

        // Fetch job seeker with all related data
        $seeker = JobSeeker::with([
            'disabilities',
            'occupations',
            'languages',
            'workLocations',
        ])->findOrFail($seekerId);

        // Generate PDF from Blade template
        $pdf = Pdf::loadView('pdf.nsrp-form', [
            'seeker' => $seeker,
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
        $filename = "NSRP_Form_" . $seeker->seeker_id . "_" . $seeker->last_name . ".pdf";
        return $pdf->download($filename);
    }
}
