<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use App\Services\EligibilityMatchingService;

trait FormatsGovernmentPrograms
{
    private function formatProgram(GovernmentProgram $program, ?JobSeeker $seeker = null): array
    {
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
            'eligibility' => $seeker ? app(EligibilityMatchingService::class)->evaluate($seeker, $program) : null,
            'recommendation_score' => $program->getAttribute('recommendation_score'),
            'recommendation_reason' => $program->getAttribute('recommendation_reason'),
            'matched_missing_skills' => $program->getAttribute('matched_missing_skills') ?? [],
            'employer_demand_skills' => $program->getAttribute('employer_demand_skills') ?? [],
            'created_at' => $program->created_at,
            'updated_at' => $program->updated_at,
        ];
    }
}
