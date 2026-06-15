<?php

namespace App\Console\Commands;

use App\Models\OccupationAlias;
use App\Models\OccupationTitleCandidate;
use App\Services\JobDataLakeService;
use App\Services\OccupationTitleMatcher;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Throwable;

class DiscoverJobDataLakeTitles extends Command
{
    protected $signature = 'occupations:discover-job-titles
        {--query= : JobDataLake keyword query; defaults to *}
        {--countries=PH : Comma-separated ISO country codes}
        {--pages=1 : Number of pages to retrieve}
        {--per-page=100 : Results per page, up to 100}
        {--auto-alias : Create aliases for deterministic normalized matches}';

    protected $description = 'Discover current job titles through JobDataLake and stage them for occupation review';

    public function handle(
        JobDataLakeService $jobDataLake,
        OccupationTitleMatcher $matcher
    ): int {
        $pages = min(10, max(1, (int) $this->option('pages')));
        $perPage = min(100, max(1, (int) $this->option('per-page')));
        $query = trim((string) $this->option('query')) ?: '*';
        $countries = trim((string) $this->option('countries'));
        $seen = 0;
        $created = 0;
        $updated = 0;
        $aliases = 0;

        for ($page = 1; $page <= $pages; $page++) {
            try {
                $response = $jobDataLake->searchJobs(array_filter([
                    'q' => $query,
                    'countries' => $countries,
                    'page' => $page,
                    'per_page' => $perPage,
                    'sort_by' => 'posted_at:desc',
                ], fn ($value) => $value !== ''));
            } catch (Throwable $exception) {
                $this->error('JobDataLake request failed: '.$exception->getMessage());

                return self::FAILURE;
            }

            $jobs = $response['jobs'] ?? [];
            if (! is_array($jobs) || $jobs === []) {
                break;
            }

            foreach ($jobs as $job) {
                $rawTitle = Str::of((string) ($job['title'] ?? ''))->squish()->toString();
                $normalizedTitle = $matcher->normalize($rawTitle);
                if ($rawTitle === '' || $normalizedTitle === '') {
                    continue;
                }

                $seen++;
                $match = $matcher->match($rawTitle);
                $candidate = OccupationTitleCandidate::query()
                    ->where('normalized_title', $normalizedTitle)
                    ->first();

                $attributes = [
                    'raw_title' => $rawTitle,
                    'source' => 'jobdatalake',
                    'suggested_occupation_id' => $match['occupation']->id ?? null,
                    'match_reason' => $match['reason'] ?? null,
                    'match_confidence' => $match['confidence'] ?? null,
                    'sample_company' => $job['company_name'] ?? null,
                    'metadata' => [
                        'job_handle' => $job['job_handle'] ?? null,
                        'countries' => $job['countries'] ?? [],
                        'locations' => $job['locations'] ?? [],
                        'job_function' => $job['job_function'] ?? null,
                        'seniority' => $job['seniority'] ?? [],
                        'required_skills' => $job['required_skills'] ?? [],
                    ],
                    'last_seen_at' => now(),
                ];

                if ($candidate) {
                    $candidate->update([
                        ...$attributes,
                        'occurrences' => $candidate->occurrences + 1,
                    ]);
                    $updated++;
                } else {
                    $candidate = OccupationTitleCandidate::create([
                        ...$attributes,
                        'normalized_title' => $normalizedTitle,
                        'status' => 'pending',
                        'occurrences' => 1,
                        'first_seen_at' => now(),
                    ]);
                    $created++;
                }

                if ($this->option('auto-alias')
                    && $match
                    && $match['reason'] === 'normalized_title'
                    && $match['confidence'] >= 0.94
                ) {
                    OccupationAlias::updateOrCreate(
                        [
                            'occupation_id' => $match['occupation']->id,
                            'normalized_alias' => $normalizedTitle,
                            'language' => 'en',
                        ],
                        [
                            'alias' => $rawTitle,
                            'source' => 'jobdatalake',
                            'confidence' => $match['confidence'],
                        ]
                    );

                    $candidate->update([
                        'status' => 'alias_created',
                        'reviewed_at' => now(),
                    ]);
                    $aliases++;
                }
            }

            if (count($jobs) < $perPage) {
                break;
            }
        }

        $this->info("Processed {$seen} listings: {$created} candidates created, {$updated} updated.");
        $this->info("Created or updated {$aliases} high-confidence occupation aliases.");
        $this->line(
            OccupationTitleCandidate::where('status', 'pending')->count()
            .' JobDataLake titles are pending PESO review.'
        );

        return self::SUCCESS;
    }
}
