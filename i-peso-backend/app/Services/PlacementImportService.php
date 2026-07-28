<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\PlacementRecord;
use App\Models\PlacementReportUpload;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class PlacementImportService
{
    /** How many leading rows to scan when locating the real header row. */
    private const HEADER_SCAN_LIMIT = 12;

    /** Header aliases keyed by canonical field — drives auto-mapping. */
    private const FIELD_ALIASES = [
        'first_name' => ['first name', 'firstname', 'given name', 'fname'],
        'middle_name' => ['middle name', 'middlename', 'mname', 'middle initial', 'mi'],
        'last_name' => ['last name', 'lastname', 'surname', 'family name', 'lname'],
        'gender' => ['gender', 'sex'],
        'civil_status' => ['civil status', 'civilstatus', 'marital status'],
        'age' => ['age'],
        'birth_date' => ['birth date', 'birthdate', 'date of birth', 'dob', 'birthday'],
        'date_hired' => ['date hired', 'datehired', 'hire date', 'date of hire', 'hired date', 'date placed', 'placement date'],
        'position' => ['position', 'job title', 'designation', 'position applied for', 'role', 'post'],
        'department' => ['department', 'dept', 'section', 'unit'],
        'address' => ['address', 'residence', 'city municipality of residence', 'city/municipality', 'home address'],
        'educational_attainment' => ['educational attainment', 'education', 'highest educational attainment', 'educ attainment', 'educ'],
        'assigned_company' => ['assigned company', 'company', 'client', 'deployed to', 'principal', 'establishment'],
    ];

    /**
     * Read an uploaded spreadsheet into a normalized grid of header + rows.
     *
     * @return array{headers: array<int, string>, rows: array<int, array<string, string>>, row_count: int}
     */
    public function parse(string $absolutePath): array
    {
        $reader = IOFactory::createReaderForFile($absolutePath);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($absolutePath);
        $sheet = $spreadsheet->getActiveSheet();
        $grid = $sheet->toArray(null, true, false, false);

        // Drop fully empty leading/trailing rows.
        $grid = array_values(array_filter($grid, fn ($row) => collect($row)->filter(fn ($v) => trim((string) $v) !== '')->isNotEmpty()));

        if ($grid === []) {
            return ['headers' => [], 'rows' => [], 'row_count' => 0];
        }

        $headerIndex = $this->detectHeaderRow($grid);
        $headerRow = $grid[$headerIndex] ?? [];
        $headers = $this->normalizeHeaders($headerRow);

        $rows = [];
        foreach (array_slice($grid, $headerIndex + 1) as $rawRow) {
            $assoc = [];
            $hasValue = false;
            foreach ($headers as $col => $header) {
                $value = isset($rawRow[$col]) ? trim((string) $rawRow[$col]) : '';
                $assoc[$header] = $value;
                if ($value !== '') {
                    $hasValue = true;
                }
            }
            if ($hasValue) {
                $rows[] = $assoc;
            }
        }

        return [
            'headers' => array_values($headers),
            'rows' => $rows,
            'row_count' => count($rows),
        ];
    }

    /**
     * Suggest a source-column -> canonical-field mapping from detected headers.
     *
     * @param  array<int, string>  $headers
     * @return array<string, string|null>
     */
    public function suggestMapping(array $headers): array
    {
        $suggestions = [];
        $used = [];

        foreach ($headers as $header) {
            $normalized = $this->normalizeText($header);
            $match = null;

            foreach (self::FIELD_ALIASES as $field => $aliases) {
                if (in_array($field, $used, true)) {
                    continue;
                }
                foreach ($aliases as $alias) {
                    if ($normalized === $this->normalizeText($alias)) {
                        $match = $field;
                        break 2;
                    }
                }
            }

            // Fall back to a contains match if no exact alias hit.
            if ($match === null) {
                foreach (self::FIELD_ALIASES as $field => $aliases) {
                    if (in_array($field, $used, true)) {
                        continue;
                    }
                    foreach ($aliases as $alias) {
                        $normalizedAlias = $this->normalizeText($alias);
                        if ($normalized !== '' && (Str::contains($normalized, $normalizedAlias) || Str::contains($normalizedAlias, $normalized))) {
                            $match = $field;
                            break 2;
                        }
                    }
                }
            }

            if ($match !== null) {
                $used[] = $match;
            }
            $suggestions[$header] = $match;
        }

        return $suggestions;
    }

    /**
     * Rebuild placement_records for an upload from its confirmed mapping.
     *
     * @param  array<string, string|null>  $mapping  source column => canonical field|null
     */
    public function buildRecords(PlacementReportUpload $upload, array $mapping): int
    {
        $absolutePath = Storage::disk('local')->path($upload->stored_path);
        $parsed = $this->parse($absolutePath);

        $upload->records()->delete();

        $canLinkSeekers = Schema::hasTable('job_seekers');
        $created = 0;

        foreach ($parsed['rows'] as $row) {
            $record = ['raw_row' => $row];
            foreach ($mapping as $sourceColumn => $targetField) {
                if (! $targetField || ! array_key_exists($targetField, PlacementRecord::MAPPABLE_FIELDS)) {
                    continue;
                }
                $record[$targetField] = $row[$sourceColumn] ?? null;
            }

            $normalized = $this->normalizeRecord($record);
            if ($this->isBlankRecord($normalized)) {
                continue;
            }

            $normalized['upload_id'] = $upload->id;
            $normalized['employer_id'] = $upload->employer_id;
            $normalized['seeker_id'] = $canLinkSeekers ? $this->matchSeeker($normalized) : null;

            PlacementRecord::create($normalized);
            $created++;
        }

        return $created;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Pick the row that looks most like a header (highest count of cells that
     * resolve to a known field). Employer files often carry logo/title rows first.
     */
    private function detectHeaderRow(array $grid): int
    {
        $bestIndex = 0;
        $bestScore = -1;
        $limit = min(self::HEADER_SCAN_LIMIT, count($grid));

        for ($i = 0; $i < $limit; $i++) {
            $score = 0;
            foreach ($grid[$i] as $cell) {
                $normalized = $this->normalizeText((string) $cell);
                if ($normalized === '') {
                    continue;
                }
                foreach (self::FIELD_ALIASES as $aliases) {
                    foreach ($aliases as $alias) {
                        if ($normalized === $this->normalizeText($alias)) {
                            $score++;
                            break 2;
                        }
                    }
                }
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestIndex = $i;
            }
        }

        return $bestIndex;
    }

    /**
     * Turn a raw header row into unique, non-empty column labels.
     *
     * @return array<int, string>
     */
    private function normalizeHeaders(array $headerRow): array
    {
        $headers = [];
        $seen = [];
        foreach ($headerRow as $index => $value) {
            $label = trim((string) $value);
            if ($label === '') {
                $label = 'Column '.($index + 1);
            }
            $key = Str::lower($label);
            if (isset($seen[$key])) {
                $seen[$key]++;
                $label .= ' ('.$seen[$key].')';
            } else {
                $seen[$key] = 1;
            }
            $headers[$index] = $label;
        }

        return $headers;
    }

    private function normalizeRecord(array $record): array
    {
        $out = ['raw_row' => $record['raw_row'] ?? null];

        foreach (array_keys(PlacementRecord::MAPPABLE_FIELDS) as $field) {
            $value = isset($record[$field]) ? trim((string) $record[$field]) : '';
            if ($value === '') {
                $out[$field] = null;
                continue;
            }

            $out[$field] = match ($field) {
                'age' => $this->parseAge($value),
                'birth_date', 'date_hired' => $this->parseDate($value),
                default => Str::of($value)->squish()->limit(255, '')->toString(),
            };
        }

        return $out;
    }

    private function isBlankRecord(array $record): bool
    {
        return collect($record)
            ->except('raw_row')
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->isEmpty();
    }

    private function parseAge(string $value): ?int
    {
        if (! preg_match('/\d{1,3}/', $value, $matches)) {
            return null;
        }
        $age = (int) $matches[0];

        return ($age >= 15 && $age <= 100) ? $age : null;
    }

    private function parseDate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        // Excel serial date (data-only reads return numerics for date cells).
        if (is_numeric($value) && (float) $value > 25569 && (float) $value < 60000) {
            try {
                return ExcelDate::excelToDateTimeObject((float) $value)->format('Y-m-d');
            } catch (\Throwable) {
                // fall through to string parsing
            }
        }

        // Base \DateTime::createFromFormat returns false on mismatch (Carbon's
        // equivalent throws), so it is safe to try each candidate format in turn.
        foreach (['Y-m-d', 'm/d/Y', 'd/m/Y', 'm-d-Y', 'd-m-Y', 'F j, Y', 'M j, Y', 'j F Y'] as $format) {
            $parsed = \DateTime::createFromFormat($format, $value);
            if ($parsed !== false) {
                $year = (int) $parsed->format('Y');
                if ($year >= 1940 && $year <= (int) now()->year + 1) {
                    return $parsed->format('Y-m-d');
                }
            }
        }

        try {
            $parsed = Carbon::parse($value);
            if ($parsed->year >= 1940 && $parsed->year <= (int) now()->year + 1) {
                return $parsed->format('Y-m-d');
            }
        } catch (\Throwable) {
            // unparseable — keep the record but leave the date null
        }

        return null;
    }

    private function matchSeeker(array $record): ?int
    {
        $first = $this->normalizeText((string) ($record['first_name'] ?? ''));
        $last = $this->normalizeText((string) ($record['last_name'] ?? ''));
        if ($first === '' || $last === '') {
            return null;
        }

        return JobSeeker::query()
            ->whereRaw('LOWER(TRIM(first_name)) = ?', [$first])
            ->whereRaw('LOWER(TRIM(last_name)) = ?', [$last])
            ->value('seeker_id');
    }

    private function normalizeText(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->toString();
    }
}
