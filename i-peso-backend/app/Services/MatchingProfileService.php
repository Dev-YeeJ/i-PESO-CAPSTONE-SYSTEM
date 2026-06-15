<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class MatchingProfileService
{
    public function normalize(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }

    public function syncVacancyCertifications(JobVacancy $vacancy): int
    {
        if (! Schema::hasTable('job_vacancy_certifications')) {
            return 0;
        }

        $rows = collect($vacancy->required_certifications ?? [])
            ->map(function ($name) use ($vacancy) {
                $cleanName = Str::of((string) $name)->squish()->toString();
                $normalized = $this->normalize($cleanName);

                if ($normalized === '') {
                    return null;
                }

                return [
                    'post_id' => $vacancy->getKey(),
                    'name' => $cleanName,
                    'normalized_name' => $normalized,
                    'is_mandatory' => (bool) $vacancy->certifications_mandatory,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })
            ->filter()
            ->unique('normalized_name')
            ->values();

        return DB::transaction(function () use ($vacancy, $rows) {
            $vacancy->certificationRequirements()->delete();

            if ($rows->isNotEmpty()) {
                DB::table('job_vacancy_certifications')->insert($rows->all());
            }

            return $rows->count();
        });
    }

    public function seekerCertificationNames(JobSeeker $seeker): Collection
    {
        $eligibilities = $seeker->relationLoaded('eligibilities')
            ? $seeker->eligibilities
            : $seeker->eligibilities()->get();
        $trainings = $seeker->relationLoaded('trainings')
            ? $seeker->trainings
            : $seeker->trainings()->get();

        return $eligibilities
            ->filter(fn ($eligibility) => $eligibility->valid_until === null
                || $eligibility->valid_until->isToday()
                || $eligibility->valid_until->isFuture())
            ->map(fn ($eligibility) => $eligibility->normalized_name
                ?: $eligibility->name)
            ->concat($trainings->map(fn ($training) => $training->normalized_certificates
                ?: $training->certificates_received))
            ->filter()
            ->map(fn ($name) => $this->normalize((string) $name))
            ->unique()
            ->values();
    }
}
