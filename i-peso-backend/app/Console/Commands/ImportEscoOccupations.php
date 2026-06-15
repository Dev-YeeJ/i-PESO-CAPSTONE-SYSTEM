<?php

namespace App\Console\Commands;

use App\Models\Occupation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use SplFileObject;

class ImportEscoOccupations extends Command
{
    protected $signature = 'occupations:import-esco
        {path? : Absolute or relative path to occupations_en.csv}
        {--esco-version=1.2.1 : ESCO dataset version}
        {--deactivate-missing : Deactivate ESCO occupations absent from this file}';

    protected $description = 'Import ESCO occupations and alternative labels from occupations_en.csv';

    public function handle(): int
    {
        $version = trim((string) $this->option('esco-version'));
        $pathArgument = trim((string) ($this->argument('path') ?? ''));
        $path = $pathArgument !== ''
            ? $this->resolvePath($pathArgument)
            : database_path("data/esco/v{$version}/occupations_en.csv");

        if (! is_file($path) || ! is_readable($path)) {
            $this->error("CSV file is not readable: {$path}");
            $this->line('Provide a path argument or add the file under database/data/esco/v{version}/occupations_en.csv.');

            return self::FAILURE;
        }

        try {
            [$header, $rows] = $this->readCsv($path);
            $this->validateHeader($header);
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $imported = 0;
        $skipped = 0;
        $duplicates = 0;
        $seenUris = [];

        DB::transaction(function () use (
            $rows,
            $header,
            $version,
            &$imported,
            &$skipped,
            &$duplicates,
            &$seenUris
        ) {
            while (! $rows->eof()) {
                $values = $rows->fgetcsv();

                if ($values === [null] || $values === false) {
                    continue;
                }

                $values = array_pad($values, count($header), null);
                $row = array_combine($header, array_slice($values, 0, count($header)));
                if ($row === false) {
                    $skipped++;
                    continue;
                }

                $uri = trim((string) ($row['conceptUri'] ?? ''));
                $title = Str::of((string) ($row['preferredLabel'] ?? ''))->squish()->toString();
                if ($uri === '' || $title === '') {
                    $skipped++;
                    continue;
                }

                if (isset($seenUris[$uri])) {
                    $duplicates++;
                }
                $seenUris[$uri] = true;

                $classificationCode = trim((string) ($row['code'] ?? '')) ?: null;
                $iscoGroup = trim((string) ($row['iscoGroup'] ?? '')) ?: null;
                $description = Str::of(
                    (string) (($row['description'] ?? '') ?: ($row['definition'] ?? ''))
                )->squish()->toString() ?: null;

                Occupation::updateOrCreate(
                    ['external_uri' => $uri],
                    [
                        'psoc_code' => $this->internalCode($uri),
                        'classification_code' => $classificationCode,
                        'isco_group' => $iscoGroup,
                        'title' => Str::ucfirst($title),
                        'description' => $description,
                        'search_terms' => $this->searchTerms($row, $title, $classificationCode, $iscoGroup),
                        'version' => $version,
                        'source' => 'esco',
                        'is_active' => ($row['status'] ?? 'released') === 'released',
                    ]
                );

                $imported++;
            }

            if ($this->option('deactivate-missing')) {
                Occupation::query()
                    ->where('source', 'esco')
                    ->whereNotNull('external_uri')
                    ->get(['id', 'external_uri'])
                    ->each(function (Occupation $occupation) use ($seenUris) {
                        if (! isset($seenUris[$occupation->external_uri])) {
                            $occupation->update(['is_active' => false]);
                        }
                    });
            }

            $this->deactivateDuplicateFallbacks();
        });

        $this->info("Imported {$imported} ESCO rows ({$duplicates} duplicate URI rows updated, {$skipped} skipped).");
        $this->info(Occupation::where('source', 'esco')->where('is_active', true)->count().' active ESCO occupations are available.');

        return self::SUCCESS;
    }

    private function readCsv(string $path): array
    {
        $file = new SplFileObject($path, 'r');
        $file->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);

        $header = $file->fgetcsv();
        if (! is_array($header)) {
            throw new RuntimeException('The ESCO CSV header could not be read.');
        }

        $header = array_map(
            fn ($column) => ltrim(trim((string) $column), "\xEF\xBB\xBF"),
            $header
        );

        return [$header, $file];
    }

    private function validateHeader(array $header): void
    {
        $required = ['conceptUri', 'preferredLabel', 'altLabels', 'status', 'code', 'iscoGroup'];
        $missing = array_values(array_diff($required, $header));

        if ($missing !== []) {
            throw new RuntimeException('This is not a supported ESCO occupations CSV. Missing columns: '.implode(', ', $missing));
        }
    }

    private function searchTerms(array $row, string $title, ?string $classificationCode, ?string $iscoGroup): string
    {
        return Str::of(implode(' ', array_filter([
            $title,
            $row['altLabels'] ?? null,
            $row['hiddenLabels'] ?? null,
            $classificationCode,
            $iscoGroup,
        ])))
            ->replaceMatches('/\s+/', ' ')
            ->lower()
            ->trim()
            ->toString();
    }

    private function internalCode(string $uri): string
    {
        return 'ESCO-'.substr(hash('sha256', $uri), 0, 24);
    }

    private function deactivateDuplicateFallbacks(): void
    {
        Occupation::query()
            ->where('source', 'fallback')
            ->where('is_active', true)
            ->get()
            ->each(function (Occupation $fallback) {
                $hasEscoMatch = Occupation::query()
                    ->where('source', 'esco')
                    ->where('is_active', true)
                    ->whereRaw('LOWER(title) = ?', [Str::lower($fallback->title)])
                    ->exists();

                if ($hasEscoMatch) {
                    $fallback->update(['is_active' => false]);
                }
            });
    }

    private function resolvePath(string $path): string
    {
        if (preg_match('/^(?:[A-Za-z]:[\\\\\/]|\\\\\\\\|\/)/', $path) === 1) {
            return $path;
        }

        return base_path($path);
    }
}
