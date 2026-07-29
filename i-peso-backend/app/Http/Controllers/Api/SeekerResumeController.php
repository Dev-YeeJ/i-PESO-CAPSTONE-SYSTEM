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

        // The summary is only mandatory when the seeker has no NSRP profile data to
        // build one from. With education/skills/work experience on file we derive a
        // sensible default so a resume can be generated straight from the NSRP profile.
        $hasNsrpData = $seeker->educations->isNotEmpty()
            || $seeker->seekerSkills->isNotEmpty()
            || $seeker->workExperiences->isNotEmpty();

        $validated = $request->validate([
            'professional_summary' => [$hasNsrpData ? 'nullable' : 'required', 'string', 'max:1200'],
            'responsibility_overrides' => ['nullable', 'array'],
            'responsibility_overrides.*' => ['nullable', 'string', 'max:1200'],
        ]);

        $responsibilityOverrides = collect($validated['responsibility_overrides'] ?? [])
            ->mapWithKeys(fn ($value, $key) => [
                (string) $key => trim(strip_tags((string) $value)),
            ])
            ->filter()
            ->all();

        $professionalSummary = Str::squish(strip_tags((string) ($validated['professional_summary'] ?? '')));
        if ($professionalSummary === '') {
            $professionalSummary = $this->summaryFromProfile($seeker);
        }

        $pdf = Pdf::loadView('pdf.smart-resume', [
            'seeker' => $seeker,
            'skillsByType' => $seeker->seekerSkills->groupBy('skill_type'),
            'profilePhoto' => $profilePhoto,
            'generatedDate' => now(),
            'professionalSummary' => $professionalSummary,
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

    /**
     * Build a professional summary from the seeker's NSRP profile (education,
     * work experience, skills) when they did not supply one. Kept plain-text so
     * the resume renders with the standard Helvetica font.
     */
    private function summaryFromProfile(JobSeeker $seeker): string
    {
        $name = trim((string) $seeker->first_name) ?: 'This applicant';
        $sentences = [];

        $education = $seeker->educations
            ->sortByDesc(fn ($education) => $education->year_graduated ?? $education->year_started ?? 0)
            ->first();
        if ($education) {
            $course = trim((string) ($education->course_strand ?? ''));
            $institution = trim((string) ($education->institution_name ?? ''));
            $status = ($education->completion_status ?? '') === 'graduated' ? 'graduate' : 'student';
            $line = "{$name} is a".($course !== '' ? " {$course}" : '')." {$status}";
            if ($institution !== '') {
                $line .= " from {$institution}";
            }
            $sentences[] = $line.'.';
        } else {
            $sentences[] = "{$name} is a motivated job seeker registered with the Urdaneta City PESO.";
        }

        $work = $seeker->workExperiences
            ->sortByDesc(fn ($experience) => $experience->number_of_months ?? 0)
            ->first();
        if ($work && trim((string) ($work->position ?? '')) !== '') {
            $position = trim((string) $work->position);
            $company = trim((string) ($work->company_name ?? ''));
            $sentences[] = 'Brings hands-on experience as '.$position.($company !== '' ? " at {$company}" : '').'.';
        }

        $skills = $seeker->seekerSkills->pluck('skill_name')->filter()->take(5)->implode(', ');
        if ($skills !== '') {
            $sentences[] = "Core skills include {$skills}.";
        }

        return Str::squish(strip_tags(implode(' ', $sentences)));
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
