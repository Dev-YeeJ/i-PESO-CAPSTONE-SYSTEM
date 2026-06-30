<?php

namespace App\Services;

use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use Carbon\Carbon;

class GovernmentProgramEligibilityService
{
    public function evaluate(JobSeeker $seeker, GovernmentProgram $program): array
    {
        $requirements = collect($program->eligibility_requirements ?? []);
        $structured = $requirements->filter(fn ($requirement) => is_array($requirement));
        $reasons = [];

        foreach ($structured as $requirement) {
            $field = $requirement['field'] ?? null;
            $operator = $requirement['operator'] ?? 'equals';
            $expected = $requirement['value'] ?? null;
            $actual = $this->profileValue($seeker, $field);

            if (! $this->passes($actual, $operator, $expected)) {
                $reasons[] = $requirement['label'] ?? "Profile does not meet {$field}.";
            }
        }

        $manualRequirements = $requirements->filter(fn ($requirement) => is_string($requirement))->values();
        $checks = max(1, $structured->count());
        $score = $structured->isEmpty()
            ? 100
            : (int) round((($checks - count($reasons)) / $checks) * 100);

        return [
            'eligible' => empty($reasons),
            'score' => max(0, min(100, $score)),
            'failed_requirements' => $reasons,
            'manual_review_requirements' => $manualRequirements->all(),
            'profile_snapshot' => [
                'name' => trim("{$seeker->first_name} {$seeker->middle_name} {$seeker->last_name}"),
                'email' => $seeker->email,
                'mobile_number' => $seeker->mobile_number,
                'date_of_birth' => $seeker->date_of_birth?->format('Y-m-d'),
                'age' => $seeker->date_of_birth?->age,
                'education' => $seeker->educ_attainment,
                'employment_status' => $seeker->employment_status,
                'address' => $seeker->getFullAddress(),
                'profile_completed' => (bool) $seeker->profile_completed,
            ],
            'evaluated_at' => now()->toIso8601String(),
        ];
    }

    private function profileValue(JobSeeker $seeker, ?string $field): mixed
    {
        return match ($field) {
            'age' => $seeker->date_of_birth ? Carbon::parse($seeker->date_of_birth)->age : null,
            'city' => $seeker->address_municipality_city,
            'province' => $seeker->address_province,
            'education' => $seeker->educ_attainment,
            'employment_status' => $seeker->employment_status,
            'profile_completed' => (bool) $seeker->profile_completed,
            default => $field ? $seeker->getAttribute($field) : null,
        };
    }

    private function passes(mixed $actual, string $operator, mixed $expected): bool
    {
        if ($actual === null) {
            return false;
        }

        return match ($operator) {
            'minimum', 'gte' => (float) $actual >= (float) $expected,
            'maximum', 'lte' => (float) $actual <= (float) $expected,
            'in' => in_array(mb_strtolower((string) $actual), array_map(
                fn ($value) => mb_strtolower((string) $value),
                (array) $expected
            ), true),
            'contains' => str_contains(mb_strtolower((string) $actual), mb_strtolower((string) $expected)),
            'truthy' => (bool) $actual === (bool) $expected,
            default => mb_strtolower((string) $actual) === mb_strtolower((string) $expected),
        };
    }
}
