<?php

namespace App\Console\Commands;

use App\Models\OccupationSourceMapping;
use App\Models\SkillAlias;
use App\Models\SkillCatalogEntry;
use App\Models\SkillRelationship;
use App\Services\SkillCategorizer;
use App\Services\SkillTaxonomyService;
use App\Services\XlsxTableReader;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class ImportOnetSkills extends Command
{
    protected $signature = 'skills:import-onet
        {directory? : Directory containing the three O*NET skill XLSX files}
        {--onet-version=30.3 : O*NET database version}
        {--replace : Replace previously imported O*NET skill entries}';

    protected $description = 'Import O*NET software, essential, and transferable skills for autocomplete';

    public function handle(
        XlsxTableReader $reader,
        SkillCategorizer $categorizer,
        SkillTaxonomyService $taxonomy
    ): int {
        $version = trim((string) $this->option('onet-version'));
        $directory = $this->resolveDirectory((string) ($this->argument('directory') ?? ''), $version);
        $files = [
            ['path' => $directory.DIRECTORY_SEPARATOR.'software_skills.xlsx', 'category' => 'technical', 'source' => 'onet_software', 'name' => 'Workplace Example'],
            ['path' => $directory.DIRECTORY_SEPARATOR.'essential_skills.xlsx', 'category' => 'essential', 'source' => 'onet_essential', 'name' => 'Element Name'],
            ['path' => $directory.DIRECTORY_SEPARATOR.'transferable_skills.xlsx', 'category' => 'soft', 'source' => 'onet_transferable', 'name' => 'Element Name'],
        ];

        foreach ($files as $file) {
            if (! is_file($file['path']) || ! is_readable($file['path'])) {
                $this->error("Required O*NET skill file is not readable: {$file['path']}");

                return self::FAILURE;
            }
        }

        try {
            $entries = [];
            foreach ($files as $file) {
                $this->collectEntries($entries, $reader, $categorizer, $file, $version);
            }
            $this->collectGeneralEntries(
                $entries,
                database_path('data/skills/general_skills.csv'),
                $version
            );
            foreach ($entries as &$entry) {
                unset($entry['occupation_codes']);
            }
            unset($entry);

            $taxonomyCounts = DB::transaction(function () use (
                $entries,
                $files,
                $reader,
                $categorizer,
                $directory,
                $version
            ) {
                if ($this->option('replace')) {
                    SkillAlias::query()->where('source', 'local_general')->delete();
                    SkillRelationship::query()->where('source', 'onet_reviewed')->delete();
                    DB::table('skill_occupation_evidence')->where('source', 'onet')->delete();
                }

                collect(array_values($entries))->chunk(1000)->each(function ($chunk) {
                    DB::table('skill_catalog_entries')->upsert(
                        $chunk->all(),
                        ['category', 'normalized_name'],
                        ['name', 'search_terms', 'source', 'element_id', 'occupation_count', 'is_hot', 'is_in_demand', 'version', 'updated_at']
                    );
                });

                $skillMap = SkillCatalogEntry::query()
                    ->get(['id', 'category', 'normalized_name'])
                    ->keyBy(fn (SkillCatalogEntry $skill) => $skill->category.'|'.$skill->normalized_name);

                return [
                    'aliases' => $this->syncGeneralAliases(
                        $skillMap,
                        database_path('data/skills/general_skills.csv')
                    ),
                    'evidence' => $this->syncOccupationEvidence(
                        $skillMap,
                        $files,
                        $reader,
                        $categorizer,
                        $version
                    ),
                    'relationships' => $this->syncReviewedRelationships(
                        $skillMap,
                        $reader,
                        $files[0]['path'],
                        $directory.DIRECTORY_SEPARATOR.'skill_clusters.csv'
                    ),
                ];
            });

            $this->callSilently('skills:sync-taxonomy-links');
        } catch (Throwable $exception) {
            $this->error('O*NET skill import failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $technical = collect($entries)->where('category', 'technical')->count();
        $soft = collect($entries)->where('category', 'soft')->count();
        $this->info("Imported or updated {$technical} technical and {$soft} soft skill suggestions.");
        $this->info(
            "Synchronized {$taxonomyCounts['aliases']} aliases, "
            ."{$taxonomyCounts['relationships']} reviewed relationships, and "
            ."{$taxonomyCounts['evidence']} O*NET occupation evidence rows."
        );

        return self::SUCCESS;
    }

    private function collectEntries(
        array &$entries,
        XlsxTableReader $reader,
        SkillCategorizer $categorizer,
        array $file,
        string $version
    ): void {
        foreach ($reader->rows($file['path']) as $row) {
            if ($file['source'] !== 'onet_software' && ($row['Scale ID'] ?? '') !== 'IM') {
                continue;
            }

            if (($row['Recommend Suppress'] ?? 'N') === 'Y' || ($row['Not Relevant'] ?? 'N') === 'Y') {
                continue;
            }

            $name = Str::of((string) ($row[$file['name']] ?? ''))->squish()->toString();
            $occupationCode = trim((string) ($row['O*NET-SOC Code'] ?? ''));
            $normalized = $this->normalize($name);
            if ($name === '' || $normalized === '') {
                continue;
            }

            $category = $file['source'] === 'onet_software'
                ? 'technical'
                : $categorizer->categoryForOnetSkill($name);
            $key = $category.'|'.$normalized;
            $current = $entries[$key] ?? [
                'name' => $name,
                'normalized_name' => $normalized,
                'search_terms' => $normalized,
                'category' => $category,
                'source' => $file['source'],
                'element_id' => trim((string) ($row['Element ID'] ?? '')) ?: null,
                'occupation_codes' => [],
                'occupation_count' => 0,
                'is_hot' => false,
                'is_in_demand' => false,
                'version' => $version,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $current['occupation_codes'] ??= [];

            if ($occupationCode !== '') {
                $current['occupation_codes'][$occupationCode] = true;
            }
            $current['occupation_count'] = count($current['occupation_codes']);
            $current['is_hot'] = $current['is_hot'] || ($row['Hot Technology'] ?? 'N') === 'Y';
            $current['is_in_demand'] = $current['is_in_demand'] || ($row['In Demand'] ?? 'N') === 'Y';
            $entries[$key] = $current;
        }

    }

    private function collectGeneralEntries(array &$entries, string $path, string $version): void
    {
        if (! is_readable($path)) {
            $this->warn("General skills file is not readable; importing O*NET only: {$path}");

            return;
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new \RuntimeException("Unable to open general skills file: {$path}");
        }

        try {
            $headers = fgetcsv($handle);
            if ($headers === false) {
                return;
            }

            while (($values = fgetcsv($handle)) !== false) {
                $row = array_combine($headers, array_pad($values, count($headers), ''));
                if ($row === false) {
                    continue;
                }

                $name = Str::of((string) ($row['name'] ?? ''))->squish()->toString();
                $category = trim((string) ($row['category'] ?? ''));
                $normalized = $this->normalize($name);
                if ($normalized === '' || ! in_array($category, ['technical', 'soft'], true)) {
                    continue;
                }

                $aliases = collect(explode('|', (string) ($row['aliases'] ?? '')))
                    ->map(fn (string $alias) => $this->normalize($alias))
                    ->filter()
                    ->prepend($normalized)
                    ->unique()
                    ->implode(' ');
                $key = $category.'|'.$normalized;
                $current = $entries[$key] ?? [
                    'name' => $name,
                    'normalized_name' => $normalized,
                    'search_terms' => $aliases,
                    'category' => $category,
                    'source' => 'local_general',
                    'element_id' => null,
                    'occupation_codes' => [],
                    'occupation_count' => 0,
                    'is_hot' => false,
                    'is_in_demand' => false,
                    'version' => $version,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $current['search_terms'] = collect([
                    $current['search_terms'] ?? $normalized,
                    $aliases,
                ])->filter()->unique()->implode(' ');
                $entries[$key] = $current;
            }
        } finally {
            fclose($handle);
        }
    }

    private function syncGeneralAliases($skillMap, string $path): int
    {
        if (! is_readable($path)) {
            return 0;
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return 0;
        }

        $rows = [];

        try {
            $headers = fgetcsv($handle);
            if ($headers === false) {
                return 0;
            }

            while (($values = fgetcsv($handle)) !== false) {
                $row = array_combine($headers, array_pad($values, count($headers), ''));
                if ($row === false) {
                    continue;
                }

                $category = trim((string) ($row['category'] ?? ''));
                $normalizedName = $this->normalize((string) ($row['name'] ?? ''));
                $skill = $skillMap->get($category.'|'.$normalizedName);
                if (! $skill) {
                    continue;
                }

                foreach (explode('|', (string) ($row['aliases'] ?? '')) as $alias) {
                    $cleanAlias = Str::of($alias)->squish()->toString();
                    $normalizedAlias = $this->normalize($cleanAlias);
                    if ($normalizedAlias === '' || $normalizedAlias === $normalizedName) {
                        continue;
                    }

                    $rows[$skill->id.'|'.$normalizedAlias] = [
                        'skill_id' => $skill->id,
                        'alias' => $cleanAlias,
                        'normalized_alias' => $normalizedAlias,
                        'source' => 'local_general',
                        'confidence' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        } finally {
            fclose($handle);
        }

        collect(array_values($rows))->chunk(1000)->each(
            fn ($chunk) => DB::table('skill_aliases')->upsert(
                $chunk->all(),
                ['skill_id', 'normalized_alias'],
                ['alias', 'source', 'confidence', 'updated_at']
            )
        );

        return count($rows);
    }

    private function syncOccupationEvidence(
        $skillMap,
        array $files,
        XlsxTableReader $reader,
        SkillCategorizer $categorizer,
        string $version
    ): int {
        $occupationMap = OccupationSourceMapping::query()
            ->where('source', 'onet')
            ->pluck('occupation_id', 'external_code');
        $rows = [];

        foreach ($files as $file) {
            foreach ($reader->rows($file['path']) as $row) {
                if (($row['Recommend Suppress'] ?? 'N') === 'Y' || ($row['Not Relevant'] ?? 'N') === 'Y') {
                    continue;
                }

                $name = Str::of((string) ($row[$file['name']] ?? ''))->squish()->toString();
                $occupationCode = trim((string) ($row['O*NET-SOC Code'] ?? ''));
                if ($name === '' || $occupationCode === '') {
                    continue;
                }

                $category = $file['source'] === 'onet_software'
                    ? 'technical'
                    : $categorizer->categoryForOnetSkill($name);
                $skill = $skillMap->get($category.'|'.$this->normalize($name));
                if (! $skill) {
                    continue;
                }

                $evidenceType = match ($file['source']) {
                    'onet_software' => 'software',
                    'onet_essential' => 'essential',
                    default => 'transferable',
                };
                $key = $skill->id.'|'.$occupationCode.'|'.$evidenceType;
                $current = $rows[$key] ?? [
                    'skill_id' => $skill->id,
                    'occupation_id' => $occupationMap->get($occupationCode),
                    'source' => 'onet',
                    'external_occupation_code' => $occupationCode,
                    'evidence_type' => $evidenceType,
                    'element_id' => trim((string) ($row['Element ID'] ?? '')) ?: null,
                    'importance' => null,
                    'level' => null,
                    'is_hot' => false,
                    'is_in_demand' => false,
                    'version' => $version,
                    'metadata' => json_encode([
                        'occupation_title' => trim((string) ($row['Title'] ?? '')) ?: null,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (($row['Scale ID'] ?? '') === 'IM') {
                    $current['importance'] = is_numeric($row['Data Value'] ?? null)
                        ? (float) $row['Data Value']
                        : null;
                }
                if (($row['Scale ID'] ?? '') === 'LV') {
                    $current['level'] = is_numeric($row['Data Value'] ?? null)
                        ? (float) $row['Data Value']
                        : null;
                }
                $current['is_hot'] = $current['is_hot'] || ($row['Hot Technology'] ?? 'N') === 'Y';
                $current['is_in_demand'] = $current['is_in_demand'] || ($row['In Demand'] ?? 'N') === 'Y';
                $current['updated_at'] = now();
                $rows[$key] = $current;
            }
        }

        collect(array_values($rows))->chunk(1000)->each(
            fn ($chunk) => DB::table('skill_occupation_evidence')->upsert(
                $chunk->all(),
                ['skill_id', 'source', 'external_occupation_code', 'evidence_type'],
                [
                    'occupation_id',
                    'element_id',
                    'importance',
                    'level',
                    'is_hot',
                    'is_in_demand',
                    'version',
                    'metadata',
                    'updated_at',
                ]
            )
        );

        return count($rows);
    }

    private function syncReviewedRelationships(
        $skillMap,
        XlsxTableReader $reader,
        string $softwarePath,
        string $rulesPath
    ): int {
        if (! is_readable($rulesPath)) {
            $this->warn("Reviewed O*NET skill cluster file is not readable: {$rulesPath}");

            return 0;
        }

        $rules = collect();
        $handle = fopen($rulesPath, 'rb');
        if ($handle === false) {
            return 0;
        }

        try {
            $headers = fgetcsv($handle);
            while ($headers !== false && ($values = fgetcsv($handle)) !== false) {
                $row = array_combine($headers, array_pad($values, count($headers), ''));
                if ($row === false) {
                    continue;
                }

                $rules->push([
                    ...$row,
                    'element_ids' => array_filter(explode('|', (string) ($row['element_ids'] ?? ''))),
                ]);
            }
        } finally {
            fclose($handle);
        }

        $rulesByOccupation = $rules->groupBy('onet_soc_code');
        $rows = [];

        foreach ($reader->rows($softwarePath) as $row) {
            $occupationCode = trim((string) ($row['O*NET-SOC Code'] ?? ''));
            $elementId = trim((string) ($row['Element ID'] ?? ''));

            foreach ($rulesByOccupation->get($occupationCode, collect()) as $rule) {
                if (! in_array($elementId, $rule['element_ids'], true)) {
                    continue;
                }

                $parent = $skillMap->get('technical|'.$this->normalize((string) $rule['parent_skill']));
                $related = $skillMap->get(
                    'technical|'.$this->normalize((string) ($row['Workplace Example'] ?? ''))
                );
                if (! $parent || ! $related || $parent->id === $related->id) {
                    continue;
                }

                $key = $parent->id.'|'.$related->id.'|'.$rule['relationship_type'];
                $rows[$key] = [
                    'parent_skill_id' => $parent->id,
                    'related_skill_id' => $related->id,
                    'relationship_type' => $rule['relationship_type'],
                    'match_weight' => (float) $rule['match_weight'],
                    'reverse_match_weight' => (float) $rule['reverse_match_weight'],
                    'source' => 'onet_reviewed',
                    'external_code' => $occupationCode.':'.$elementId,
                    'metadata' => json_encode([
                        'occupation_title' => trim((string) ($row['Title'] ?? '')),
                        'element_name' => trim((string) ($row['Element Name'] ?? '')),
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        collect(array_values($rows))->chunk(1000)->each(
            fn ($chunk) => DB::table('skill_relationships')->upsert(
                $chunk->all(),
                ['parent_skill_id', 'related_skill_id', 'relationship_type'],
                [
                    'match_weight',
                    'reverse_match_weight',
                    'source',
                    'external_code',
                    'metadata',
                    'updated_at',
                ]
            )
        );

        return count($rows);
    }

    private function normalize(string $value): string
    {
        return Str::of($value)
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
