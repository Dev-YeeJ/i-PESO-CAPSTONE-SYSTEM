<?php

namespace App\Console\Commands;

use App\Models\Occupation;
use App\Models\OccupationGeneralTerm;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use SplFileObject;

class ImportOccupationGeneralTerms extends Command
{
    protected $signature = 'occupations:import-general-terms
        {path? : CSV path with term, language, canonical_title, priority, and source columns}
        {--validate-only : Validate without changing the database}
        {--strict : Fail when canonical titles are missing}';

    protected $description = 'Import broad occupation search terms that map to multiple catalog occupations';

    public function handle(): int
    {
        $path = $this->argument('path')
            ? $this->resolvePath((string) $this->argument('path'))
            : database_path('data/occupations/general_terms.csv');

        if (! is_file($path) || ! is_readable($path)) {
            $this->error("General-term CSV is not readable: {$path}");

            return self::FAILURE;
        }

        $file = new SplFileObject($path, 'r');
        $file->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);
        $header = array_map(
            fn ($column) => ltrim(trim((string) $column), "\xEF\xBB\xBF"),
            $file->fgetcsv() ?: []
        );

        if (array_diff(['term', 'canonical_title'], $header) !== []) {
            $this->error('General-term CSV must contain term and canonical_title columns.');

            return self::FAILURE;
        }

        $rows = [];
        $missing = [];

        while (! $file->eof()) {
            $values = $file->fgetcsv();
            if ($values === false || $values === [null]) {
                continue;
            }

            $row = array_combine(
                $header,
                array_slice(array_pad($values, count($header), null), 0, count($header))
            );
            $term = Str::of((string) ($row['term'] ?? ''))->squish()->toString();
            $canonicalTitle = Str::of((string) ($row['canonical_title'] ?? ''))->squish()->toString();
            if ($term === '' || $canonicalTitle === '') {
                continue;
            }

            $occupation = Occupation::query()
                ->where('is_active', true)
                ->whereRaw('LOWER(title) = ?', [Str::lower($canonicalTitle)])
                ->first();

            if (! $occupation) {
                $missing[$canonicalTitle] = true;

                continue;
            }

            $rows[] = [
                'occupation_id' => $occupation->id,
                'term' => $term,
                'normalized_term' => $this->normalize($term),
                'language' => trim((string) ($row['language'] ?? 'en')) ?: 'en',
                'source' => trim((string) ($row['source'] ?? 'local_peso')) ?: 'local_peso',
                'priority' => max(1, min(999, (int) ($row['priority'] ?? 100))),
            ];
        }

        $this->info(count($rows).' valid generalized mappings and '.count($missing).' missing titles found.');
        if ($missing !== []) {
            $this->warn('Missing canonical titles: '.implode(', ', array_keys($missing)));
        }

        if ($this->option('validate-only')) {
            return ($this->option('strict') && $missing !== [])
                ? self::FAILURE
                : self::SUCCESS;
        }

        foreach ($rows as $row) {
            OccupationGeneralTerm::updateOrCreate(
                [
                    'occupation_id' => $row['occupation_id'],
                    'normalized_term' => $row['normalized_term'],
                    'language' => $row['language'],
                ],
                [
                    'term' => $row['term'],
                    'source' => $row['source'],
                    'priority' => $row['priority'],
                ]
            );
        }

        $this->info('Imported or updated '.count($rows).' generalized occupation mappings.');

        return ($this->option('strict') && $missing !== [])
            ? self::FAILURE
            : self::SUCCESS;
    }

    private function normalize(string $term): string
    {
        return Str::of($term)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }

    private function resolvePath(string $path): string
    {
        if (preg_match('/^(?:[A-Za-z]:[\\\\\/]|\\\\\\\\|\/)/', $path) === 1) {
            return $path;
        }

        return base_path($path);
    }
}
