<?php

namespace App\Services;

use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use Illuminate\Support\Carbon;

/**
 * Compares a job seeker's profile against a government program's typed
 * eligibility rules (stored in government_programs.eligibility_rules) and
 * returns a score, status and per-rule breakdown for the "why".
 *
 * Rule shape (one object per requirement):
 *   { field, op, [min,max|value|values], label, weight=1, required=false }
 *
 * Scoring:
 *   - Any failed `required` rule  => status "not_eligible" (regardless of score).
 *   - score = round( sum(weight of met rules) / sum(all weights) * 100 ).
 *   - 100 => highly_eligible, 60-99 => partially_eligible, <60 => low_match.
 */
class EligibilityMatchingService
{
    /**
     * Education attainment ordering (low -> high). Matches the human-readable
     * labels stored in job_seekers.educ_attainment across the app.
     */
    private const EDUCATION_RANK = [
        'elementary undergraduate' => 1,
        'elementary graduate' => 2,
        'high school undergraduate' => 3,
        'high school graduate' => 4,
        'senior high school graduate' => 5,
        'senior high graduate' => 5,
        'vocational / technical' => 6,
        'tvet/vocational graduate' => 6,
        'vocational' => 6,
        'college undergraduate' => 7,
        'college graduate' => 8,
        'post-graduate' => 9,
        "master's degree" => 9,
        'doctorate' => 10,
    ];

    /**
     * @return array{score:int,status:string,label:string,breakdown:array<int,array{label:string,met:bool,required:bool,detail:?string}>}
     */
    public function evaluate(?JobSeeker $seeker, GovernmentProgram $program): array
    {
        $rules = is_array($program->eligibility_rules) ? $program->eligibility_rules : [];

        // No rules defined => open to everyone.
        if (empty($rules)) {
            return ['score' => 100, 'status' => 'eligible', 'label' => 'Eligible', 'breakdown' => []];
        }

        // No seeker (e.g. public/preview) => can't evaluate.
        if (! $seeker) {
            return ['score' => 0, 'status' => 'unknown', 'label' => 'Sign in to check eligibility', 'breakdown' => []];
        }

        $totalWeight = 0.0;
        $metWeight = 0.0;
        $requiredFailed = false;
        $breakdown = [];

        foreach ($rules as $rule) {
            if (! is_array($rule) || empty($rule['field'])) {
                continue;
            }
            $weight = (float) ($rule['weight'] ?? 1);
            $totalWeight += $weight;

            [$met, $detail] = $this->checkRule($seeker, $rule);
            if ($met) {
                $metWeight += $weight;
            } elseif ($rule['required'] ?? false) {
                $requiredFailed = true;
            }

            $breakdown[] = [
                'label' => (string) ($rule['label'] ?? $this->humanizeField($rule['field'])),
                'met' => $met,
                'required' => (bool) ($rule['required'] ?? false),
                'detail' => $detail,
            ];
        }

        $score = $totalWeight > 0 ? (int) round(($metWeight / $totalWeight) * 100) : 100;

        if ($requiredFailed) {
            return ['score' => $score, 'status' => 'not_eligible', 'label' => 'Not Eligible', 'breakdown' => $breakdown];
        }

        if ($score >= 100) {
            [$status, $label] = ['highly_eligible', 'Highly Eligible'];
        } elseif ($score >= 60) {
            [$status, $label] = ['partially_eligible', 'Partially Eligible'];
        } else {
            [$status, $label] = ['low_match', 'Low Match'];
        }

        return compact('score', 'status', 'label', 'breakdown');
    }

    /**
     * @return array{0:bool,1:?string} [met, human-readable detail]
     */
    private function checkRule(JobSeeker $seeker, array $rule): array
    {
        switch ($rule['field']) {
            case 'age':
                $age = $seeker->date_of_birth ? Carbon::parse($seeker->date_of_birth)->age : null;
                if ($age === null) {
                    return [false, 'No birth date on your profile'];
                }
                $min = (int) ($rule['min'] ?? 0);
                $max = (int) ($rule['max'] ?? 200);
                return [$age >= $min && $age <= $max, "Your age: {$age}"];

            case 'employment_status':
                $values = array_map('strval', $rule['values'] ?? []);
                return [
                    in_array((string) $seeker->employment_status, $values, true),
                    'Your status: '.($seeker->employment_status ?: 'not set'),
                ];

            case 'educ_attainment':
                $have = $this->educationRank($seeker->educ_attainment);
                $need = $this->educationRank($rule['value'] ?? '');
                return [$have >= $need && $have > 0, 'Your attainment: '.($seeker->educ_attainment ?: 'not set')];

            case 'is_4ps_beneficiary':
                $want = (bool) ($rule['value'] ?? true);
                return [(bool) $seeker->is_4ps_beneficiary === $want, $seeker->is_4ps_beneficiary ? '4Ps member' : 'Not a 4Ps member'];

            case 'is_ofw':
                $want = (bool) ($rule['value'] ?? true);
                $isOfw = (bool) ($seeker->is_ofw || $seeker->is_former_ofw);
                return [$isOfw === $want, $isOfw ? 'OFW / former OFW' : 'Not an OFW'];

            case 'sex':
                return [(string) $seeker->sex === (string) ($rule['value'] ?? ''), 'Sex: '.($seeker->sex ?: 'not set')];

            case 'civil_status':
                $values = array_map('strval', $rule['values'] ?? []);
                return [in_array((string) $seeker->civil_status, $values, true), 'Civil status: '.($seeker->civil_status ?: 'not set')];

            case 'residency':
                $city = (string) ($rule['value'] ?? '');
                return [
                    strcasecmp((string) $seeker->address_municipality_city, $city) === 0,
                    'Your city/municipality: '.($seeker->address_municipality_city ?: 'not set'),
                ];

            default:
                return [false, null];
        }
    }

    private function educationRank(?string $attainment): int
    {
        $key = strtolower(trim((string) $attainment));
        return self::EDUCATION_RANK[$key] ?? 0;
    }

    private function humanizeField(string $field): string
    {
        return ucfirst(str_replace('_', ' ', $field));
    }
}
