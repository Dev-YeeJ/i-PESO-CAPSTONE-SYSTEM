<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeoapifyService
{
    public function autocomplete(string $text, ?float $latitude = null, ?float $longitude = null): array
    {
        $parameters = [
            'text' => $text,
            'format' => 'json',
            'filter' => 'countrycode:ph',
            'lang' => 'en',
            'limit' => 8,
        ];

        if ($latitude !== null && $longitude !== null) {
            $parameters['bias'] = "proximity:{$longitude},{$latitude}";
        }

        return Cache::remember(
            'geoapify:autocomplete:'.sha1(json_encode($parameters)),
            now()->addHours(12),
            fn () => collect($this->get('/geocode/autocomplete', $parameters)['results'] ?? [])
                ->map(fn (array $result) => $this->normalizeLocation($result))
                ->values()
                ->all()
        );
    }

    public function geocode(string $address): ?array
    {
        $parameters = [
            'text' => $address,
            'format' => 'json',
            'filter' => 'countrycode:ph',
            'lang' => 'en',
            'limit' => 1,
        ];

        return Cache::remember(
            'geoapify:geocode:'.sha1($address),
            now()->addDays(7),
            function () use ($parameters) {
                $result = $this->get('/geocode/search', $parameters)['results'][0] ?? null;

                return $result ? $this->normalizeLocation($result) : null;
            }
        );
    }

    public function reverse(float $latitude, float $longitude): ?array
    {
        $parameters = [
            'lat' => $latitude,
            'lon' => $longitude,
            'format' => 'json',
            'lang' => 'en',
        ];

        return Cache::remember(
            'geoapify:reverse:'.round($latitude, 5).':'.round($longitude, 5),
            now()->addDays(7),
            function () use ($parameters) {
                $result = $this->get('/geocode/reverse', $parameters)['results'][0] ?? null;

                return $result ? $this->normalizeLocation($result) : null;
            }
        );
    }

    public function route(
        float $originLatitude,
        float $originLongitude,
        float $destinationLatitude,
        float $destinationLongitude,
        string $mode = 'drive'
    ): array {
        $response = $this->get('/routing', [
            'waypoints' => "{$originLatitude},{$originLongitude}|{$destinationLatitude},{$destinationLongitude}",
            'mode' => $mode,
            'units' => 'metric',
        ]);

        $feature = $response['features'][0] ?? null;
        if (! $feature) {
            throw new RuntimeException('Geoapify could not calculate a route for these locations.');
        }

        $properties = $feature['properties'] ?? [];
        $distanceMeters = (float) ($properties['distance'] ?? 0);
        $durationSeconds = (float) ($properties['time'] ?? 0);

        return [
            'distance_meters' => $distanceMeters,
            'distance_kilometers' => round($distanceMeters / 1000, 2),
            'duration_seconds' => $durationSeconds,
            'duration_minutes' => (int) ceil($durationSeconds / 60),
            'mode' => $mode,
            'geometry' => $feature['geometry'] ?? null,
        ];
    }

    public function matrix(array $sources, array $targets, string $mode = 'drive'): array
    {
        $response = $this->client()
            ->post($this->url('/routematrix').'?apiKey='.urlencode($this->apiKey()), [
                'mode' => $mode,
                'units' => 'metric',
                'sources' => collect($sources)
                    ->map(fn (array $point) => ['location' => [$point['longitude'], $point['latitude']]])
                    ->all(),
                'targets' => collect($targets)
                    ->map(fn (array $point) => ['location' => [$point['longitude'], $point['latitude']]])
                    ->all(),
            ])
            ->throw()
            ->json();

        return $response['sources_to_targets'] ?? [];
    }

    private function normalizeLocation(array $result): array
    {
        return [
            'place_id' => $result['place_id'] ?? null,
            'formatted' => $result['formatted'] ?? null,
            'address_line1' => $result['address_line1'] ?? null,
            'address_line2' => $result['address_line2'] ?? null,
            'latitude' => isset($result['lat']) ? (float) $result['lat'] : null,
            'longitude' => isset($result['lon']) ? (float) $result['lon'] : null,
            'province_name' => $result['state'] ?? $result['region'] ?? null,
            'city_name' => $result['city'] ?? $result['municipality'] ?? $result['county'] ?? null,
            'barangay_name' => $result['suburb']
                ?? $result['district']
                ?? $result['village']
                ?? $result['neighbourhood']
                ?? null,
            'street' => $result['street'] ?? null,
            'house_number' => $result['housenumber'] ?? null,
            'postcode' => $result['postcode'] ?? null,
            'result_type' => $result['result_type'] ?? null,
        ];
    }

    private function get(string $path, array $parameters): array
    {
        return $this->client()
            ->get($this->url($path), [
                ...$parameters,
                'apiKey' => $this->apiKey(),
            ])
            ->throw()
            ->json();
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->timeout(12)
            ->retry(2, 250);
    }

    private function url(string $path): string
    {
        return rtrim((string) config('services.geoapify.base_url'), '/').'/'.ltrim($path, '/');
    }

    private function apiKey(): string
    {
        $key = (string) config('services.geoapify.key');

        if ($key === '') {
            throw new RuntimeException('Geoapify is not configured.');
        }

        return $key;
    }
}
