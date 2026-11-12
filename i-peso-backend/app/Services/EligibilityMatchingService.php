<?php

namespace App\Services;

use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use Illuminate\Support\Carbon;

/**
 * Compares a job seeker's profile against the category-generated eligibility
 * rules stored in government_programs.eligibility_rules and returns an
 * equally weighted score, status and per-rule breakdown.
 *
 * Rule shape (one object per requirement):
 *   { field, op, [min,max|value|values], label, required=false }
 *
 * Scoring uses only rules with known profile values. Missing profile data is
 * reported as incomplete, never treated as proof that a seeker fails a rule.
 * A known failure of a required rule still marks the seeker not eligible.
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
     * @return array{score:?int,status:string,label:string,breakdown:array<int,array{label:string,met:bool,known:bool,required:bool,detail:?string}>,coverage:int,evaluated_rules:int,total_rules:int}
     */
    public function evaluate(?JobSeeker $seeker, GovernmentProgram $program): array
    {
        $rules = is_array($program->eligibility_rules) ? $program->eligibility_rules : [];

        // No rules defined => open to everyone.
        if (empty($rules)) {
            return ['score' => 100, 'status' => 'eligible', 'label' => 'Eligible', 'breakdown' => [], 'coverage' => 100, 'evaluated_rules' => 0, 'total_rules' => 0];
        }

        // No seeker (e.g. public/preview) => can't evaluate.
        if (! $seeker) {
            return ['score' => null, 'status' => 'unknown', 'label' => 'Sign in to check eligibility', 'breakdown' => [], 'coverage' => 0, 'evaluated_rules' => 0, 'total_rules' => count($rules)];
        }

        $metRules = 0;
        $requiredFailed = false;
        $unknownRules = 0;
        $evaluatedRules = 0;
        $breakdown = [];

        foreach ($rules as $rule) {
            if (! is_array($rule) || empty($rule['field'])) {
                continue;
            }
            [$met, $detail] = $this->checkRule($seeker, $rule);
            if ($met === null) {
                $unknownRules++;
            } else {
                $evaluatedRules++;
            }
            if ($met === true) {
                $metRules++;
            } elseif ($met === false && ($rule['required'] ?? false)) {
                $requiredFailed = true;
            }

            $breakdown[] = [
                'label' => (string) ($rule['label'] ?? $this->humanizeField($rule['field'])),
                'met' => $met === true,
                'known' => $met !== null,
                'required' => (bool) ($rule['required'] ?? false),
                'detail' => $detail,
            ];
        }

        $score = $evaluatedRules > 0 ? (int) round(($metRules / $evaluatedRules) * 100) : null;
        $coverage = (int) round(($evaluatedRules / max(1, count($breakdown))) * 100);

        if ($requiredFailed) {
            return [
                'score' => $score,
                'breakdown' => $breakdown,
                'coverage' => $coverage,
                'status' => 'not_eligible',
                'label' => 'Not Eligible',
                'evaluated_rules' => $evaluatedRules,
                'total_rules' => count($breakdown),
            ];
        }

        if ($unknownRules > 0) {
            return [
                'score' => $score,
                'status' => 'profile_incomplete',
                'label' => 'Update your profile to check eligibility',
                'breakdown' => $breakdown,
                'coverage' => $coverage,
                'evaluated_rules' => $evaluatedRules,
                'total_rules' => count($breakdown),
            ];
        }

        if ($score === null) {
            $score = 100;
        }

        if ($score >= 100) {
            [$status, $label] = ['highly_eligible', 'Highly Eligible'];
        } elseif ($score >= 60) {
            [$status, $label] = ['partially_eligible', 'Partially Eligible'];
        } else {
            [$status, $label] = ['low_match', 'Low Match'];
        }

        return [
            'score' => $score,
            'status' => $status,
            'label' => $label,
            'breakdown' => $breakdown,
            'coverage' => $coverage,
            'evaluated_rules' => $evaluatedRules,
            'total_rules' => count($breakdown),
        ];
    }

    /**
     * @return array{0:?bool,1:?string} [met, null when profile data is missing]
     */
    private function checkRule(JobSeeker $seeker, array $rule): array
    {
        switch ($rule['field']) {
            case 'age':
                $age = $seeker->date_of_birth ? Carbon::parse($seeker->date_of_birth)->age : null;
                if ($age === null) {
                    return [null, 'Add your birth date to your profile'];
                }
                $min = (int) ($rule['min'] ?? 0);
                $max = (int) ($rule['max'] ?? 200);
                return [$age >= $min && $age <= $max, "Your age: {$age}"];

            case 'employment_status':
                if (blank($seeker->employment_status)) {
                    return [null, 'Add your employment status to your profile'];
                }
                $values = array_map(fn ($value) => mb_strtolower(trim((string) $value)), $rule['values'] ?? []);
                return [
                    in_array(mb_strtolower(trim((string) $seeker->employment_status)), $values, true),
                    'Your status: '.($seeker->employment_status ?: 'not set'),
                ];

            case 'educ_attainment':
                $have = $this->educationRank($seeker->educ_attainment);
                $need = $this->educationRank($rule['value'] ?? '');
                if ($have === 0 || $need === 0) {
                    return [null, 'Add your highest educational attainment to your profile'];
                }
                return [$have >= $need && $have > 0, 'Your attainment: '.($seeker->educ_attainment ?: 'not set')];

            case 'is_4ps_beneficiary':
                if ($seeker->is_4ps_beneficiary === null
                    || (! (bool) $seeker->is_4ps_beneficiary && ! $seeker->profile_completed)) {
                    return [null, 'Complete your profile to confirm your 4Ps status'];
                }
                $want = (bool) ($rule['value'] ?? true);
                return [(bool) $seeker->is_4ps_beneficiary === $want, $seeker->is_4ps_beneficiary ? '4Ps member' : 'Not a 4Ps member'];

            case 'is_ofw':
                if (($seeker->is_ofw === null && $seeker->is_former_ofw === null)
                    || (! (bool) $seeker->is_ofw && ! (bool) $seeker->is_former_ofw && ! $seeker->profile_completed)) {
                    return [null, 'Add your OFW status to your profile'];
                }
                $want = (bool) ($rule['value'] ?? true);
                $isOfw = (bool) ($seeker->is_ofw || $seeker->is_former_ofw);
                return [$isOfw === $want, $isOfw ? 'OFW / former OFW' : 'Not an OFW'];

            case 'sex':
                if (blank($seeker->sex)) {
                    return [null, 'Add your sex to your profile'];
                }
                return [
                    mb_strtolower(trim((string) $seeker->sex)) === mb_strtolower(trim((string) ($rule['value'] ?? ''))),
                    'Sex: '.($seeker->sex ?: 'not set'),
                ];

            case 'civil_status':
                if (blank($seeker->civil_status)) {
                    return [null, 'Add your civil status to your profile'];
                }
                $values = array_map(fn ($value) => mb_strtolower(trim((string) $value)), $rule['values'] ?? []);
                return [
                    in_array(mb_strtolower(trim((string) $seeker->civil_status)), $values, true),
                    'Civil status: '.($seeker->civil_status ?: 'not set'),
                ];

            case 'residency':
                if (blank($seeker->address_municipality_city)) {
                    return [null, 'Add your city or municipality to your profile'];
                }
                $city = (string) ($rule['value'] ?? '');
                return [
                    strcasecmp(trim((string) $seeker->address_municipality_city), trim($city)) === 0,
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
