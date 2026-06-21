<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\JobVacancySkill;
use App\Models\SeekerSkill;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class JobSkillMatchingService
{
    public function __construct(
        private readonly SkillTaxonomyService $taxonomy,
        private readonly SkillNormalizationService $normalizer
    ) {}

    public function score(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        if (! Schema::hasTable('job_vacancy_skills')) {
            return $this->textFallbackScore($vacancy, $seeker);
        }

        $vacancy->loadMissing([
            'skillRequirements.skill.outgoingRelationships',
            'skillRequirements.skill.incomingRelationships',
        ]);

        if (Schema::hasTable('seeker_skills')) {
            $seeker->loadMissing('seekerSkills.skill');
        }

        $seekerSkillIds = $this->taxonomy->seekerSkillIds($seeker);
        $seekerSkills = $this->seekerSkills($seeker);
        $requirements = $vacancy->skillRequirements;
        $totalWeight = (float) $requirements->sum('weight');

        if ($requirements->isEmpty() || $totalWeight <= 0) {
            return $this->textFallbackScore($vacancy, $seeker);
        }

        $details = $requirements->map(
            fn (JobVacancySkill $requirement) => $this->matchRequirement(
                $requirement,
                $seekerSkillIds,
                $seekerSkills
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
        Collection $seekerSkillIds,
        Collection $seekerSkills
    ): array {
        $skill = $requirement->skill;
        $factor = 0.0;
        $matchType = 'none';
        $matchedSkillId = null;
        $matchedSkillName = null;

        if ($seekerSkillIds->contains($requirement->skill_id)) {
            $factor = 1.0;
            $matchType = 'exact_or_alias';
            $matchedSkillId = $requirement->skill_id;
            $matchedSkillName = $skill?->name ?? $requirement->original_name;
        } elseif ($skill) {
            $outgoing = $skill->outgoingRelationships
                ->whereIn('related_skill_id', $seekerSkillIds)
                ->sortByDesc('match_weight')
                ->first();

            if ($outgoing) {
                $factor = (float) $outgoing->match_weight;
                $matchType = $outgoing->relationship_type;
                $matchedSkillId = $outgoing->related_skill_id;
                $matchedSkillName = $seekerSkills
                    ->firstWhere('skill_id', $matchedSkillId)?->skill_name;
            }

            $incoming = $skill->incomingRelationships
                ->whereIn('parent_skill_id', $seekerSkillIds)
                ->sortByDesc('reverse_match_weight')
                ->first();

            if ($incoming && (float) $incoming->reverse_match_weight > $factor) {
                $factor = (float) $incoming->reverse_match_weight;
                $matchType = 'reverse_'.$incoming->relationship_type;
                $matchedSkillId = $incoming->parent_skill_id;
                $matchedSkillName = $seekerSkills
                    ->firstWhere('skill_id', $matchedSkillId)?->skill_name;
            }
        }

        $textMatch = $this->textMatchRequirement(
            $requirement->original_name,
            $requirement->skill_type,
            $seekerSkills
        );

        if (($textMatch['factor'] ?? 0) > $factor) {
            $factor = (float) $textMatch['factor'];
            $matchType = $textMatch['match_type'];
            $matchedSkillId = $textMatch['matched_skill_id'];
            $matchedSkillName = $textMatch['matched_skill_name'];
        }

        return [
            'required_skill_id' => $requirement->skill_id,
            'required_skill' => $skill?->name ?? $requirement->original_name,
            'matched_skill_id' => $matchedSkillId,
            'matched_skill' => $matchedSkillName,
            'match_type' => $matchType,
            'match_factor' => round($factor, 3),
            'requirement_weight' => (float) $requirement->weight,
            'weighted_score' => round($factor * (float) $requirement->weight, 3),
        ];
    }

    private function textFallbackScore(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        if (Schema::hasTable('seeker_skills')) {
            $seeker->loadMissing('seekerSkills.skill');
        }

        $requirements = collect($vacancy->required_skills ?? [])
            ->map(fn ($name) => [
                'required_skill' => Str::of((string) $name)->squish()->toString(),
                'skill_type' => 'required',
                'weight' => 1.0,
            ])
            ->concat(
                collect($vacancy->soft_skills ?? [])->map(fn ($name) => [
                    'required_skill' => Str::of((string) $name)->squish()->toString(),
                    'skill_type' => 'soft',
                    'weight' => 0.5,
                ])
            )
            ->filter(fn (array $requirement) => $requirement['required_skill'] !== '')
            ->values();

        $totalWeight = (float) $requirements->sum('weight');
        if ($requirements->isEmpty() || $totalWeight <= 0) {
            return [
                'percentage' => 0.0,
                'matched_weight' => 0.0,
                'total_weight' => 0.0,
                'matched_requirements' => 0,
                'total_requirements' => 0,
                'details' => [],
            ];
        }

        $seekerSkills = $this->seekerSkills($seeker);
        $details = $requirements->map(function (array $requirement) use ($seekerSkills) {
            $textMatch = $this->textMatchRequirement(
                $requirement['required_skill'],
                $requirement['skill_type'],
                $seekerSkills
            );
            $factor = (float) ($textMatch['factor'] ?? 0);
            $weight = (float) $requirement['weight'];

            return [
                'required_skill_id' => null,
                'required_skill' => $requirement['required_skill'],
                'matched_skill_id' => $textMatch['matched_skill_id'] ?? null,
                'matched_skill' => $textMatch['matched_skill_name'] ?? null,
                'match_type' => $textMatch['match_type'] ?? 'none',
                'match_factor' => round($factor, 3),
                'requirement_weight' => $weight,
                'weighted_score' => round($factor * $weight, 3),
            ];
        });

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

    private function textMatchRequirement(
        string $requiredSkill,
        string $requirementType,
        Collection $seekerSkills
    ): array {
        $candidates = $this->filteredSeekerSkills($seekerSkills, $requirementType);
        if ($candidates->isEmpty()) {
            $candidates = $seekerSkills;
        }

        if ($candidates->isEmpty()) {
            return [
                'factor' => 0.0,
                'match_type' => 'none',
                'matched_skill_id' => null,
                'matched_skill_name' => null,
            ];
        }

        return $candidates
            ->map(fn (SeekerSkill $skill) => $this->compareTextSkill($requiredSkill, $skill))
            ->sortByDesc('factor')
            ->first();
    }

    private function compareTextSkill(string $requiredSkill, SeekerSkill $skill): array
    {
        $requiredNormalized = $this->normalizer->normalize($requiredSkill);
        $candidateNames = collect([
            $skill->skill_name,
            $skill->normalized_skill_name,
            $skill->skill?->name,
            $skill->skill?->normalized_name,
        ])->filter()->unique()->values();

        $best = [
            'factor' => 0.0,
            'match_type' => 'none',
            'matched_skill_id' => $skill->skill_id,
            'matched_skill_name' => $skill->skill_name,
        ];

        foreach ($candidateNames as $candidateName) {
            $candidateNormalized = $this->normalizer->normalize((string) $candidateName);

            if ($requiredNormalized === '' || $candidateNormalized === '') {
                continue;
            }

            if ($this->normalizer->areDuplicates($requiredSkill, (string) $candidateName)) {
                return [
                    'factor' => 1.0,
                    'match_type' => 'text_exact',
                    'matched_skill_id' => $skill->skill_id,
                    'matched_skill_name' => $skill->skill_name,
                ];
            }

            if (
                Str::contains($requiredNormalized, $candidateNormalized)
                || Str::contains($candidateNormalized, $requiredNormalized)
            ) {
                $best = [
                    'factor' => 0.8,
                    'match_type' => 'text_contains',
                    'matched_skill_id' => $skill->skill_id,
                    'matched_skill_name' => $skill->skill_name,
                ];
                continue;
            }

            $semanticFactor = $this->semanticSkillFactor($requiredNormalized, $candidateNormalized);
            if ($semanticFactor > ($best['factor'] ?? 0)) {
                $best = [
                    'factor' => $semanticFactor,
                    'match_type' => 'semantic_skill_family',
                    'matched_skill_id' => $skill->skill_id,
                    'matched_skill_name' => $skill->skill_name,
                ];
            }

            $overlap = $this->tokenOverlapFactor($requiredNormalized, $candidateNormalized);
            if ($overlap > ($best['factor'] ?? 0)) {
                $best = [
                    'factor' => $overlap,
                    'match_type' => 'text_overlap',
                    'matched_skill_id' => $skill->skill_id,
                    'matched_skill_name' => $skill->skill_name,
                ];
            }
        }

        return $best;
    }

    private function semanticSkillFactor(string $required, string $candidate): float
    {
        $requiredGroups = $this->semanticSkillGroups($required);
        $candidateGroups = $this->semanticSkillGroups($candidate);

        if ($requiredGroups->isEmpty() || $candidateGroups->isEmpty()) {
            return 0.0;
        }

        $sharedGroups = $requiredGroups->intersect($candidateGroups);

        return $sharedGroups->isEmpty() ? 0.0 : 0.85;
    }

    private function semanticSkillGroups(string $normalizedSkill): Collection
    {
        $groups = [
            'computer_operations' => [
                'basic computer operations',
                'computer operation',
                'computer literacy',
                'computer skills',
                'computer literate',
                'digital literacy',
                'typing',
                'encoding',
                'data entry',
            ],
            'spreadsheet' => [
                'microsoft excel',
                'excel',
                'spreadsheet',
                'spreadsheet management',
                'google sheets',
                'worksheet',
            ],
            'customer_service' => [
                'customer service',
                'client support',
                'client assistance',
                'customer care',
                'customer assistance',
                'guest relations',
                'front desk service',
            ],
            'sales' => [
                'sales',
                'selling',
                'retail sales',
                'merchandising',
                'product promotion',
                'upselling',
            ],
            'inventory' => [
                'inventory management',
                'inventory control',
                'stock control',
                'stock management',
                'warehouse inventory',
                'stock taking',
            ],
            'food_service' => [
                'food preparation',
                'food prep',
                'meal preparation',
                'kitchen work',
                'cooking',
                'cookery',
            ],
            'driving' => [
                'driving',
                'vehicle operation',
                'vehicle driving',
                'defensive driving',
                'delivery driving',
                'truck driving',
            ],
            'office_admin' => [
                'office administration',
                'administrative support',
                'administrative work',
                'clerical work',
                'records management',
                'filing',
            ],
            'teamwork' => [
                'teamwork',
                'collaboration',
                'cooperation',
                'team collaboration',
            ],
            'leadership' => [
                'leadership',
                'team leading',
                'people management',
                'supervision',
                'staff supervision',
            ],
            'problem_solving' => [
                'problem solving',
                'troubleshooting',
                'analytical thinking',
                'critical thinking',
            ],
            'communication' => [
                'communication',
                'verbal communication',
                'written communication',
                'interpersonal communication',
                'active listening',
            ],
        ];

        return collect($groups)
            ->filter(fn (array $phrases) => collect($phrases)->contains(
                fn (string $phrase) => $normalizedSkill === $phrase
                    || Str::contains($normalizedSkill, $phrase)
                    || Str::contains($phrase, $normalizedSkill)
            ))
            ->keys()
            ->values();
    }

    private function filteredSeekerSkills(Collection $seekerSkills, string $requirementType): Collection
    {
        if ($requirementType === 'soft') {
            return $seekerSkills->filter(
                fn (SeekerSkill $skill) => $skill->skill_type === 'soft'
            )->values();
        }

        return $seekerSkills->filter(
            fn (SeekerSkill $skill) => $skill->skill_type !== 'soft'
        )->values();
    }

    private function seekerSkills(JobSeeker $seeker): Collection
    {
        if (! Schema::hasTable('seeker_skills')) {
            return collect();
        }

        return $seeker->relationLoaded('seekerSkills')
            ? $seeker->seekerSkills
            : $seeker->seekerSkills()->with('skill')->get();
    }

    private function tokenOverlapFactor(string $required, string $candidate): float
    {
        $requiredTokens = collect(explode(' ', $required))->filter()->values();
        $candidateTokens = collect(explode(' ', $candidate))->filter()->values();

        if ($requiredTokens->isEmpty() || $candidateTokens->isEmpty()) {
            return 0.0;
        }

        $overlapCount = $requiredTokens->intersect($candidateTokens)->count();
        if ($overlapCount === 0) {
            return 0.0;
        }

        $ratio = $overlapCount / max($requiredTokens->count(), $candidateTokens->count());

        return $ratio >= 0.5 ? round(min(0.75, $ratio), 3) : 0.0;
    }
}
