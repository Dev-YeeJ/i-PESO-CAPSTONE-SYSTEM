<?php

namespace App\Console\Commands;

use App\Models\Occupation;
use App\Models\OccupationAlias;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use SplFileObject;

class ImportOccupationAliases extends Command
{
    protected $signature = 'occupations:import-aliases
        {path? : CSV path with canonical_title, alias, language, source, and confidence columns}
        {--validate-only : Validate the CSV without changing the database}
        {--strict : Fail when canonical titles are missing or aliases conflict}';

    protected $description = 'Import local and common job-title aliases into the occupation catalog';

    public function handle(): int
    {
        $path = $this->argument('path')
            ? $this->resolvePath((string) $this->argument('path'))
            : database_path('data/occupations/local_aliases.csv');

        if (! is_file($path) || ! is_readable($path)) {
            $this->error("Alias CSV is not readable: {$path}");

            return self::FAILURE;
        }

        $file = new SplFileObject($path, 'r');
        $file->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);
        $header = array_map(
            fn ($column) => ltrim(trim((string) $column), "\xEF\xBB\xBF"),
            $file->fgetcsv() ?: []
        );

        if (array_diff(['canonical_title', 'alias'], $header) !== []) {
            $this->error('Alias CSV must contain canonical_title and alias columns.');

            return self::FAILURE;
        }

        $rows = [];
        $unmatched = [];
        $conflicts = [];
        $seenAliases = [];

        while (! $file->eof()) {
            $values = $file->fgetcsv();
            if ($values === false || $values === [null]) {
                continue;
            }

            $row = array_combine($header, array_slice(array_pad($values, count($header), null), 0, count($header)));
            $canonicalTitle = Str::of((string) ($row['canonical_title'] ?? ''))->squish()->toString();
            $alias = Str::of((string) ($row['alias'] ?? ''))->squish()->toString();
            if ($canonicalTitle === '' || $alias === '') {
                continue;
            }

            $language = trim((string) ($row['language'] ?? 'en')) ?: 'en';
            $normalizedAlias = $this->normalize($alias);
            $aliasKey = "{$normalizedAlias}|{$language}";
            $occupation = Occupation::query()
                ->where('is_active', true)
                ->whereRaw('LOWER(title) = ?', [Str::lower($canonicalTitle)])
                ->first();

            if (! $occupation) {
                $unmatched[$canonicalTitle] = true;

                continue;
            }

            if (isset($seenAliases[$aliasKey]) && $seenAliases[$aliasKey] !== $occupation->id) {
                $conflicts[$aliasKey] = $alias;

                continue;
            }

            $databaseConflict = OccupationAlias::query()
                ->where('normalized_alias', $normalizedAlias)
                ->where('language', $language)
                ->where('occupation_id', '!=', $occupation->id)
                ->exists();

            if ($databaseConflict) {
                $conflicts[$aliasKey] = $alias;

                continue;
            }

            $seenAliases[$aliasKey] = $occupation->id;
            $rows[] = [
                'occupation' => $occupation,
                'alias' => $alias,
                'normalized_alias' => $normalizedAlias,
                'language' => $language,
                'source' => trim((string) ($row['source'] ?? 'local')) ?: 'local',
                'confidence' => min(1, max(0, (float) ($row['confidence'] ?? 1))),
            ];
        }

        $this->info(
            count($rows).' valid aliases, '
            .count($unmatched).' missing canonical titles, and '
            .count($conflicts).' conflicts found.'
        );

        if ($unmatched !== []) {
            $this->warn('Missing canonical titles: '.implode(', ', array_keys($unmatched)));
        }

        if ($conflicts !== []) {
            $this->warn('Conflicting aliases: '.implode(', ', array_values($conflicts)));
        }

        if ($this->option('validate-only')) {
            return ($this->option('strict') && ($unmatched !== [] || $conflicts !== []))
                ? self::FAILURE
                : self::SUCCESS;
        }

        $imported = 0;
        foreach ($rows as $row) {
            OccupationAlias::updateOrCreate(
                [
                    'occupation_id' => $row['occupation']->id,
                    'normalized_alias' => $row['normalized_alias'],
                    'language' => $row['language'],
                ],
                [
                    'alias' => $row['alias'],
                    'source' => $row['source'],
                    'confidence' => $row['confidence'],
                ]
            );
            $imported++;
        }

        $this->info("Imported or updated {$imported} occupation aliases.");

        return ($this->option('strict') && ($unmatched !== [] || $conflicts !== []))
            ? self::FAILURE
            : self::SUCCESS;
    }

    private function resolvePath(string $path): string
    {
        if (preg_match('/^(?:[A-Za-z]:[\\\\\/]|\\\\\\\\|\/)/', $path) === 1) {
            return $path;
        }

        return base_path($path);
    }

    private function normalize(string $alias): string
    {
        return Str::of($alias)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }
}
