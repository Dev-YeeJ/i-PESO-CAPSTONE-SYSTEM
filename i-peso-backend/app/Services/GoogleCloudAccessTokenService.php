<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class GoogleCloudAccessTokenService
{
    private const CACHE_KEY = 'google_cloud_access_token';

    public function token(): ?string
    {
        $cached = Cache::get(self::CACHE_KEY);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $token = $this->configuredToken()
            ?? $this->applicationDefaultCredentialsToken()
            ?? $this->metadataServerToken();

        if ($token) {
            Cache::put(self::CACHE_KEY, $token, now()->addMinutes(50));
        }

        return $token;
    }

    private function configuredToken(): ?string
    {
        $token = config('services.vertex_ai.access_token');

        return is_string($token) && trim($token) !== '' ? trim($token) : null;
    }

    private function applicationDefaultCredentialsToken(): ?string
    {
        $path = $this->adcPath();
        if (! $path || ! is_readable($path)) {
            return null;
        }

        $credentials = json_decode((string) file_get_contents($path), true);
        if (! is_array($credentials) || ($credentials['type'] ?? null) !== 'authorized_user') {
            return null;
        }

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->timeout(10)
                ->post('https://oauth2.googleapis.com/token', [
                    'client_id' => $credentials['client_id'] ?? '',
                    'client_secret' => $credentials['client_secret'] ?? '',
                    'refresh_token' => $credentials['refresh_token'] ?? '',
                    'grant_type' => 'refresh_token',
                ]);
        } catch (Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        return $response->json('access_token');
    }

    private function metadataServerToken(): ?string
    {
        try {
            $response = Http::acceptJson()
                ->withHeaders(['Metadata-Flavor' => 'Google'])
                ->timeout(2)
                ->get('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token');
        } catch (Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        return $response->json('access_token');
    }

    private function adcPath(): ?string
    {
        $configured = config('services.vertex_ai.credentials_path');
        if (is_string($configured) && $configured !== '') {
            return preg_match('/^([A-Za-z]:)?[\/\\\\]/', $configured) === 1
                ? $configured
                : base_path($configured);
        }

        $appData = getenv('APPDATA');
        if ($appData) {
            return rtrim($appData, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'gcloud'.DIRECTORY_SEPARATOR.'application_default_credentials.json';
        }

        $home = getenv('HOME') ?: getenv('USERPROFILE');
        if ($home) {
            return rtrim($home, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'.config'.DIRECTORY_SEPARATOR.'gcloud'.DIRECTORY_SEPARATOR.'application_default_credentials.json';
        }

        return null;
    }
}
