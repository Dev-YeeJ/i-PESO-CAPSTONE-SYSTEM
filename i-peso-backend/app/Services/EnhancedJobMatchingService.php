<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\Occupation;
use App\Models\SeekerSkill;
use App\Models\SeekerWorkExperience;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Dynamic, explainable scoring engine for i-PESO job matches.
 *
 * Location is intentionally excluded from this score. Controllers may still
 * filter or sort by distance without double-counting geography.
 */
class EnhancedJobMatchingService
{
    private const BASE_WEIGHTS = [
        'occupation' => 30,
        'skills' => 40,
        'experience' => 20,
        'education' => 10,
    ];

    private const CRITICAL_SKILL_THRESHOLD = 0.7;

    public function __construct(
        private readonly JobMatchingService $baseMatching,
        private readonly JobSkillMatchingService $skillMatching,
        private readonly SkillNormalizationService $normalizer,
        private readonly SkillRecommendationService $recommendations,
        private readonly MatchingProfileService $profiles
    ) {}

    public function calculateMatch(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        $baseScore = $this->baseMatching->score($vacancy, $seeker);
        $weights = $this->weightsForVacancy($vacancy);
        $skills = $this->skillsScore($vacancy, $seeker);
        $experience = $this->experienceScore($vacancy, $seeker);

        $factors = [
            'occupation' => $this->factor(
                $baseScore['factors']['occupation']['score'] ?? 0,
                $weights['occupation'],
                $baseScore['factors']['occupation']['available'] ?? false,
                $baseScore['factors']['occupation']['details'] ?? []
            ),
            'skills' => $this->factor(
                $skills['score'],
                $weights['skills'],
                $skills['available'],
                $skills
            ),
            'experience' => $this->factor(
                $experience['score'],
                $weights['experience'],
                $experience['available'],
                $experience
            ),
            'education' => $this->factor(
                $baseScore['factors']['education']['score'] ?? 0,
                $weights['education'],
                $baseScore['factors']['education']['available'] ?? false,
                $baseScore['factors']['education']['details'] ?? []
            ),
        ];

        $totalScore = round(collect($factors)->sum('weighted_score'), 2);
        $profileCoverage = collect($factors)->sum(
            fn (array $factor) => $factor['available'] ? $factor['weight'] : 0
        );

        $payload = [
            'total_score' => $totalScore,
            'percentage' => $totalScore,
            'enhanced_percentage' => $totalScore,
            'eligible' => (bool) ($baseScore['eligible'] ?? true),
            'eligibility_reasons' => $baseScore['eligibility_reasons'] ?? [],
            'confidence' => $this->confidence($profileCoverage, $skills['score'], $experience['available']),
            'profile_coverage' => $profileCoverage,
            'weights' => $weights,
            'weighting_rule' => $this->weightingRule($vacancy),
            'location_excluded' => true,
            'factors' => $factors,
            'missing_critical_skills' => $skills['missing_critical_skills'],
            'skill_gaps' => [
                'has_gaps' => $skills['missing_critical_skills'] !== [],
                'missing_critical_skills' => $skills['missing_critical_skills'],
                'coverage_percentage' => $skills['score'],
                'gap_count' => count($skills['missing_critical_skills']),
            ],
            'recommendations' => $this->getRecommendationsForGaps([
                'has_gaps' => $skills['missing_critical_skills'] !== [],
                'gaps' => array_column($skills['missing_critical_skills'], 'skill'),
            ]),
            'preference_fit' => $baseScore['preference_fit'] ?? [],
        ];

        $payload['score_summary'] = [
            'occupation' => $factors['occupation']['score'],
            'skills' => $factors['skills']['score'],
            'experience' => $factors['experience']['score'],
            'education' => $factors['education']['score'],
        ];

        return $payload;
    }

    /**
     * Backward-compatible method for older callers.
     */
    public function enhancedScore(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        return $this->calculateMatch($vacancy, $seeker);
    }

    public function getActionableFeedback(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        $match = $this->calculateMatch($vacancy, $seeker);
        $feedback = [];

        if ($match['total_score'] >= 80) {
            $feedback[] = [
                'type' => 'positive',
                'message' => 'You are an excellent match for this position.',
            ];
        } elseif ($match['total_score'] >= 60) {
            $feedback[] = [
                'type' => 'positive',
                'message' => 'You meet most requirements. Consider addressing the gaps below.',
            ];
        } else {
            $feedback[] = [
                'type' => 'warning',
                'message' => 'There are significant match gaps. Focus on the priority skills and experience areas.',
            ];
        }

        if ($match['missing_critical_skills'] !== []) {
            $feedback[] = [
                'type' => 'gap',
                'message' => 'Missing or weak critical skills: '
                    .collect($match['missing_critical_skills'])->pluck('skill')->take(3)->join(', '),
                'recommendations' => $match['recommendations'],
            ];
        }

        return [
            'score' => $match['total_score'],
            'confidence' => $match['confidence'],
            'feedback' => $feedback,
        ];
    }

    private function weightsForVacancy(JobVacancy $vacancy): array
    {
        $weights = self::BASE_WEIGHTS;
        $majorGroup = $this->psocMajorGroup($vacancy);

        if (in_array($majorGroup, ['1', '2'], true)) {
            $weights['education'] = 20;
            $weights['experience'] = 10;
        } elseif ($majorGroup === '9') {
            $weights['education'] = 0;
            $weights['experience'] = 30;
        }

        return $this->normalizeWeights($weights);
    }

    private function weightingRule(JobVacancy $vacancy): array
    {
        $majorGroup = $this->psocMajorGroup($vacancy);

        return [
            'psoc_major_group' => $majorGroup,
            'rule' => match ($majorGroup) {
                '1', '2' => 'professionals_managers',
                '9' => 'elementary_manual_labor',
                default => 'default_merit_based',
            },
            'location_removed_from_score' => true,
        ];
    }

    private function normalizeWeights(array $weights): array
    {
        $total = array_sum($weights);
        if ($total === 100) {
            return $weights;
        }

        $normalized = [];
        foreach ($weights as $key => $weight) {
            $normalized[$key] = (int) round(($weight / max(1, $total)) * 100);
        }

        $difference = 100 - array_sum($normalized);
        $normalized['skills'] += $difference;

        return $normalized;
    }

    private function psocMajorGroup(JobVacancy $vacancy): ?string
    {
        $vacancy->loadMissing('occupation');

        $code = collect([
            $vacancy->occupation?->psoc_code,
            $vacancy->occupation?->classification_code,
            $vacancy->occupation?->isco_group,
        ])->first(fn ($value) => filled($value));

        return Str::of((string) $code)->match('/\d/')->toString() ?: null;
    }

    private function skillsScore(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        $raw = $this->skillMatching->score($vacancy, $seeker);
        $requirements = collect($raw['details'] ?? []);
        $totalWeight = (float) ($raw['total_weight'] ?? $requirements->sum('requirement_weight'));

        if ($requirements->isEmpty() || $totalWeight <= 0) {
            return [
                'score' => 100.0,
                'available' => false,
                'matched_weight' => 0.0,
                'total_weight' => 0.0,
                'missing_critical_skills' => [],
                'details' => [],
                'message' => 'No structured skill requirements were provided.',
            ];
        }

        $seekerSkills = $this->seekerSkills($seeker);
        $details = $requirements->map(function (array $requirement) use ($seekerSkills) {
            $matchedSkill = $this->matchedSeekerSkill($requirement, $seekerSkills);
            $baseFactor = (float) ($requirement['match_factor'] ?? 0);
            $adjustedFactor = $matchedSkill ? min(1.0, $baseFactor) : 0.0;
            $weight = (float) ($requirement['requirement_weight'] ?? 1.0);
            $gapReason = $this->skillGapReason($baseFactor, $adjustedFactor, $matchedSkill);

            return array_merge($requirement, [
                'adjusted_match_factor' => round($adjustedFactor, 3),
                'adjusted_weighted_score' => round($adjustedFactor * $weight, 3),
                'is_critical_gap' => $gapReason !== null,
                'gap_reason' => $gapReason,
            ]);
        });

        $adjustedWeight = (float) $details->sum('adjusted_weighted_score');
        $missingCriticalSkills = $details
            ->filter(fn (array $detail) => $detail['is_critical_gap'])
            ->map(fn (array $detail) => [
                'skill' => $detail['required_skill'],
                'reason' => $detail['gap_reason'],
                'matched_skill' => $detail['matched_skill'] ?? null,
                'required_match_factor' => self::CRITICAL_SKILL_THRESHOLD,
                'actual_match_factor' => $detail['adjusted_match_factor'],
            ])
            ->values()
            ->all();

        return [
            'score' => round(($adjustedWeight / $totalWeight) * 100, 2),
            'available' => true,
            'matched_weight' => round($adjustedWeight, 3),
            'total_weight' => round($totalWeight, 3),
            'matched_requirements' => $details->where('adjusted_match_factor', '>', 0)->count(),
            'total_requirements' => $requirements->count(),
            'missing_critical_skills' => $missingCriticalSkills,
            'details' => $details->values()->all(),
        ];
    }

    private function skillGapReason(float $baseFactor, float $adjustedFactor, ?SeekerSkill $matchedSkill): ?string
    {
        if (! $matchedSkill || $baseFactor <= 0) {
            return 'missing_skill';
        }

        if ($adjustedFactor < self::CRITICAL_SKILL_THRESHOLD) {
            return 'partial_skill_match';
        }

        return null;
    }

    private function matchedSeekerSkill(array $requirement, Collection $seekerSkills): ?SeekerSkill
    {
        $matchedSkillId = $requirement['matched_skill_id'] ?? null;
        if ($matchedSkillId) {
            $byId = $seekerSkills->first(
                fn (SeekerSkill $skill) => (int) $skill->skill_id === (int) $matchedSkillId
                    || (int) $skill->getKey() === (int) $matchedSkillId
            );

            if ($byId) {
                return $byId;
            }
        }

        $matchedName = $requirement['matched_skill'] ?? null;
        if (! $matchedName) {
            return null;
        }

        return $seekerSkills->first(
            fn (SeekerSkill $skill) => $this->normalizer->areDuplicates($skill->skill_name, $matchedName)
        );
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

    private function experienceScore(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        $requiredMonths = max(0, (int) ($vacancy->minimum_experience_months
            ?? $this->monthsForExperienceLevel($vacancy->experience_level)));

        if ($requiredMonths === 0) {
            return [
                'score' => 100.0,
                'available' => true,
                'required_months' => 0,
                'raw_relevant_months' => 0.0,
                'recency_adjusted_months' => 0.0,
                'details' => [],
                'match_type' => 'no_experience_required',
            ];
        }

        if (! Schema::hasTable('seeker_work_experiences')) {
            return [
                'score' => 0.0,
                'available' => false,
                'required_months' => $requiredMonths,
                'raw_relevant_months' => 0.0,
                'recency_adjusted_months' => 0.0,
                'details' => [],
                'match_type' => 'experience_data_unavailable',
            ];
        }

        $seeker->loadMissing('workExperiences.occupation');
        $vacancy->loadMissing('occupation');

        $details = $seeker->workExperiences
            ->map(fn (SeekerWorkExperience $experience) => $this->experienceContribution(
                $experience,
                $vacancy->occupation
            ))
            ->filter(fn (array $detail) => $detail['raw_relevant_months'] > 0)
            ->values();
        $adjustedMonths = (float) $details->sum('recency_adjusted_months');
        $rawMonths = (float) $details->sum('raw_relevant_months');

        return [
            'score' => round(min(100, ($adjustedMonths / $requiredMonths) * 100), 2),
            'available' => $seeker->workExperiences->isNotEmpty(),
            'required_months' => $requiredMonths,
            'raw_relevant_months' => round($rawMonths, 2),
            'recency_adjusted_months' => round($adjustedMonths, 2),
            'details' => $details->all(),
            'match_type' => $adjustedMonths >= $requiredMonths
                ? 'requirement_met_with_recency'
                : 'partial_experience_after_recency_decay',
        ];
    }

    private function experienceContribution(
        SeekerWorkExperience $experience,
        ?Occupation $vacancyOccupation
    ): array {
        $months = (float) ($experience->number_of_months ?? 0);
        $relevance = $this->experienceRelevanceFactor($experience, $vacancyOccupation);
        $rawRelevantMonths = $months * $relevance;
        $recencyMultiplier = $this->recencyMultiplier($experience);

        return [
            'experience_id' => $experience->getKey(),
            'position' => $experience->position,
            'months' => round($months, 2),
            'relevance_factor' => round($relevance, 2),
            'raw_relevant_months' => round($rawRelevantMonths, 2),
            'recency_multiplier' => $recencyMultiplier,
            'recency_bucket' => $this->recencyBucket($recencyMultiplier),
            'recency_adjusted_months' => round($rawRelevantMonths * $recencyMultiplier, 2),
        ];
    }

    private function experienceRelevanceFactor(
        SeekerWorkExperience $experience,
        ?Occupation $vacancyOccupation
    ): float {
        if (! $vacancyOccupation) {
            return 0.0;
        }

        if ($experience->occupation_id && $experience->occupation_id === $vacancyOccupation->id) {
            return 1.0;
        }

        if (
            filled($experience->occupation?->isco_group)
            && $experience->occupation->isco_group === $vacancyOccupation->isco_group
        ) {
            return 0.8;
        }

        $experienceCode = $this->digits(
            $experience->occupation?->classification_code
                ?: $experience->occupation?->psoc_code
        );
        $vacancyCode = $this->digits(
            $vacancyOccupation->classification_code
                ?: $vacancyOccupation->psoc_code
        );

        if (
            strlen($experienceCode) >= 3
            && substr($experienceCode, 0, 3) === substr($vacancyCode, 0, 3)
        ) {
            return 0.65;
        }

        $position = $experience->normalized_position
            ?: $this->profiles->normalize((string) $experience->position);

        return $position === $this->profiles->normalize($vacancyOccupation->title) ? 0.9 : 0.0;
    }

    private function recencyMultiplier(SeekerWorkExperience $experience): float
    {
        $endDate = $this->experienceEndDate($experience);
        if (! $endDate) {
            return 1.0;
        }

        $yearsAgo = $endDate->diffInYears(now());

        return match (true) {
            $yearsAgo <= 2 => 1.0,
            $yearsAgo <= 5 => 0.8,
            default => 0.5,
        };
    }

    private function recencyBucket(float $multiplier): string
    {
        return match ($multiplier) {
            1.0 => 'current_or_within_2_years',
            0.8 => 'ended_3_to_5_years_ago',
            default => 'ended_more_than_5_years_ago',
        };
    }

    private function experienceEndDate(SeekerWorkExperience $experience): ?CarbonInterface
    {
        foreach (['end_date', 'date_ended', 'to_date'] as $column) {
            if (! Schema::hasColumn('seeker_work_experiences', $column)) {
                continue;
            }

            $value = $experience->{$column};
            if (! $value) {
                continue;
            }

            return $value instanceof CarbonInterface ? $value : rescue(
                fn () => \Carbon\Carbon::parse($value),
                report: false
            );
        }

        return null;
    }

    private function factor(float $score, int $weight, bool $available, array $details): array
    {
        return [
            'score' => round($score, 2),
            'weight' => $weight,
            'weighted_score' => round(($score / 100) * $weight, 2),
            'available' => $available,
            'details' => $details,
        ];
    }

    private function confidence(int $profileCoverage, float $skillsScore, bool $hasExperience): string
    {
        $confidenceScore = ($profileCoverage * 0.45)
            + ($skillsScore * 0.4)
            + ($hasExperience ? 15 : 0);

        return match (true) {
            $confidenceScore >= 85 => 'high',
            $confidenceScore >= 65 => 'medium',
            $confidenceScore >= 45 => 'low',
            default => 'very_low',
        };
    }

    private function getRecommendationsForGaps(array $skillGaps): array
    {
        if (! ($skillGaps['has_gaps'] ?? false) || empty($skillGaps['gaps'])) {
            return [];
        }

        return collect($skillGaps['gaps'])
            ->take(3)
            ->map(fn (string $gapSkill) => [
                'skill' => $gapSkill,
                'learning_resources' => $this->recommendations->getLearningResources($gapSkill),
                'estimated_time' => '3-6 months',
            ])
            ->values()
            ->all();
    }

    private function monthsForExperienceLevel(?string $level): int
    {
        return match ($level) {
            '1-3 Years' => 12,
            '3-5 Years' => 36,
            '5+ Years' => 60,
            default => 0,
        };
    }

    private function digits(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value) ?? '';
    }
}
