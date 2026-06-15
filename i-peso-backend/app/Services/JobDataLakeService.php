<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class JobDataLakeService
{
    public function searchJobs(array $parameters = []): array
    {
        return $this->client()
            ->get($this->url('/v1/jobs'), $parameters)
            ->throw()
            ->json();
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->withHeaders(['X-API-Key' => $this->apiKey()])
            ->timeout(20)
            ->retry(2, 500);
    }

    private function url(string $path): string
    {
        return rtrim((string) config('services.jobdatalake.base_url'), '/').'/'.ltrim($path, '/');
    }

    private function apiKey(): string
    {
        $key = trim((string) config('services.jobdatalake.key'));

        if ($key === '') {
            throw new RuntimeException('JobDataLake is not configured.');
        }

        return $key;
    }
}
