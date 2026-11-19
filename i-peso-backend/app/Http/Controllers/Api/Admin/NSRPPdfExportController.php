<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Support\Nsrp\NsrpFormData;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class NSRPPdfExportController extends Controller
{
    /**
     * Download one job seeker's NSRP Form 1 (September 2020), filled in from their profile.
     *
     * The field mapping is in NsrpFormData; the view only draws the official two-page A4 form.
     */
    public function exportNSRPPdf(int $seekerId): Response
    {
        if (! auth()->user() instanceof Administrator) {
            abort(403, 'Unauthorized');
        }

        $seeker = JobSeeker::with(NsrpFormData::RELATIONS)->findOrFail($seekerId);

        $pdf = Pdf::loadView('pdf.nsrp-form', ['form' => NsrpFormData::for($seeker)])
            ->setPaper('a4', 'portrait'); // the official form is printed on A4

        return $pdf->download(NsrpFormData::filename($seeker));
    }
}
