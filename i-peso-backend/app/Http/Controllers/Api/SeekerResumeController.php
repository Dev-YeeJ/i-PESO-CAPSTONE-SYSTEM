<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class SeekerResumeController extends Controller
{
    public function generate(Request $request): Response
    {
        abort_unless($request->user() instanceof JobSeeker, 403, 'Job seeker account required.');

        $seeker = $request->user()->load([
            'occupations',
            'languages',
            'educations',
            'seekerSkills',
            'trainings',
            'eligibilities',
            'workExperiences',
            'certificates',
        ]);

        $pdf = Pdf::loadView('pdf.smart-resume', [
            'seeker' => $seeker,
            'skillsByType' => $seeker->seekerSkills->groupBy('skill_type'),
            'generatedDate' => now(),
        ])->setPaper('A4', 'portrait');

        $filename = 'Resume_'.$seeker->seeker_id.'_'.str($seeker->last_name)->slug('_').'.pdf';
        $path = "seeker_resumes/{$seeker->seeker_id}/latest-resume.pdf";
        Storage::disk('local')->put($path, $pdf->output());
        $seeker->forceFill(['resume_path' => $path])->save();

        return $pdf->download($filename);
    }
}
