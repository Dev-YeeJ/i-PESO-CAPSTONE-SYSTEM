<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Application;

trait FormatsApplications
{
    private function formatApplication(Application $application, bool $includeSeeker = true): array
    {
        $application->loadMissing([
            'jobVacancy.employer',
            'jobSeeker.seekerSkills',
            'jobSeeker.educations',
            'jobSeeker.workExperiences',
            'jobSeeker.occupations',
            'interviewSchedule',
        ]);

        $vacancy = $application->jobVacancy;
        $seeker = $application->jobSeeker;

        return [
            'apply_id' => $application->apply_id,
            'post_id' => $application->post_id,
            'seeker_id' => $application->seeker_id,
            'job_fair_id' => $application->job_fair_id,
            'is_hots' => (bool) $application->is_hots,
            'dole_mismatch_code' => $application->dole_mismatch_code,
            'employer_mismatch_reason_code' => $application->employer_mismatch_reason_code,
            'seeker_mismatch_reason_code' => $application->seeker_mismatch_reason_code,
            'mismatch_reason_details' => $application->mismatch_reason_details,
            'status' => $application->status,
            'status_label' => $this->applicationStatusLabel($application->status),
            'can_withdraw' => $this->canWithdraw($application),
            'match_percentage' => (float) $application->match_percentage,
            'employer_remarks' => $application->employer_remarks,
            'submitted_documents' => $application->submitted_documents ?? [],
            'applied_at' => $application->created_at?->toISOString(),
            'status_changed_at' => $application->status_changed_at?->toISOString(),
            'timeline' => $this->buildTimeline($application),
            'job' => $vacancy ? [
                'post_id' => $vacancy->post_id,
                'job_title' => $vacancy->job_title,
                'employment_type' => $vacancy->employment_type,
                'work_setup' => $vacancy->work_setup,
                'location' => $vacancy->location,
                'province' => $vacancy->province,
                'city_municipality' => $vacancy->city_municipality,
                'barangay' => $vacancy->barangay,
                'salary_min' => $vacancy->salary_min,
                'salary_max' => $vacancy->salary_max,
                'salary_type' => $vacancy->salary_type,
                'hide_salary' => $vacancy->hide_salary,
                'application_deadline' => $vacancy->application_deadline?->toDateString(),
                'employer' => [
                    'employer_id' => $vacancy->employer?->employer_id,
                    'company_name' => $vacancy->employer?->company_name,
                    'company_logo_url' => $vacancy->employer?->company_logo
                        ? \Illuminate\Support\Facades\Storage::disk('public')->url($vacancy->employer->company_logo)
                        : null,
                ],
            ] : null,
            'seeker' => $includeSeeker && $seeker ? [
                'seeker_id' => $seeker->seeker_id,
                'name' => trim("{$seeker->first_name} {$seeker->last_name}"),
                'first_name' => $seeker->first_name,
                'last_name' => $seeker->last_name,
                'email' => $seeker->email,
                'mobile_number' => $seeker->mobile_number,
                'educ_attainment' => $seeker->educ_attainment,
                'address' => $seeker->getFullAddress(),
                'employment_status' => $seeker->employment_status,
                'skills' => $seeker->seekerSkills
                    ->pluck('skill_name')
                    ->filter()
                    ->values(),
                'educations' => $seeker->educations,
                'work_experiences' => $seeker->workExperiences,
                'occupations' => $seeker->occupations,
                'profile_completed' => (bool) $seeker->profile_completed,
            ] : null,
            'interview' => $application->interviewSchedule ? [
                'interview_id' => $application->interviewSchedule->interview_id,
                'mode_of_interview' => $application->interviewSchedule->mode_of_interview,
                'schedule' => $application->interviewSchedule->schedule?->toISOString(),
                'venue_or_link' => $application->interviewSchedule->venue_or_link,
                'instructions' => $application->interviewSchedule->instructions,
                'status' => $application->interviewSchedule->status,
            ] : null,
            'placement' => $application->placement_captured_at ? [
                'start_date' => $application->placement_start_date?->toDateString(),
                'salary' => $application->placement_salary,
                'captured_at' => $application->placement_captured_at?->toISOString(),
            ] : null,
        ];
    }

    private function applicationStatusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Pending Review',
            'reviewed' => 'Reviewed',
            'shortlisted' => 'Shortlisted',
            'interview' => 'Interview',
            'hired' => 'Hired',
            'rejected' => 'Rejected',
            'withdrawn' => 'Withdrawn',
            default => ucfirst($status),
        };
    }

    private function canWithdraw(Application $application): bool
    {
        return ! in_array($application->status, ['hired', 'rejected', 'withdrawn'], true);
    }

    private function buildTimeline(Application $application): array
    {
        $timeline = [[
            'title' => 'Application submitted',
            'description' => 'Your application was submitted and is waiting for review.',
            'timestamp' => $application->created_at?->toISOString(),
            'status' => 'submitted',
        ]];

        $status = $application->status;

        if ($status === 'reviewed') {
            $timeline[] = [
                'title' => 'Application reviewed',
                'description' => 'The employer reviewed your application and opened your profile.',
                'timestamp' => $application->status_changed_at?->toISOString(),
                'status' => 'reviewed',
            ];
        }

        if (in_array($status, ['shortlisted', 'interview', 'hired', 'rejected', 'withdrawn'], true)) {
            $timeline[] = [
                'title' => match ($status) {
                    'shortlisted' => 'Shortlisted',
                    'interview' => 'Interview scheduled',
                    'hired' => 'Hired',
                    'rejected' => 'Application rejected',
                    'withdrawn' => 'Application withdrawn',
                },
                'description' => match ($status) {
                    'shortlisted' => 'The employer shortlisted your application for the next step.',
                    'interview' => 'The employer scheduled an interview for this application.',
                    'hired' => 'The employer marked this application as hired.',
                    'rejected' => 'The employer closed this application.',
                    'withdrawn' => 'You withdrew this application.',
                },
                'timestamp' => $application->status_changed_at?->toISOString(),
                'status' => $status,
            ];
        }

        if ($status === 'interview' && $application->interviewSchedule) {
            $timeline[] = [
                'title' => 'Interview details shared',
                'description' => 'The interview date, venue, and instructions were shared.',
                'timestamp' => $application->interviewSchedule->created_at?->toISOString(),
                'status' => 'interview_details',
            ];
        }

        return $timeline;
    }
}
