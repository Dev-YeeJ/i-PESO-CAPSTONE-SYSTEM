<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\Occupation;
use App\Models\SeekerEducation;
use App\Models\SeekerOccupation;
use App\Models\SeekerWorkExperience;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class JobMatchingService
{
    private const WEIGHTS = [
        'occupation' => 35,
        'skills' => 40,
        'experience' => 15,
        'education' => 10,
    ];

    public function __construct(
        private readonly JobSkillMatchingService $skills,
        private readonly MatchingProfileService $profiles
    ) {}

    public function score(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        $this->loadMatchData($vacancy, $seeker);

        $occupation = $this->occupationScore($vacancy, $seeker);
        $skillMatch = $this->skills->score($vacancy, $seeker);
        $experience = $this->experienceScore($vacancy, $seeker);
        $education = $this->educationScore($vacancy, $seeker);
        $eligibility = $this->eligibility($vacancy, $seeker);
        $preferenceFit = $this->preferenceFit($vacancy, $seeker);

        $factors = [
            'occupation' => [
                'score' => $occupation['score'],
                'weight' => self::WEIGHTS['occupation'],
                'available' => $occupation['available'],
                'details' => $occupation['details'],
            ],
            'skills' => [
                'score' => $skillMatch['percentage'],
                'weight' => self::WEIGHTS['skills'],
                'available' => $skillMatch['total_requirements'] > 0,
                'details' => $skillMatch,
            ],
            'experience' => [
                'score' => $experience['score'],
                'weight' => self::WEIGHTS['experience'],
                'available' => $experience['available'],
                'details' => $experience['details'],
            ],
            'education' => [
                'score' => $education['score'],
                'weight' => self::WEIGHTS['education'],
                'available' => $education['available'],
                'details' => $education['details'],
            ],
        ];

        $percentage = collect($factors)->sum(
            fn (array $factor) => ($factor['score'] / 100) * $factor['weight']
        );
        $profileCoverage = collect($factors)->sum(
            fn (array $factor) => $factor['available'] ? $factor['weight'] : 0
        );

        return [
            'percentage' => round($percentage, 2),
            'eligible' => $eligibility['eligible'],
            'eligibility_reasons' => $eligibility['reasons'],
            'confidence' => match (true) {
                $profileCoverage >= 85 => 'high',
                $profileCoverage >= 60 => 'medium',
                default => 'low',
            },
            'profile_coverage' => $profileCoverage,
            'weights' => self::WEIGHTS,
            'factors' => $factors,
            'preference_fit' => $preferenceFit,
        ];
    }

    private function loadMatchData(JobVacancy $vacancy, JobSeeker $seeker): void
    {
        if (
            Schema::hasTable('occupations')
            && Schema::hasTable('seeker_occupations')
        ) {
            $vacancy->loadMissing('occupation');
            $seeker->loadMissing('occupations.occupation');

            if (Schema::hasTable('occupation_general_terms')) {
                $vacancy->loadMissing('occupation.generalTerms');
                $seeker->loadMissing('occupations.occupation.generalTerms');
            }
        }

        if (Schema::hasTable('seeker_work_experiences')) {
            $seeker->loadMissing('workExperiences.occupation');
        }

        if (Schema::hasTable('seeker_educations')) {
            $seeker->loadMissing('educations');
        }

        if (Schema::hasTable('seeker_eligibilities')) {
            $seeker->loadMissing('eligibilities');
        }

        if (Schema::hasTable('seeker_trainings')) {
            $seeker->loadMissing('trainings');
        }

        if (Schema::hasTable('job_vacancy_certifications')) {
            $vacancy->loadMissing('certificationRequirements');
        }
    }

    private function occupationScore(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        if (
            ! Schema::hasTable('seeker_occupations')
            || ! $vacancy->occupation
            || ! $seeker->relationLoaded('occupations')
        ) {
            return $this->unavailableFactor('No standardized occupation data available.');
        }

        $matches = $seeker->occupations
            ->map(fn (SeekerOccupation $preference) => $this->compareOccupation(
                $vacancy->occupation,
                $preference
            ))
            ->sortByDesc('score');
        $best = $matches->first();

        return [
            'score' => (float) ($best['score'] ?? 0),
            'available' => $seeker->occupations->isNotEmpty(),
            'details' => $best ?? [
                'match_type' => 'none',
                'message' => 'The vacancy is outside the seeker’s preferred occupations.',
            ],
        ];
    }

    private function compareOccupation(
        Occupation $vacancyOccupation,
        SeekerOccupation $preference
    ): array {
        $preferenceOrder = max(1, (int) $preference->preference_order);
        $preferenceFactor = match ($preferenceOrder) {
            1 => 1,
            2 => 0.95,
            default => 0.9,
        };
        $preferredOccupation = $preference->occupation;
        $score = 0;
        $matchType = 'none';

        if ($preferredOccupation?->id === $vacancyOccupation->id) {
            $score = 100;
            $matchType = 'exact_occupation';
        } elseif (
            filled($preferredOccupation?->isco_group)
            && $preferredOccupation->isco_group === $vacancyOccupation->isco_group
        ) {
            $score = 80;
            $matchType = 'same_isco_group';
        } elseif ($preferredOccupation) {
            $preferredCode = $this->digits($preferredOccupation->classification_code ?: $preferredOccupation->psoc_code);
            $vacancyCode = $this->digits($vacancyOccupation->classification_code ?: $vacancyOccupation->psoc_code);

            if (strlen($preferredCode) >= 3 && substr($preferredCode, 0, 3) === substr($vacancyCode, 0, 3)) {
                $score = 75;
                $matchType = 'same_occupation_subgroup';
            } elseif (strlen($preferredCode) >= 2 && substr($preferredCode, 0, 2) === substr($vacancyCode, 0, 2)) {
                $score = 60;
                $matchType = 'same_occupation_family';
            }
        }

        if ($score === 0 && filled($preference->general_term)) {
            $vacancyTerms = $vacancyOccupation->relationLoaded('generalTerms')
                ? $vacancyOccupation->generalTerms->pluck('normalized_term')
                : collect();

            if ($vacancyTerms->contains($preference->general_term)) {
                $score = 70;
                $matchType = 'preferred_job_family';
            }
        }

        return [
            'score' => round($score * $preferenceFactor, 2),
            'base_score' => $score,
            'match_type' => $matchType,
            'preference_order' => $preferenceOrder,
            'preferred_occupation' => $preference->occupation_title,
            'vacancy_occupation' => $vacancyOccupation->title,
        ];
    }

    private function experienceScore(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        $requiredMonths = max(
            0,
            (int) ($vacancy->minimum_experience_months
                ?? $this->monthsForExperienceLevel($vacancy->experience_level))
        );

        if ($requiredMonths === 0) {
            return [
                'score' => 100,
                'available' => true,
                'details' => [
                    'required_months' => 0,
                    'relevant_months' => 0,
                    'match_type' => 'no_experience_required',
                ],
            ];
        }

        if (
            ! Schema::hasTable('seeker_work_experiences')
            || ! $seeker->relationLoaded('workExperiences')
        ) {
            return $this->unavailableFactor('Work experience has not been structured.');
        }

        $relevantMonths = $seeker->workExperiences->sum(
            fn (SeekerWorkExperience $experience) => $this->relevantExperienceMonths(
                $experience,
                $vacancy->occupation
            )
        );

        return [
            'score' => round(min(100, ($relevantMonths / $requiredMonths) * 100), 2),
            'available' => $seeker->workExperiences->isNotEmpty(),
            'details' => [
                'required_months' => $requiredMonths,
                'relevant_months' => round($relevantMonths, 1),
                'match_type' => $relevantMonths >= $requiredMonths
                    ? 'requirement_met'
                    : 'partial_experience',
            ],
        ];
    }

    private function relevantExperienceMonths(
        SeekerWorkExperience $experience,
        ?Occupation $vacancyOccupation
    ): float {
        $months = (float) ($experience->number_of_months ?? 0);
        if ($months <= 0 || ! $vacancyOccupation) {
            return 0;
        }

        if ($experience->occupation_id === $vacancyOccupation->id) {
            return $months;
        }

        if (
            filled($experience->occupation?->isco_group)
            && $experience->occupation->isco_group === $vacancyOccupation->isco_group
        ) {
            return $months * 0.8;
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
            return $months * 0.65;
        }

        if (
            filled($experience->normalized_position)
            && $experience->normalized_position === $this->profiles->normalize($vacancyOccupation->title)
        ) {
            return $months * 0.9;
        }

        return 0;
    }

    private function educationScore(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        if (
            ! Schema::hasTable('seeker_educations')
            || ! $seeker->relationLoaded('educations')
        ) {
            return $this->unavailableFactor('Education history has not been structured.');
        }

        $educations = $seeker->educations;
        if ($educations->isEmpty()) {
            return [
                'score' => 0,
                'available' => false,
                'details' => ['match_type' => 'no_education_data'],
            ];
        }

        $requiredRank = $this->vacancyEducationRank($vacancy->minimum_education);
        $highestRank = (int) $educations->max(
            fn (SeekerEducation $education) => $this->seekerEducationRank($education)
        );
        $attainmentScore = $highestRank >= $requiredRank
            ? 100
            : round(($highestRank / max(1, $requiredRank)) * 70, 2);
        $targetCourses = collect($vacancy->target_courses ?? [])
            ->map(fn ($course) => $this->profiles->normalize((string) $course))
            ->filter();

        if ($targetCourses->isEmpty()) {
            return [
                'score' => $attainmentScore,
                'available' => true,
                'details' => [
                    'match_type' => $highestRank >= $requiredRank
                        ? 'education_requirement_met'
                        : 'below_education_requirement',
                    'required_rank' => $requiredRank,
                    'seeker_rank' => $highestRank,
                    'course_match' => null,
                ],
            ];
        }

        $seekerCourses = $educations
            ->map(fn (SeekerEducation $education) => $education->normalized_course_strand
                ?: $education->course_strand)
            ->filter()
            ->map(fn ($course) => $this->profiles->normalize((string) $course));
        $courseScore = $this->bestTextMatch($targetCourses, $seekerCourses);
        $score = $highestRank >= $requiredRank
            ? 70 + ($courseScore * 0.3)
            : min($attainmentScore, 50 + ($courseScore * 0.2));

        return [
            'score' => round($score, 2),
            'available' => true,
            'details' => [
                'match_type' => $courseScore >= 80
                    ? 'education_and_course_match'
                    : 'education_only_match',
                'required_rank' => $requiredRank,
                'seeker_rank' => $highestRank,
                'course_match' => round($courseScore, 2),
            ],
        ];
    }

    private function eligibility(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        $reasons = [];

        if ($vacancy->status !== 'active') {
            $reasons[] = 'Vacancy is not active.';
        }
        if ($vacancy->application_deadline?->endOfDay()->isPast()) {
            $reasons[] = 'Application deadline has passed.';
        }

        $requirements = $vacancy->relationLoaded('certificationRequirements')
            ? $vacancy->certificationRequirements
            : collect();

        if ($requirements->where('is_mandatory', true)->isNotEmpty()) {
            $seekerCertifications = $this->profiles->seekerCertificationNames($seeker);
            $missing = $requirements
                ->where('is_mandatory', true)
                ->reject(fn ($requirement) => $this->containsEquivalent(
                    $requirement->normalized_name,
                    $seekerCertifications
                ))
                ->pluck('name')
                ->values();

            if ($missing->isNotEmpty()) {
                $reasons[] = 'Missing mandatory certification: '.$missing->join(', ').'.';
            }
        }

        return [
            'eligible' => $reasons === [],
            'reasons' => $reasons,
        ];
    }

    private function preferenceFit(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        $workSetups = collect($seeker->preferred_work_setups ?? []);
        $employmentTypes = collect($seeker->preferred_employment_types ?? []);
        $locations = collect($seeker->preferred_locations_details ?? [])
            ->map(fn ($location) => $this->profiles->normalize((string) $location));

        $locationHaystack = $this->profiles->normalize(collect([
            $vacancy->barangay,
            $vacancy->city_municipality,
            $vacancy->province,
        ])->filter()->join(' '));

        return [
            'work_setup' => $workSetups->isEmpty()
                ? null
                : $workSetups->contains($vacancy->work_setup),
            'employment_type' => $employmentTypes->isEmpty()
                ? $this->legacyEmploymentPreferenceMatch(
                    $seeker->work_type_preference,
                    $vacancy->employment_type
                )
                : $employmentTypes->contains($vacancy->employment_type),
            'location' => $vacancy->work_setup === 'Remote'
                ? true
                : ($locations->isEmpty()
                    ? null
                    : $locations->contains(
                        fn (string $location) => Str::contains($locationHaystack, $location)
                            || Str::contains($location, $this->profiles->normalize((string) $vacancy->city_municipality))
                    )),
        ];
    }

    private function seekerEducationRank(SeekerEducation $education): int
    {
        return match ($education->level) {
            'elementary' => 1,
            'secondary_non_k12', 'secondary_k12', 'senior_high_strand' => 2,
            'tertiary' => $education->year_graduated ? 4 : 3,
            'graduate_studies' => $education->year_graduated ? 5 : 4,
            default => 0,
        };
    }

    private function vacancyEducationRank(?string $level): int
    {
        return match ($level) {
            'High School Graduate' => 2,
            'College Undergraduate', 'TVET/Vocational Graduate' => 3,
            'College Graduate' => 4,
            'Post-Graduate' => 5,
            default => 0,
        };
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

    private function bestTextMatch(Collection $required, Collection $provided): float
    {
        if ($provided->isEmpty()) {
            return 0;
        }

        return (float) $required->crossJoin($provided)
            ->map(function (array $pair) {
                [$expected, $actual] = $pair;
                if ($expected === $actual) {
                    return 100;
                }
                if (Str::contains($expected, $actual) || Str::contains($actual, $expected)) {
                    return 90;
                }

                $expectedTokens = collect(explode(' ', $expected))->filter();
                $actualTokens = collect(explode(' ', $actual))->filter();
                $overlap = $expectedTokens->intersect($actualTokens)->count();

                return $overlap === 0
                    ? 0
                    : ($overlap / max($expectedTokens->count(), $actualTokens->count())) * 100;
            })
            ->max();
    }

    private function containsEquivalent(string $required, Collection $provided): bool
    {
        return $provided->contains(
            fn (string $candidate) => $candidate === $required
                || Str::contains($candidate, $required)
                || Str::contains($required, $candidate)
        );
    }

    private function legacyEmploymentPreferenceMatch(?string $preference, ?string $employmentType): ?bool
    {
        if (! $preference || ! $employmentType) {
            return null;
        }

        return match ($preference) {
            'part_time' => in_array($employmentType, ['Part-Time', 'Freelance'], true),
            'full_time' => ! in_array($employmentType, ['Part-Time', 'Freelance'], true),
            default => null,
        };
    }

    private function digits(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value) ?? '';
    }

    private function unavailableFactor(string $message): array
    {
        return [
            'score' => 0,
            'available' => false,
            'details' => [
                'match_type' => 'unavailable',
                'message' => $message,
            ],
        ];
    }
}
