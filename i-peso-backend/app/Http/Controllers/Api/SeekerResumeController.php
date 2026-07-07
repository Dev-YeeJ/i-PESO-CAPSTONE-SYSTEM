<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

        $validated = $request->validate([
            'professional_summary' => ['required', 'string', 'max:1200'],
            'responsibility_overrides' => ['nullable', 'array'],
            'responsibility_overrides.*' => ['nullable', 'string', 'max:1200'],
        ]);

        $responsibilityOverrides = collect($validated['responsibility_overrides'] ?? [])
            ->mapWithKeys(fn ($value, $key) => [
                (string) $key => trim(strip_tags((string) $value)),
            ])
            ->filter()
            ->all();

        $pdf = Pdf::loadView('pdf.smart-resume', [
            'seeker' => $seeker,
            'skillsByType' => $seeker->seekerSkills->groupBy('skill_type'),
            'profilePhoto' => $profilePhoto,
            'generatedDate' => now(),
            'professionalSummary' => Str::squish(strip_tags((string) ($validated['professional_summary'] ?? ''))),
            'responsibilityOverrides' => $responsibilityOverrides,
        ])
            ->setOption([
                'defaultFont' => 'Helvetica',
                'isFontSubsettingEnabled' => false,
            ])
            ->setPaper([0, 0, 595.28, 841.89], 'portrait');

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
