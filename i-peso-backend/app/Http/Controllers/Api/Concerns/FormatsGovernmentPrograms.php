<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use App\Models\ProgramApplication;
use App\Services\EligibilityMatchingService;

trait FormatsGovernmentPrograms
{
    private function formatProgram(GovernmentProgram $program, ?JobSeeker $seeker = null): array
    {
        $ownApplication = null;
        if ($seeker) {
            $ownApplication = $program->relationLoaded('applications')
                ? $program->applications->firstWhere('seeker_id', $seeker->seeker_id)
                : $program->applications()->where('seeker_id', $seeker->seeker_id)->first();
        }

        return [
            'program_id' => $program->program_id,
            'title' => $program->program_name,
            'program_name' => $program->program_name,
            'slug' => $program->slug,
            'category' => $program->category,
            'short_description' => $program->short_description,
            'description' => $program->description,
            'target_beneficiaries' => $program->target_beneficiaries,
            'eligibility_requirements' => $program->eligibility_requirements ?? [],
            'eligibility_rules' => $program->eligibility_rules ?? [],
            'required_documents' => $program->required_documents ?? [],
            'citizen_charter_steps' => $program->citizen_charter_steps ?? [],
            'target_industry' => $program->target_industry,
            'target_occupation' => $program->targetOccupation ? [
                'id' => $program->targetOccupation->id,
                'title' => $program->targetOccupation->title,
            ] : null,
            'skills' => $program->skills->map(fn ($skill) => [
                'id' => $skill->id,
                'skill_id' => $skill->skill_id,
                'name' => $skill->skill_name,
                'type' => $skill->type,
            ])->values(),
            'venue' => $program->venue,
            'location_address' => $program->location_address,
            'latitude' => $program->latitude,
            'longitude' => $program->longitude,
            'start_date' => $program->start_date?->format('Y-m-d'),
            'end_date' => $program->end_date?->format('Y-m-d'),
            'application_deadline' => $program->application_deadline?->format('Y-m-d'),
            'total_slots' => $program->total_slots,
            'available_slots' => $program->available_slots,
            'status' => $program->program_status,
            'visibility' => $program->visibility,
            'contact_person' => $program->contact_person,
            'contact_email' => $program->contact_email,
            'contact_phone' => $program->contact_phone,
            'has_attachment' => filled($program->attachment_path),
            'applications_count' => $program->applications_count ?? $program->applications->count(),
            'approved_count' => $program->approved_count ?? null,
            'completed_count' => $program->completed_count ?? null,
            'can_apply' => $seeker ? $program->isAcceptingApplications() && ! $ownApplication : false,
            'eligibility' => $seeker ? app(EligibilityMatchingService::class)->evaluate($seeker, $program) : null,
            'my_application' => $ownApplication ? $this->formatProgramApplication($ownApplication) : null,
            'recommendation_score' => $program->getAttribute('recommendation_score'),
            'recommendation_reason' => $program->getAttribute('recommendation_reason'),
            'matched_missing_skills' => $program->getAttribute('matched_missing_skills') ?? [],
            'employer_demand_skills' => $program->getAttribute('employer_demand_skills') ?? [],
            'created_at' => $program->created_at,
            'updated_at' => $program->updated_at,
        ];
    }

    private function formatProgramApplication(ProgramApplication $application): array
    {
        return [
            'application_id' => $application->prog_apply_id,
            'program_id' => $application->program_id,
            'status' => $application->application_status,
            'remarks' => $application->admin_remarks,
            'eligibility_score' => $application->eligibility_score,
            'applied_at' => $application->created_at,
            'reviewed_at' => $application->reviewed_at,
            'completed_at' => $application->completed_at,
            'documents' => $application->relationLoaded('documents')
                ? $application->documents->map(fn ($document) => [
                    'document_id' => $document->document_id,
                    'document_type' => $document->document_type,
                    'document_name' => $document->document_name,
                    'original_filename' => $document->original_filename,
                    'mime_type' => $document->mime_type,
                    'size' => $document->size,
                    'created_at' => $document->created_at,
                ])->values()
                : [],
            'certificate' => $application->relationLoaded('certificate') && $application->certificate ? [
                'certificate_id' => $application->certificate->certificate_id,
                'title' => $application->certificate->title,
                'issued_at' => $application->certificate->issued_at?->format('Y-m-d'),
            ] : null,
        ];
    }
}
