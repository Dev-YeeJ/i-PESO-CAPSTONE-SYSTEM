<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;

/**
 * EnhancedJobMatchingService
 * Extends JobMatchingService with:
 * - Soft skills scoring
 * - Proficiency level consideration
 * - Skill gap analysis
 * - Better confidence scoring
 */
class EnhancedJobMatchingService
{
    public function __construct(
        private readonly JobMatchingService $baseMatching,
        private readonly SkillNormalizationService $normalizer,
        private readonly SkillRecommendationService $recommendations,
        private readonly MatchingProfileService $profiles
    ) {}

    /**
     * Enhanced score with soft skills and proficiency consideration
     */
    public function enhancedScore(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        // Get base score from standard service
        $baseScore = $this->baseMatching->score($vacancy, $seeker);

        // Add soft skills scoring
        $softSkillsScore = $this->scoreSeekersoftSkills($vacancy, $seeker);
        
        // Add proficiency level bonus
        $proficiencyBonus = $this->calculateProficiencyBonus($vacancy, $seeker);

        // Analyze skill gaps
        $skillGaps = $this->analyzeSkillGaps($vacancy, $seeker);

        // Calculate adjusted percentage with soft skills
        $enhancedPercentage = round(
            ($baseScore['percentage'] * 0.8) + // 80% from hard factors
            ($softSkillsScore * 0.15) + // 15% from soft skills
            ($proficiencyBonus * 0.05), // 5% from proficiency
            2
        );

        return array_merge($baseScore, [
            'enhanced_percentage' => $enhancedPercentage,
            'soft_skills_score' => $softSkillsScore,
            'proficiency_bonus' => $proficiencyBonus,
            'skill_gaps' => $skillGaps,
            'recommendations' => $this->getRecommendationsForGaps($skillGaps),
            'confidence' => $this->calculateConfidence($seeker, $baseScore, $skillGaps),
        ]);
    }

    /**
     * Score seeker's soft skills against vacancy requirements
     */
    private function scoreSeekersoftSkills(JobVacancy $vacancy, JobSeeker $seeker): float
    {
        // Common soft skills required in most jobs
        $vacancyDescription = Str::lower(
            ($vacancy->description ?? '') . ' ' . ($vacancy->title ?? '')
        );

        $softSkillKeywords = [
            'communication' => ['communication', 'speaking', 'presentation', 'articulate'],
            'teamwork' => ['team', 'collaboration', 'collaborative', 'cooperation'],
            'leadership' => ['lead', 'leadership', 'manage', 'mentor'],
            'problem_solving' => ['problem', 'solving', 'analytical', 'creative'],
            'adaptability' => ['adapt', 'flexible', 'change', 'dynamic'],
            'time_management' => ['deadline', 'organized', 'efficient', 'productivity'],
        ];

        $seekerSoftSkills = $seeker->seekerSkills
            ->where('skill_type', 'soft')
            ->pluck('skill_name')
            ->map(fn ($skill) => Str::lower($skill))
            ->toArray();

        $matchedSkills = 0;
        $totalRequired = 0;

        foreach ($softSkillKeywords as $skillName => $keywords) {
            // Check if vacancy requires this skill
            $vacancyRequires = false;
            foreach ($keywords as $keyword) {
                if (Str::contains($vacancyDescription, $keyword)) {
                    $vacancyRequires = true;
                    break;
                }
            }

            if ($vacancyRequires) {
                $totalRequired++;
                
                // Check if seeker has this skill
                foreach ($seekerSoftSkills as $seekerSkill) {
                    if ($this->normalizer->areDuplicates($skillName, $seekerSkill)) {
                        $matchedSkills++;
                        break;
                    }
                }
            }
        }

        return $totalRequired > 0 ? round(($matchedSkills / $totalRequired) * 100, 2) : 50;
    }

    /**
     * Calculate bonus based on proficiency levels of matched skills
     */
    private function calculateProficiencyBonus(JobVacancy $vacancy, JobSeeker $seeker): float
    {
        if (!\Schema::hasTable('seeker_skills') || !Schema::hasColumn('seeker_skills', 'proficiency')) {
            return 0;
        }

        // Get matched skills with their proficiency
        $matchedSkills = $seeker->seekerSkills()
            ->whereNotNull('proficiency')
            ->get();

        if ($matchedSkills->isEmpty()) {
            return 0;
        }

        // Weight proficiency levels
        $proficiencyWeights = [
            'beginner' => 0.25,
            'intermediate' => 0.5,
            'advanced' => 0.75,
            'expert' => 1.0,
        ];

        $totalProficiency = $matchedSkills->sum(
            fn ($skill) => $proficiencyWeights[$skill->proficiency] ?? 0.5
        );

        $averageProficiency = $totalProficiency / $matchedSkills->count();

        // Convert to 0-100 scale
        return round($averageProficiency * 100, 2);
    }

    /**
     * Analyze skill gaps between vacancy requirements and seeker skills
     */
    private function analyzeSkillGaps(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        // Get required skills from vacancy
        $requiredSkills = $vacancy->skillRequirements
            ->pluck('skill.name')
            ->filter()
            ->toArray();

        if (empty($requiredSkills)) {
            return [
                'has_gaps' => false,
                'gaps' => [],
                'coverage_percentage' => 100,
            ];
        }

        $gaps = $this->recommendations->getSkillGaps($seeker, $requiredSkills);

        return [
            'has_gaps' => !empty($gaps['gaps']),
            'gaps' => $gaps['gaps'],
            'covered_skills' => $gaps['covered'],
            'coverage_percentage' => $gaps['coverage_percentage'],
            'gap_count' => count($gaps['gaps']),
        ];
    }

    /**
     * Get recommendations to fill skill gaps
     */
    private function getRecommendationsForGaps(array $skillGaps): array
    {
        if (!$skillGaps['has_gaps'] || empty($skillGaps['gaps'])) {
            return [];
        }

        $recommendations = [];
        foreach (array_slice($skillGaps['gaps'], 0, 3) as $gapSkill) {
            $resources = $this->recommendations->getLearningResources($gapSkill);
            $recommendations[] = [
                'skill' => $gapSkill,
                'learning_resources' => $resources,
                'estimated_time' => '3-6 months',
            ];
        }

        return $recommendations;
    }

    /**
     * Calculate improved confidence score
     */
    private function calculateConfidence(JobSeeker $seeker, array $baseScore, array $skillGaps): string
    {
        $profileCompletion = (int) round(($baseScore['profile_coverage'] / 100) * 100);
        $skillCoverage = $skillGaps['coverage_percentage'] ?? 0;
        $hasExperience = $seeker->workExperiences->isNotEmpty();
        $hasEducation = $seeker->educations->isNotEmpty() || filled($seeker->educ_attainment);

        // Score out of 100
        $confidenceScore = 0;
        $confidenceScore += $profileCompletion * 0.3; // 30% profile completion
        $confidenceScore += $skillCoverage * 0.4; // 40% skill matching
        $confidenceScore += ($hasExperience ? 20 : 0); // 20% if has experience
        $confidenceScore += ($hasEducation ? 10 : 0); // 10% if has education

        return match (true) {
            $confidenceScore >= 80 => 'high',
            $confidenceScore >= 60 => 'medium',
            $confidenceScore >= 40 => 'low',
            default => 'very_low',
        };
    }

    /**
     * Get actionable feedback for seeker
     */
    public function getActionableFeedback(JobVacancy $vacancy, JobSeeker $seeker): array
    {
        $enhancedScore = $this->enhancedScore($vacancy, $seeker);
        $feedback = [];

        // Feedback on overall match
        if ($enhancedScore['enhanced_percentage'] >= 80) {
            $feedback[] = [
                'type' => 'positive',
                'message' => 'You\'re an excellent match for this position!',
            ];
        } elseif ($enhancedScore['enhanced_percentage'] >= 60) {
            $feedback[] = [
                'type' => 'positive',
                'message' => 'You meet most requirements. Consider addressing the gaps below.',
            ];
        } else {
            $feedback[] = [
                'type' => 'warning',
                'message' => 'There are significant skill gaps. Focus on developing key skills.',
            ];
        }

        // Feedback on skill gaps
        if ($enhancedScore['skill_gaps']['has_gaps']) {
            $gaps = $enhancedScore['skill_gaps']['gaps'];
            $gapText = count($gaps) === 1 
                ? reset($gaps) 
                : count($gaps) . ' skills (' . implode(', ', array_slice($gaps, 0, 2)) . '...)';

            $feedback[] = [
                'type' => 'gap',
                'message' => 'Missing: ' . $gapText,
                'recommendations' => $enhancedScore['recommendations'],
            ];
        }

        // Feedback on proficiency
        if ($enhancedScore['proficiency_bonus'] > 0 && $enhancedScore['proficiency_bonus'] < 50) {
            $feedback[] = [
                'type' => 'suggestion',
                'message' => 'Improve your proficiency levels by gaining more hands-on experience with your skills.',
            ];
        }

        // Soft skills feedback
        if ($enhancedScore['soft_skills_score'] < 60) {
            $feedback[] = [
                'type' => 'suggestion',
                'message' => 'Add soft skills to your profile to better match employer expectations.',
            ];
        }

        return [
            'score' => $enhancedScore['enhanced_percentage'],
            'confidence' => $enhancedScore['confidence'],
            'feedback' => $feedback,
        ];
    }
}
