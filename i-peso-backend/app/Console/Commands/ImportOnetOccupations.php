<?php

namespace App\Console\Commands;

use App\Models\OccupationAlias;
use App\Models\OccupationSourceMapping;
use App\Services\OccupationTitleMatcher;
use App\Services\XlsxTableReader;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class ImportOnetOccupations extends Command
{
    protected $signature = 'occupations:import-onet
        {directory? : Directory containing the three O*NET XLSX files}
        {--onet-version=30.3 : O*NET database version}
        {--replace : Replace previously imported O*NET mappings and aliases}';

    protected $description = 'Map O*NET occupations to ESCO and import linked O*NET job titles as aliases';

    public function handle(
        XlsxTableReader $reader,
        OccupationTitleMatcher $matcher
    ): int {
        $version = trim((string) $this->option('onet-version'));
        $directory = $this->resolveDirectory((string) ($this->argument('directory') ?? ''), $version);
        $files = [
            'occupations' => $directory.DIRECTORY_SEPARATOR.'occupation_data.xlsx',
            'job_titles' => $directory.DIRECTORY_SEPARATOR.'job_titles.xlsx',
            'reported_titles' => $directory.DIRECTORY_SEPARATOR.'sample_reported_titles.xlsx',
        ];

        foreach ($files as $file) {
            if (! is_file($file) || ! is_readable($file)) {
                $this->error("Required O*NET file is not readable: {$file}");

                return self::FAILURE;
            }
        }

        try {
            $result = DB::transaction(function () use ($reader, $matcher, $files, $version) {
                if ($this->option('replace')) {
                    OccupationAlias::query()
                        ->whereIn('source', ['onet_job_title', 'onet_reported'])
                        ->delete();
                    OccupationSourceMapping::query()
                        ->where('source', 'onet')
                        ->delete();
                }

                $mappingResult = $this->importMappings($reader, $matcher, $files['occupations'], $version);
                $aliases = $this->collectAliases(
                    $reader,
                    $mappingResult['mappings'],
                    $files['job_titles'],
                    $files['reported_titles']
                );

                return [
                    ...$mappingResult,
                    ...$this->upsertAliases($aliases),
                ];
            });
        } catch (Throwable $exception) {
            $this->error('O*NET import failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info(
            "Mapped {$result['mapped']} of {$result['total']} O*NET occupations "
            ."to the active catalog; {$result['unmatched']} require review."
        );
        $this->info(
            "Imported or updated {$result['aliases']} O*NET aliases "
            ."({$result['reported_aliases']} commonly reported titles)."
        );

        return self::SUCCESS;
    }

    private function importMappings(
        XlsxTableReader $reader,
        OccupationTitleMatcher $matcher,
        string $path,
        string $version
    ): array {
        $mappings = [];
        $total = 0;
        $mapped = 0;

        foreach ($reader->rows($path) as $row) {
            $code = trim((string) ($row['O*NET-SOC Code'] ?? ''));
            $title = Str::of((string) ($row['Title'] ?? ''))->squish()->toString();
            if ($code === '' || $title === '') {
                continue;
            }

            $total++;
            $excludedSources = ['onet_job_title', 'onet_reported'];
            $match = $matcher->match($title, $excludedSources)
                ?? $this->matchSingularizedTitle($title, $matcher, $excludedSources);
            if (! $match) {
                continue;
            }

            OccupationSourceMapping::updateOrCreate(
                [
                    'source' => 'onet',
                    'external_code' => $code,
                ],
                [
                    'occupation_id' => $match['occupation']->id,
                    'version' => $version,
                    'metadata' => [
                        'title' => $title,
                        'description' => trim((string) ($row['Description'] ?? '')) ?: null,
                        'match_reason' => $match['reason'],
                        'match_confidence' => $match['confidence'],
                    ],
                ]
            );

            $mappings[$code] = $match['occupation']->id;
            $mapped++;
        }

        return [
            'mappings' => $mappings,
            'total' => $total,
            'mapped' => $mapped,
            'unmatched' => $total - $mapped,
        ];
    }

    private function matchSingularizedTitle(
        string $title,
        OccupationTitleMatcher $matcher,
        array $excludedAliasSources
    ): ?array {
        $singular = collect(preg_split('/\s+/', $title) ?: [])
            ->map(fn ($word) => in_array(Str::lower($word), ['and', 'or', 'of', 'the'], true)
                ? Str::lower($word)
                : Str::singular(Str::lower($word)))
            ->implode(' ');

        $match = $matcher->match($singular, $excludedAliasSources);
        if (! $match) {
            return null;
        }

        return [
            ...$match,
            'reason' => 'singularized_'.$match['reason'],
            'confidence' => min(0.93, $match['confidence']),
        ];
    }

    private function collectAliases(
        XlsxTableReader $reader,
        array $mappings,
        string $jobTitlesPath,
        string $reportedTitlesPath
    ): Collection {
        $aliases = collect();

        $this->appendAliases(
            $aliases,
            $reader,
            $jobTitlesPath,
            $mappings,
            'Job Title',
            'onet_job_title',
            0.9
        );
        $this->appendAliases(
            $aliases,
            $reader,
            $reportedTitlesPath,
            $mappings,
            'Reported Job Title',
            'onet_reported',
            0.98
        );

        return $aliases;
    }

    private function appendAliases(
        Collection $aliases,
        XlsxTableReader $reader,
        string $path,
        array $mappings,
        string $titleColumn,
        string $source,
        float $confidence
    ): void {
        foreach ($reader->rows($path) as $row) {
            $code = trim((string) ($row['O*NET-SOC Code'] ?? ''));
            $occupationId = $mappings[$code] ?? null;
            $alias = Str::of((string) ($row[$titleColumn] ?? ''))->squish()->toString();
            if (! $occupationId || $alias === '') {
                continue;
            }

            $normalized = $this->normalize($alias);
            if ($normalized === '') {
                continue;
            }

            $key = "{$occupationId}|{$normalized}|en";
            $existing = $aliases->get($key);
            if ($existing && $existing['confidence'] >= $confidence) {
                continue;
            }

            $aliases->put($key, [
                'occupation_id' => $occupationId,
                'alias' => $alias,
                'normalized_alias' => $normalized,
                'language' => 'en',
                'source' => $source,
                'confidence' => $confidence,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function upsertAliases(Collection $aliases): array
    {
        if ($aliases->isEmpty()) {
            return ['aliases' => 0, 'reported_aliases' => 0];
        }

        $occupationIds = $aliases->pluck('occupation_id')->unique()->values();
        $existing = OccupationAlias::query()
            ->whereIn('occupation_id', $occupationIds)
            ->get()
            ->keyBy(fn (OccupationAlias $alias) => "{$alias->occupation_id}|{$alias->normalized_alias}|{$alias->language}");

        $rows = $aliases
            ->reject(function (array $alias, string $key) use ($existing) {
                $current = $existing->get($key);

                return $current && $current->confidence >= $alias['confidence'];
            })
            ->values();

        $rows->chunk(1000)->each(function (Collection $chunk) {
            DB::table('occupation_aliases')->upsert(
                $chunk->all(),
                ['occupation_id', 'normalized_alias', 'language'],
                ['alias', 'source', 'confidence', 'updated_at']
            );
        });

        return [
            'aliases' => $rows->count(),
            'reported_aliases' => $rows->where('source', 'onet_reported')->count(),
        ];
    }

    private function normalize(string $title): string
    {
        return Str::of($title)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }

    private function resolveDirectory(string $directory, string $version): string
    {
        if (trim($directory) === '') {
            return database_path("data/onet/v{$version}");
        }

        if (preg_match('/^(?:[A-Za-z]:[\\\\\/]|\\\\\\\\|\/)/', $directory) === 1) {
            return rtrim($directory, '\\/');
        }

        return base_path(rtrim($directory, '\\/'));
    }
}
