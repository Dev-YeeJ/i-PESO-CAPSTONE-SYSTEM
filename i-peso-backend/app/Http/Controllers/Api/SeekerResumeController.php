<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
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

        if (! filled($seeker->profile_image)) {
            throw ValidationException::withMessages([
                'profile_image' => 'Upload a professional 2x2 profile photo before generating your resume.',
            ]);
        }

        $profilePhoto = $this->profilePhotoDataUri($seeker);
        if (! $profilePhoto) {
            throw ValidationException::withMessages([
                'profile_image' => 'Your profile photo could not be found. Please upload it again.',
            ]);
        }

        $pdf = Pdf::loadView('pdf.smart-resume', [
            'seeker' => $seeker,
            'skillsByType' => $seeker->seekerSkills->groupBy('skill_type'),
            'profilePhoto' => $profilePhoto,
            'generatedDate' => now(),
        ])
            ->setOption([
                'defaultFont' => 'Helvetica',
                'isFontSubsettingEnabled' => false,
            ])
            ->setPaper('A4', 'portrait');

        $filename = 'Resume_'.$seeker->seeker_id.'_'.str($seeker->last_name)->slug('_').'.pdf';
        $path = "seeker_resumes/{$seeker->seeker_id}/latest-resume.pdf";
        Storage::disk('local')->put($path, $pdf->output());
        $seeker->forceFill(['resume_path' => $path])->save();

        return $pdf->download($filename);
    }

    private function profilePhotoDataUri(JobSeeker $seeker): ?string
    {
        $disk = Storage::disk('local')->exists($seeker->profile_image) ? 'local' : 'public';
        if (! Storage::disk($disk)->exists($seeker->profile_image)) {
            return null;
        }

        $contents = Storage::disk($disk)->get($seeker->profile_image);
        $mimeType = Storage::disk($disk)->mimeType($seeker->profile_image) ?: 'image/jpeg';

        return 'data:'.$mimeType.';base64,'.base64_encode($contents);
    }
}
