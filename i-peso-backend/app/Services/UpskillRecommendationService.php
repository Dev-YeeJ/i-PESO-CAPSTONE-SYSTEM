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
    public function __construct(private readonly EligibilityMatchingService $eligibility)
    {
    }

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

    /**
     * Job seekers eligible to be notified that this program just opened.
     *
     * Gated on the seeker's actual eligibility (via EligibilityMatchingService — the same
     * scoring that drives the "Eligible/Partially Eligible/Not Eligible" badge the seeker
     * sees on the program's own detail screen), not just an occupation match. A seeker whose
     * status comes back `not_eligible` (failed a `required` rule) or `low_match` (<60%) is
     * excluded — being occupation-matched alone used to be enough to get notified about a
     * program the seeker couldn't actually qualify for.
     *
     * Occupation stays a relevance pre-filter when the program specifies a target_occupation
     * (unchanged from before), but is no longer a hard requirement: a program with eligibility
     * rules and no target occupation used to notify nobody at all; now eligibility alone does
     * the narrowing for it, same as an occupation-targeted program that has no rules is simply
     * open to everyone in its occupation (EligibilityMatchingService::evaluate() already treats
     * "no rules" as eligible for everyone).
     *
     * $limit caps how many are *notified*, applied after the eligibility filter — not how many
     * are considered.
     */
    public function recipientsForProgram(GovernmentProgram $program, int $limit = 200): EloquentCollection
    {
        $candidates = JobSeeker::query()
            ->where('profile_completed', true)
            ->when(
                $program->target_occupation_id,
                fn ($query) => $query->whereHas(
                    'occupations',
                    fn ($occupations) => $occupations->where('occupation_id', $program->target_occupation_id)
                )
            )
            ->get();

        return $candidates
            ->filter(function (JobSeeker $seeker) use ($program) {
                $status = $this->eligibility->evaluate($seeker, $program)['status'];

                return in_array($status, ['eligible', 'highly_eligible', 'partially_eligible'], true);
            })
            ->take($limit)
            ->values();
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
