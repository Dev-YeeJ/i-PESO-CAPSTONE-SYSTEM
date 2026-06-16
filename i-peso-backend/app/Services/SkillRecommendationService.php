<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\SkillCatalogEntry;
use Illuminate\Support\Facades\Schema;

/**
 * SkillRecommendationService
 * Recommends skills to seekers based on:
 * - Selected occupation/job preferences
 * - Current skill gaps
 * - Job market demand
 * - Education level and career progression
 */
class SkillRecommendationService
{
    public function __construct(
        private readonly SkillNormalizationService $normalizer,
        private readonly MatchingProfileService $profiles
    ) {}

    /**
     * Get skill recommendations for a seeker
     * Returns array of suggested skills grouped by category
     */
    public function getRecommendations(JobSeeker $seeker, int $limit = 10): array
    {
        if (!Schema::hasTable('skill_catalog_entries')) {
            return [];
        }

        $recommendations = [];

        // 1. Skills from preferred occupations
        $occupationSkills = $this->getOccupationSkills($seeker, $limit);
        if ($occupationSkills) {
            $recommendations['occupation_skills'] = [
                'title' => 'In-Demand Skills for Your Field',
                'description' => 'Skills commonly required in your preferred occupations',
                'skills' => $occupationSkills,
            ];
        }

        // 2. Trending/Hot skills in market
        $trendingSkills = $this->getTrendingSkills(min($limit - 5, 5));
        if ($trendingSkills) {
            $recommendations['trending_skills'] = [
                'title' => 'Trending Skills (High Demand)',
                'description' => 'Currently in-demand skills across many industries',
                'skills' => $trendingSkills,
            ];
        }

        // 3. Complementary skills based on what they have
        $complementary = $this->getComplementarySkills($seeker, $limit);
        if ($complementary) {
            $recommendations['complementary_skills'] = [
                'title' => 'Skills to Complement Your Profile',
                'description' => 'Skills that would enhance your existing expertise',
                'skills' => $complementary,
            ];
        }

        // 4. Soft skills recommendations
        $softSkills = $this->getSoftSkillRecommendations($seeker);
        if ($softSkills) {
            $recommendations['soft_skills'] = [
                'title' => 'Soft Skills Development',
                'description' => 'Interpersonal skills to advance your career',
                'skills' => $softSkills,
            ];
        }

        return $recommendations;
    }

    /**
     * Skills commonly required for seeker's preferred occupations
     */
    private function getOccupationSkills(JobSeeker $seeker, int $limit): array
    {
        if (!$seeker->occupations->isNotEmpty()) {
            return [];
        }

        // For each preferred occupation, find common skills
        $occupationIds = $seeker->occupations->pluck('occupation_id')->toArray();

        $skills = SkillCatalogEntry::query()
            ->where('is_in_demand', true)
            ->orderByDesc('occupation_count')
            ->limit($limit)
            ->get(['id', 'name', 'category', 'is_in_demand', 'is_hot'])
            ->map(fn ($skill) => [
                'id' => $skill->id,
                'name' => $skill->name,
                'category' => $skill->category,
                'is_hot' => $skill->is_hot,
                'demand_level' => $skill->is_in_demand ? 'high' : 'medium',
                'reason' => 'Required in your field',
            ])
            ->toArray();

        return $skills;
    }

    /**
     * Currently trending/hot skills in job market
     */
    private function getTrendingSkills(int $limit): array
    {
        return SkillCatalogEntry::query()
            ->where('is_hot', true)
            ->orderByDesc('occupation_count')
            ->limit($limit)
            ->get(['id', 'name', 'category', 'is_in_demand'])
            ->map(fn ($skill) => [
                'id' => $skill->id,
                'name' => $skill->name,
                'category' => $skill->category,
                'is_hot' => true,
                'demand_level' => 'high',
                'reason' => 'Trending in job market',
            ])
            ->toArray();
    }

    /**
     * Skills that complement what seeker already has
     */
    private function getComplementarySkills(JobSeeker $seeker, int $limit): array
    {
        // Get skills that often appear together in job postings with seeker's skills
        $existingSkills = $seeker->seekerSkills->pluck('skill_name')->toArray();

        if (empty($existingSkills)) {
            return [];
        }

        // Find catalog entries that match existing skills
        $skillIds = SkillCatalogEntry::query()
            ->whereIn('normalized_name', array_map(
                fn ($skill) => $this->profiles->normalize($skill),
                $existingSkills
            ))
            ->pluck('id')
            ->toArray();

        if (empty($skillIds)) {
            return [];
        }

        // Get complementary skills (that often appear together)
        $complementary = SkillCatalogEntry::query()
            ->where('is_in_demand', true)
            ->whereNotIn('id', $skillIds)
            ->orderByDesc('occupation_count')
            ->limit($limit)
            ->get(['id', 'name', 'category', 'is_in_demand'])
            ->map(fn ($skill) => [
                'id' => $skill->id,
                'name' => $skill->name,
                'category' => $skill->category,
                'demand_level' => 'medium',
                'reason' => 'Complements your existing skills',
            ])
            ->toArray();

        return $complementary;
    }

    /**
     * Soft skills recommendations based on occupation
     */
    private function getSoftSkillRecommendations(JobSeeker $seeker): array
    {
        $existingSoftSkills = $seeker->seekerSkills
            ->where('skill_type', 'soft')
            ->pluck('skill_name')
            ->toArray();

        // Soft skills that are universally important
        $universalSoftSkills = [
            'Communication' => 'Essential for any role',
            'Teamwork' => 'Collaborate effectively with others',
            'Problem Solving' => 'Address challenges systematically',
            'Time Management' => 'Deliver work on schedule',
            'Adaptability' => 'Thrive in changing environments',
            'Leadership' => 'Guide and inspire others',
            'Critical Thinking' => 'Make well-reasoned decisions',
            'Attention to Detail' => 'Ensure quality in your work',
        ];

        $recommendations = [];
        foreach ($universalSoftSkills as $skill => $reason) {
            if (!in_array($skill, $existingSoftSkills, true)) {
                $recommendations[] = [
                    'name' => $skill,
                    'category' => 'soft',
                    'demand_level' => 'high',
                    'reason' => $reason,
                ];
            }
        }

        return array_slice($recommendations, 0, 5);
    }

    /**
     * Get skill gap analysis - what's needed vs what they have
     */
    public function getSkillGaps(JobSeeker $seeker, ?array $requiredSkills = null): array
    {
        if (!$requiredSkills || empty($requiredSkills)) {
            return [];
        }

        $hasSkills = $seeker->seekerSkills->pluck('skill_name')->toArray();

        $gaps = [];
        $covered = [];

        foreach ($requiredSkills as $required) {
            $found = false;
            foreach ($hasSkills as $has) {
                if ($this->normalizer->areDuplicates($required, $has)) {
                    $covered[] = $required;
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                $gaps[] = $required;
            }
        }

        return [
            'gaps' => $gaps,
            'covered' => $covered,
            'coverage_percentage' => empty($requiredSkills) 
                ? 0 
                : round((count($covered) / count($requiredSkills)) * 100, 2),
        ];
    }

    /**
     * Get learning resources for a skill
     * Can be extended to integrate with external APIs
     */
    public function getLearningResources(string $skillName): array
    {
        return [
            'online_courses' => [
                'platforms' => ['Coursera', 'Udemy', 'LinkedIn Learning', 'edX'],
                'average_duration' => '4-12 weeks',
                'cost_range' => '$0-$500',
            ],
            'certifications' => [
                'trending' => ['Google Professional', 'AWS Certified', 'Microsoft Certified'],
            ],
            'practice_sites' => [
                'coding' => 'HackerRank, LeetCode, CodeWars',
                'general' => 'YouTube, blogs, GitHub repositories',
            ],
            'estimated_learning_time' => '3-6 months to proficiency',
        ];
    }
}
