<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\JobVacancySkill;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class JobSkillMatchingService
{
    public function __construct(private readonly SkillTaxonomyService $taxonomy) {}

    public function score(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        if (! Schema::hasTable('job_vacancy_skills')) {
            return [
                'percentage' => 0.0,
                'matched_weight' => 0.0,
                'total_weight' => 0.0,
                'matched_requirements' => 0,
                'total_requirements' => 0,
                'details' => [],
            ];
        }

        $vacancy->loadMissing([
            'skillRequirements.skill.outgoingRelationships',
            'skillRequirements.skill.incomingRelationships',
        ]);

        $seekerSkillIds = $this->taxonomy->seekerSkillIds($seeker);
        $requirements = $vacancy->skillRequirements;
        $totalWeight = (float) $requirements->sum('weight');

        if ($requirements->isEmpty() || $totalWeight <= 0 || $seekerSkillIds->isEmpty()) {
            return [
                'percentage' => 0.0,
                'matched_weight' => 0.0,
                'total_weight' => $totalWeight,
                'matched_requirements' => 0,
                'total_requirements' => $requirements->count(),
                'details' => [],
            ];
        }

        $details = $requirements->map(
            fn (JobVacancySkill $requirement) => $this->matchRequirement(
                $requirement,
                $seekerSkillIds
            )
        );
        $matchedWeight = (float) $details->sum('weighted_score');

        return [
            'percentage' => round(($matchedWeight / $totalWeight) * 100, 2),
            'matched_weight' => round($matchedWeight, 3),
            'total_weight' => round($totalWeight, 3),
            'matched_requirements' => $details->where('match_factor', '>', 0)->count(),
            'total_requirements' => $requirements->count(),
            'details' => $details->values()->all(),
        ];
    }

    public function rank(
        Builder $query,
        JobSeeker $seeker,
        int $limit = 20,
        float $minimumPercentage = 0
    ): Collection {
        return $query
            ->with([
                'skillRequirements.skill.outgoingRelationships',
                'skillRequirements.skill.incomingRelationships',
            ])
            ->get()
            ->map(function (JobVacancy $vacancy) use ($seeker) {
                $vacancy->setAttribute('skill_match', $this->score($vacancy, $seeker));

                return $vacancy;
            })
            ->filter(fn (JobVacancy $vacancy) => $vacancy->skill_match['percentage'] >= $minimumPercentage)
            ->sortByDesc(fn (JobVacancy $vacancy) => $vacancy->skill_match['percentage'])
            ->take($limit)
            ->values();
    }

    private function matchRequirement(
        JobVacancySkill $requirement,
        Collection $seekerSkillIds
    ): array {
        $skill = $requirement->skill;
        $factor = 0.0;
        $matchType = 'none';
        $matchedSkillId = null;

        if ($seekerSkillIds->contains($requirement->skill_id)) {
            $factor = 1.0;
            $matchType = 'exact_or_alias';
            $matchedSkillId = $requirement->skill_id;
        } elseif ($skill) {
            $outgoing = $skill->outgoingRelationships
                ->whereIn('related_skill_id', $seekerSkillIds)
                ->sortByDesc('match_weight')
                ->first();

            if ($outgoing) {
                $factor = (float) $outgoing->match_weight;
                $matchType = $outgoing->relationship_type;
                $matchedSkillId = $outgoing->related_skill_id;
            }

            $incoming = $skill->incomingRelationships
                ->whereIn('parent_skill_id', $seekerSkillIds)
                ->sortByDesc('reverse_match_weight')
                ->first();

            if ($incoming && (float) $incoming->reverse_match_weight > $factor) {
                $factor = (float) $incoming->reverse_match_weight;
                $matchType = 'reverse_'.$incoming->relationship_type;
                $matchedSkillId = $incoming->parent_skill_id;
            }
        }

        return [
            'required_skill_id' => $requirement->skill_id,
            'required_skill' => $skill?->name ?? $requirement->original_name,
            'matched_skill_id' => $matchedSkillId,
            'match_type' => $matchType,
            'match_factor' => round($factor, 3),
            'requirement_weight' => (float) $requirement->weight,
            'weighted_score' => round($factor * (float) $requirement->weight, 3),
        ];
    }
}
