<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * SkillNormalizationService
 * Handles skill name normalization, deduplication, and validation
 */
class SkillNormalizationService
{
    /**
     * Normalize a skill name for consistent matching and deduplication
     * - Converts to lowercase
     * - Removes special characters
     * - Normalizes spaces
     * - Expands common abbreviations
     */
    public function normalize(string $skillName): string
    {
        $normalized = Str::lower(trim($skillName));
        
        // Expand common abbreviations
        $abbreviations = [
            '/\bjs\b/' => 'javascript',
            '/\bc\+\+\b/' => 'c plus plus',
            '/\bc#\b/' => 'c sharp',
            '/\bui\/ux\b/' => 'user interface user experience',
            '/\bqa\b/' => 'quality assurance',
            '/\bhr\b/' => 'human resources',
            '/\buiux\b/' => 'user interface user experience',
            '/\bseo\b/' => 'search engine optimization',
            '/\bsem\b/' => 'search engine marketing',
            '/\bcms\b/' => 'content management system',
            '/\bapi\b/' => 'application programming interface',
            '/\brest\b/' => 'representational state transfer',
            '/\bsql\b/' => 'structured query language',
            '/\bnosql\b/' => 'nosql database',
            '/\br\&d\b/' => 'research and development',
        ];

        foreach ($abbreviations as $pattern => $replacement) {
            $normalized = preg_replace($pattern, $replacement, $normalized);
        }

        // Remove special characters, keep only alphanumeric and spaces
        $normalized = preg_replace('/[^a-z0-9\s]/', ' ', $normalized);
        
        // Normalize multiple spaces to single space
        $normalized = preg_replace('/\s+/', ' ', trim($normalized));

        return $normalized;
    }

    /**
     * Check if two skills are likely duplicates based on normalized names
     */
    public function areDuplicates(string $skill1, string $skill2): bool
    {
        $norm1 = $this->normalize($skill1);
        $norm2 = $this->normalize($skill2);

        if ($norm1 === $norm2) {
            return true;
        }

        // Check for Levenshtein distance (typos, minor variations)
        // If distance is less than 20% of the longer string, likely duplicate
        $distance = levenshtein($norm1, $norm2);
        $maxLength = max(strlen($norm1), strlen($norm2));

        return $distance < ($maxLength * 0.2);
    }

    /**
     * Deduplicate skills, keeping the longest/most specific name
     */
    public function deduplicate(array $skills): array
    {
        $normalized = [];
        $results = [];

        foreach ($skills as $skill) {
            $norm = $this->normalize($skill);
            
            // Check if we already have this (normalized)
            $found = false;
            foreach ($normalized as $key => $existingNorm) {
                if ($this->areDuplicates($skill, $results[$key])) {
                    // Keep the longer/more detailed version
                    if (strlen($skill) > strlen($results[$key])) {
                        $results[$key] = trim($skill);
                        $normalized[$key] = $norm;
                    }
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                $normalized[] = $norm;
                $results[] = trim($skill);
            }
        }

        return array_values($results);
    }

    /**
     * Get proficiency level from user input or infer from context
     */
    public function inferProficiency(string $skillName, ?int $yearsOfExperience = null): string
    {
        // Check if skill name contains proficiency indicators
        $lower = Str::lower($skillName);
        
        if (preg_match('/(expert|master|professional|fluent|native)/i', $lower)) {
            return 'expert';
        }

        if (preg_match('/(advanced|proficient|experienced)/i', $lower)) {
            return 'advanced';
        }

        if (preg_match('/(intermediate|competent|working|developing)/i', $lower)) {
            return 'intermediate';
        }

        if (preg_match('/(beginner|basic|learning|familar|novice)/i', $lower)) {
            return 'beginner';
        }

        // Infer from years of experience
        if ($yearsOfExperience !== null) {
            return match (true) {
                $yearsOfExperience >= 10 => 'expert',
                $yearsOfExperience >= 5 => 'advanced',
                $yearsOfExperience >= 2 => 'intermediate',
                default => 'beginner',
            };
        }

        // Default to intermediate
        return 'intermediate';
    }

    /**
     * Score a skill's relevance to job market (0-100)
     * This would typically be based on O*NET data or job market analysis
     */
    public function scoreRelevance(string $skillName): int
    {
        $normalized = $this->normalize($skillName);
        
        // High demand skills (market analysis based)
        $hotSkills = [
            'javascript', 'python', 'sql', 'cloud computing', 'artificial intelligence',
            'machine learning', 'data analysis', 'project management', 'agile', 'scrum',
            'aws', 'azure', 'docker', 'kubernetes', 'react', 'angular', 'vue',
            'node js', 'java', 'c plus plus', 'golang', 'rust',
            'communication', 'leadership', 'teamwork', 'problem solving', 'critical thinking',
            'time management', 'adaptability', 'negotiation', 'digital marketing', 'seo',
        ];

        $medium = [];
        $low = [];

        // Score based on demand
        foreach ($hotSkills as $hotSkill) {
            if ($this->areDuplicates($normalized, $hotSkill)) {
                return 90; // Top demand
            }
        }

        // Slightly less hot
        $warmSkills = [
            'excel', 'word', 'powerpoint', 'salesforce', 'asana', 'jira',
            'customer service', 'sales', 'attention to detail', 'organization',
        ];

        foreach ($warmSkills as $warmSkill) {
            if ($this->areDuplicates($normalized, $warmSkill)) {
                return 70;
            }
        }

        // Everything else is moderately relevant
        return 50;
    }
}
