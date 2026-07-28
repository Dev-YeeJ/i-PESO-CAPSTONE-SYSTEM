<?php

namespace App\Services;

use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use App\Models\JobVacancySkill;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class UpskillRecommendationService
{
    public function recommend(JobSeeker $seeker, int $limit = 8): Collection
    {
        $seeker->loadMissing('seekerSkills.skill', 'occupations');

        $ownedSkillIds = $seeker->seekerSkills->pluck('skill_id')->filter()->map(fn ($id) => (int) $id);
        $ownedSkillNames = $seeker->seekerSkills->pluck('skill_name')->filter()->map(
            fn ($name) => $this->normalize($name)
        );
        $occupationIds = $seeker->occupations->pluck('occupation_id')->filter()->map(fn ($id) => (int) $id);
        $missing = $this->missingSkills($ownedSkillIds, $ownedSkillNames, $occupationIds);
        $demand = $this->employerDemand();

        return GovernmentProgram::query()
            ->with(['skills.skill', 'targetOccupation'])
            ->where('program_status', 'open')
            ->where('visibility', 'public')
            ->whereIn('category', ['tech_voc_training', 'career_guidance', 'livelihood_program', 'other'])
            ->where(function ($query) {
                $query->whereNull('application_deadline')->orWhereDate('application_deadline', '>=', today());
            })
            ->get()
            ->map(function (GovernmentProgram $program) use ($missing, $demand, $occupationIds) {
                $matches = $program->skills
                    ->filter(fn ($skill) => $this->skillMatches($skill->skill_id, $skill->skill_name, $missing))
                    ->pluck('skill_name')
                    ->unique()
                    ->values();
                $demandMatches = $program->skills
                    ->filter(fn ($skill) => $this->skillMatches($skill->skill_id, $skill->skill_name, $demand))
                    ->pluck('skill_name')
                    ->unique()
                    ->values();
                $occupationMatch = $program->target_occupation_id
                    && $occupationIds->contains((int) $program->target_occupation_id);

                $score = min(100, ($matches->count() * 35) + ($demandMatches->count() * 12) + ($occupationMatch ? 25 : 0));
                if ($score === 0 && $program->category === 'career_guidance') {
                    $score = 10;
                }

                $program->setAttribute('recommendation_score', $score);
                $program->setAttribute('matched_missing_skills', $matches->all());
                $program->setAttribute('employer_demand_skills', $demandMatches->all());
                $program->setAttribute('recommendation_reason', $this->reason($matches, $demandMatches, $occupationMatch));

                return $program;
            })
            ->filter(fn (GovernmentProgram $program) => $program->recommendation_score > 0)
            ->sortByDesc('recommendation_score')
            ->take($limit)
            ->values();
    }

    public function recipientsForProgram(GovernmentProgram $program, int $limit = 200): EloquentCollection
    {
        if (! $program->target_occupation_id) {
            return new EloquentCollection();
        }

        return JobSeeker::query()
            ->whereHas('occupations', fn ($query) => $query->where('occupation_id', $program->target_occupation_id))
            ->limit($limit)
            ->get();
    }

    private function missingSkills(Collection $ownedIds, Collection $ownedNames, Collection $occupationIds): Collection
    {
        if (! Schema::hasTable('job_vacancy_skills')) {
            return collect();
        }

        return JobVacancySkill::query()
            ->with('skill:id,name')
            ->whereHas('vacancy', function ($query) use ($occupationIds) {
                $query->where('status', 'active');
                if ($occupationIds->isNotEmpty()) {
                    $query->whereIn('occupation_id', $occupationIds);
                }
            })
            ->when($ownedIds->isNotEmpty(), fn ($query) => $query->whereNotIn('skill_id', $ownedIds))
            ->get()
            ->reject(fn ($requirement) => $ownedNames->contains($this->normalize($requirement->original_name)))
            ->map(fn ($requirement) => [
                'skill_id' => $requirement->skill_id ? (int) $requirement->skill_id : null,
                'skill_name' => $requirement->skill?->name ?? $requirement->original_name,
            ])
            ->unique(fn ($skill) => ($skill['skill_id'] ?? 'name').$this->normalize($skill['skill_name']))
            ->values();
    }

    private function employerDemand(): Collection
    {
        // Employer skill-demand signal was retired with the Upskill Hub module.
        // Recommendations now rely on the seeker's missing skills + occupation match.
        return collect();
    }

    private function skillMatches(?int $skillId, string $skillName, Collection $candidates): bool
    {
        return $candidates->contains(function ($candidate) use ($skillId, $skillName) {
            return ($skillId && ($candidate['skill_id'] ?? null) === (int) $skillId)
                || $this->normalize($candidate['skill_name'] ?? '') === $this->normalize($skillName);
        });
    }

    private function normalize(?string $value): string
    {
        return Str::of((string) $value)->lower()->replaceMatches('/[^a-z0-9+#.]+/', ' ')->squish()->toString();
    }

    private function reason(Collection $missing, Collection $demand, bool $occupationMatch): string
    {
        if ($missing->isNotEmpty()) {
            return 'Build skills currently missing from matching vacancies: '.$missing->join(', ').'.';
        }
        if ($occupationMatch) {
            return 'Aligned with one of your preferred occupations.';
        }
        if ($demand->isNotEmpty()) {
            return 'Covers skills requested by local employers: '.$demand->join(', ').'.';
        }

        return 'Supports employability and career readiness.';
    }
}
