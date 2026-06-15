<?php

namespace App\Console\Commands;

use App\Models\Occupation;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class SyncPsocOccupations extends Command
{
    protected $signature = 'occupations:sync-psoc
        {--psoc-version=2012 : PSOC version}
        {--page-size=500 : PSA API page size}';

    protected $description = 'Synchronize the occupation catalog from the official PSA PSOC API';

    public function handle(): int
    {
        $token = config('services.psoc.token');
        if (! $token) {
            $this->error('PSOC_API_TOKEN is not configured.');
            $this->line('Request PSA Classification API access, then add the token to .env.');

            return self::FAILURE;
        }

        $version = (string) $this->option('psoc-version');
        $pageSize = max(1, min(500, (int) $this->option('page-size')));
        $baseUrl = rtrim((string) config('services.psoc.base_url'), '/');
        $page = 1;
        $synced = 0;

        do {
            try {
                $response = Http::acceptJson()
                    ->timeout(60)
                    ->retry(3, 1000, throw: false)
                    ->get("{$baseUrl}/{$version}/unit", [
                        'token' => $token,
                        'page' => $page,
                        'page_size' => $pageSize,
                    ]);
            } catch (ConnectionException) {
                $this->error("Unable to connect to the PSA PSOC API on page {$page}.");

                return self::FAILURE;
            }

            if ($response->failed()) {
                $this->reportRequestFailure($response->status(), $response->header('Cf-Mitigated'), $page);

                return self::FAILURE;
            }

            $payload = $response->json();
            $items = $this->itemsFromResponse($payload);

            foreach ($items as $item) {
                $code = $this->normalizeUnitCode($item['unitcode'] ?? $item['code'] ?? null);
                $title = Str::of((string) ($item['title'] ?? ''))->squish()->title()->toString();

                if ($code === '' || $title === '') {
                    continue;
                }

                Occupation::updateOrCreate(
                    ['psoc_code' => $code],
                    [
                        'title' => $title,
                        'description' => $item['description'] ?? null,
                        'search_terms' => Str::lower($title),
                        'version' => (string) ($item['version'] ?? $version),
                        'source' => 'psa',
                        'is_active' => true,
                    ]
                );
                $synced++;
            }

            $page++;
        } while ($this->hasNextPage($payload, $page - 1, $pageSize, count($items)));

        Occupation::query()
            ->where('source', 'fallback')
            ->get()
            ->each(function (Occupation $fallback) {
                if (Occupation::where('source', 'psa')->where('title', $fallback->title)->exists()) {
                    $fallback->update(['is_active' => false]);
                }
            });

        DB::table('seeker_occupations')
            ->whereNull('occupation_id')
            ->eachById(function ($preference) {
                $occupationId = Occupation::where('title', $preference->occupation_title)
                    ->where('is_active', true)
                    ->value('id');
                if ($occupationId) {
                    DB::table('seeker_occupations')
                        ->where('id', $preference->id)
                        ->update(['occupation_id' => $occupationId]);
                }
            });

        DB::table('job_vacancies')
            ->whereNull('occupation_id')
            ->eachById(function ($vacancy) {
                $occupationId = Occupation::where('title', $vacancy->job_title)
                    ->where('is_active', true)
                    ->value('id');
                if ($occupationId) {
                    DB::table('job_vacancies')
                        ->where('post_id', $vacancy->post_id)
                        ->update(['occupation_id' => $occupationId]);
                }
            }, column: 'post_id');

        $this->info("Synchronized {$synced} PSOC unit groups.");

        return self::SUCCESS;
    }

    private function itemsFromResponse(mixed $payload): array
    {
        if (! is_array($payload)) {
            throw new RuntimeException('Unexpected PSA PSOC response.');
        }

        foreach (['data', 'results', 'items'] as $key) {
            if (isset($payload[$key]) && is_array($payload[$key])) {
                return array_values($payload[$key]);
            }
        }

        return array_is_list($payload) ? $payload : [];
    }

    private function hasNextPage(mixed $payload, int $page, int $pageSize, int $itemCount): bool
    {
        if (! is_array($payload)) {
            return false;
        }

        if (array_key_exists('next', $payload)) {
            return filled($payload['next']);
        }

        if (isset($payload['count']) && is_numeric($payload['count'])) {
            return ($page * $pageSize) < (int) $payload['count'];
        }

        return $itemCount === $pageSize;
    }

    private function normalizeUnitCode(mixed $code): string
    {
        $normalized = trim((string) $code);
        if ($normalized === '' || ! ctype_digit($normalized)) {
            return $normalized;
        }

        return str_pad($normalized, 4, '0', STR_PAD_LEFT);
    }

    private function reportRequestFailure(int $status, ?string $cloudflareMitigation, int $page): void
    {
        if ($status === 403 && Str::lower((string) $cloudflareMitigation) === 'challenge') {
            $this->error('The PSA PSOC API returned a Cloudflare browser challenge (HTTP 403).');
            $this->line('The request did not reach token authentication. Ask PSA to allow server-to-server API access or allowlist this server IP.');

            return;
        }

        $this->error("The PSA PSOC API request failed with HTTP {$status} on page {$page}.");
    }
}
