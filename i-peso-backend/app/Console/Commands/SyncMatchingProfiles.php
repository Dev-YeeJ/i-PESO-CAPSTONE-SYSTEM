<?php

namespace App\Console\Commands;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Services\MatchingProfileService;
use App\Services\OccupationTitleMatcher;
use Illuminate\Console\Command;

class SyncMatchingProfiles extends Command
{
    protected $signature = 'matching:sync-profiles';

    protected $description = 'Normalize existing seeker and vacancy fields for deterministic job matching';

    public function handle(
        MatchingProfileService $profiles,
        OccupationTitleMatcher $occupations
    ): int {
        $updated = [
            'education' => 0,
            'training' => 0,
            'eligibility' => 0,
            'experience' => 0,
            'vacancy_certification' => 0,
        ];

        JobSeeker::query()
            ->with(['educations', 'trainings', 'eligibilities', 'workExperiences'])
            ->chunkById(100, function ($seekers) use ($profiles, $occupations, &$updated) {
                foreach ($seekers as $seeker) {
                    foreach ($seeker->educations as $education) {
                        $education->update([
                            'normalized_course_strand' => filled($education->course_strand)
                                ? $profiles->normalize($education->course_strand)
                                : null,
                        ]);
                        $updated['education']++;
                    }

                    foreach ($seeker->trainings as $training) {
                        $training->update([
                            'normalized_course' => $profiles->normalize($training->course),
                            'normalized_certificates' => filled($training->certificates_received)
                                ? $profiles->normalize($training->certificates_received)
                                : null,
                        ]);
                        $updated['training']++;
                    }

                    foreach ($seeker->eligibilities as $eligibility) {
                        $eligibility->update([
                            'normalized_name' => $profiles->normalize($eligibility->name),
                        ]);
                        $updated['eligibility']++;
                    }

                    foreach ($seeker->workExperiences as $experience) {
                        $match = $experience->occupation_id
                            ? null
                            : $occupations->match($experience->position);
                        $experience->update([
                            'occupation_id' => $experience->occupation_id
                                ?: data_get($match, 'occupation.id'),
                            'normalized_position' => $profiles->normalize($experience->position),
                        ]);
                        $updated['experience']++;
                    }
                }
            }, 'seeker_id');

        JobVacancy::query()->chunkById(100, function ($vacancies) use ($profiles, &$updated) {
            foreach ($vacancies as $vacancy) {
                if ((int) $vacancy->minimum_experience_months === 0) {
                    $vacancy->update([
                        'minimum_experience_months' => match ($vacancy->experience_level) {
                            '1-3 Years' => 12,
                            '3-5 Years' => 36,
                            '5+ Years' => 60,
                            default => 0,
                        },
                    ]);
                }

                $updated['vacancy_certification'] += $profiles
                    ->syncVacancyCertifications($vacancy);
            }
        }, 'post_id');

        $this->info(
            'Normalized '.collect($updated)
                ->map(fn (int $count, string $type) => "{$count} {$type}")
                ->join(', ').'.'
        );

        return self::SUCCESS;
    }
}
