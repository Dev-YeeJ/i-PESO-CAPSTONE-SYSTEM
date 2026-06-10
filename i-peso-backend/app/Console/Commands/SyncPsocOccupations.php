<?php

namespace App\Console\Commands;

use App\Models\Occupation;
use Illuminate\Console\Command;
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
        $page = 1;
        $synced = 0;

        do {
            $response = Http::acceptJson()
                ->timeout(60)
                ->retry(3, 1000)
                ->get("https://classification.psa.gov.ph/psoc/{$version}/unit", [
                    'token' => $token,
                    'page' => $page,
                    'page_size' => $pageSize,
                ]);

            $response->throw();
            $items = $this->itemsFromResponse($response->json());

            foreach ($items as $item) {
                $code = trim((string) ($item['unitcode'] ?? $item['code'] ?? ''));
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
        } while (count($items) === $pageSize);

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
}
