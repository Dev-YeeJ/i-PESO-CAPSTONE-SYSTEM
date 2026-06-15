<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleMapsService
{
    public function autocomplete(
        string $text,
        ?float $latitude = null,
        ?float $longitude = null,
        ?string $sessionToken = null
    ): array {
        $body = [
            'input' => $text,
            'includedRegionCodes' => [strtolower($this->countryCode())],
            'languageCode' => $this->language(),
            'regionCode' => $this->countryCode(),
        ];

        if ($latitude !== null && $longitude !== null) {
            $body['locationBias'] = [
                'circle' => [
                    'center' => [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                    ],
                    'radius' => 50000,
                ],
            ];
        }

        if ($sessionToken) {
            $body['sessionToken'] = $sessionToken;
        }

        $response = $this->placesClient(
            'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat'
        )->post($this->placesUrl('/places:autocomplete'), $body)
            ->throw()
            ->json();

        return collect($response['suggestions'] ?? [])
            ->pluck('placePrediction')
            ->filter()
            ->map(function (array $prediction) {
                $mainText = $prediction['structuredFormat']['mainText']['text'] ?? null;
                $secondaryText = $prediction['structuredFormat']['secondaryText']['text'] ?? null;

                return [
                    'place_id' => $prediction['placeId'] ?? null,
                    'formatted' => $prediction['text']['text'] ?? null,
                    'address_line1' => $mainText,
                    'address_line2' => $secondaryText,
                    'latitude' => null,
                    'longitude' => null,
                    'province_name' => null,
                    'city_name' => null,
                    'barangay_name' => null,
                    'street' => null,
                    'house_number' => null,
                    'postcode' => null,
                    'result_type' => 'autocomplete',
                ];
            })
            ->values()
            ->all();
    }

    public function place(string $placeId, ?string $sessionToken = null): ?array
    {
        $parameters = array_filter([
            'languageCode' => $this->language(),
            'regionCode' => $this->countryCode(),
            'sessionToken' => $sessionToken,
        ]);

        return Cache::remember(
            'google-maps:place:'.sha1($placeId),
            now()->addDays(30),
            function () use ($placeId, $parameters) {
                $result = $this->placesClient(
                    'id,formattedAddress,addressComponents,location,types'
                )->get($this->placesUrl('/places/'.urlencode($placeId)), $parameters)
                    ->throw()
                    ->json();

                return $result ? $this->normalizeLocation($result) : null;
            }
        );
    }

    public function geocode(string $address): ?array
    {
        return Cache::remember(
            'google-maps:geocode:'.sha1($address),
            now()->addDays(7),
            function () use ($address) {
                $result = $this->geocodingClient()
                    ->get($this->geocodingUrl(), [
                        'address' => $address,
                        'components' => 'country:'.$this->countryCode(),
                        'language' => $this->language(),
                        'region' => strtolower($this->countryCode()),
                        'key' => $this->apiKey(),
                    ])
                    ->throw()
                    ->json('results.0');

                return $result ? $this->normalizeLocation($result) : null;
            }
        );
    }

    public function reverse(float $latitude, float $longitude): ?array
    {
        return Cache::remember(
            'google-maps:reverse:v2:'.round($latitude, 5).':'.round($longitude, 5),
            now()->addDays(7),
            function () use ($latitude, $longitude) {
                $results = $this->geocodingClient()
                    ->get($this->geocodingUrl(), [
                        'latlng' => "{$latitude},{$longitude}",
                        'language' => $this->language(),
                        'region' => strtolower($this->countryCode()),
                        'result_type' => 'street_address|premise|subpremise|route|neighborhood|political',
                        'key' => $this->apiKey(),
                    ])
                    ->throw()
                    ->json('results', []);

                return $this->normalizeReverseResults($results);
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
        $this->ensureRoutesEnabled();

        $response = $this->routesClient('routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline')
            ->post($this->routesUrl('/directions/v2:computeRoutes'), [
                'origin' => ['location' => ['latLng' => ['latitude' => $originLatitude, 'longitude' => $originLongitude]]],
                'destination' => ['location' => ['latLng' => ['latitude' => $destinationLatitude, 'longitude' => $destinationLongitude]]],
                'travelMode' => $this->travelMode($mode),
                'units' => 'METRIC',
            ])
            ->throw()
            ->json();

        $route = $response['routes'][0] ?? null;
        if (! $route) {
            throw new RuntimeException('Google Maps could not calculate a route for these locations.');
        }

        $distanceMeters = (float) ($route['distanceMeters'] ?? 0);
        $durationSeconds = $this->durationSeconds((string) ($route['duration'] ?? '0s'));

        return [
            'distance_meters' => $distanceMeters,
            'distance_kilometers' => round($distanceMeters / 1000, 2),
            'duration_seconds' => $durationSeconds,
            'duration_minutes' => (int) ceil($durationSeconds / 60),
            'mode' => $mode,
            'geometry' => [
                'type' => 'encoded_polyline',
                'encoded' => $route['polyline']['encodedPolyline'] ?? null,
            ],
        ];
    }

    public function matrix(array $sources, array $targets, string $mode = 'drive'): array
    {
        $this->ensureRoutesEnabled();

        $elements = $this->routesClient(
            'originIndex,destinationIndex,status,condition,distanceMeters,duration'
        )->post($this->routesUrl('/distanceMatrix/v2:computeRouteMatrix'), [
            'origins' => collect($sources)->map(fn (array $point) => [
                'waypoint' => ['location' => ['latLng' => [
                    'latitude' => $point['latitude'],
                    'longitude' => $point['longitude'],
                ]]],
            ])->values()->all(),
            'destinations' => collect($targets)->map(fn (array $point) => [
                'waypoint' => ['location' => ['latLng' => [
                    'latitude' => $point['latitude'],
                    'longitude' => $point['longitude'],
                ]]],
            ])->values()->all(),
            'travelMode' => $this->travelMode($mode),
        ])->throw()->json();

        $matrix = array_fill(0, count($sources), array_fill(0, count($targets), null));
        foreach ($elements as $element) {
            $matrix[$element['originIndex']][$element['destinationIndex']] = [
                'distance' => $element['distanceMeters'] ?? null,
                'time' => isset($element['duration'])
                    ? $this->durationSeconds($element['duration'])
                    : null,
                'status' => $element['condition'] ?? $element['status'] ?? null,
            ];
        }

        return $matrix;
    }

    private function normalizeLocation(array $result): array
    {
        $components = collect($result['addressComponents'] ?? $result['address_components'] ?? []);
        $component = function (array $types) use ($components): ?string {
            foreach ($types as $type) {
                $match = $components->first(
                    fn (array $item) => in_array($type, $item['types'] ?? [], true)
                );

                if ($match) {
                    return $match['longText'] ?? $match['long_name'] ?? null;
                }
            }

            return null;
        };

        $location = $result['location'] ?? $result['geometry']['location'] ?? [];
        $street = $component(['route']);
        $houseNumber = $component(['street_number']);
        $addressLine1 = trim(collect([$houseNumber, $street])->filter()->implode(' '));
        $addressComponents = $components
            ->map(fn (array $item) => [
                'long_name' => $item['longText'] ?? $item['long_name'] ?? '',
                'short_name' => $item['shortText'] ?? $item['short_name'] ?? '',
                'types' => $item['types'] ?? [],
            ])
            ->values()
            ->all();

        return [
            'place_id' => $result['id'] ?? $result['place_id'] ?? null,
            'formatted' => $result['formattedAddress'] ?? $result['formatted_address'] ?? null,
            'address_line1' => $addressLine1 !== '' ? $addressLine1 : $component(['premise', 'subpremise']),
            'address_line2' => collect([
                $component(['sublocality_level_1', 'neighborhood']),
                $component(['locality', 'administrative_area_level_2']),
                $component(['administrative_area_level_1']),
                'Philippines',
            ])->filter()->unique()->implode(', '),
            'latitude' => isset($location['latitude']) ? (float) $location['latitude'] : (isset($location['lat']) ? (float) $location['lat'] : null),
            'longitude' => isset($location['longitude']) ? (float) $location['longitude'] : (isset($location['lng']) ? (float) $location['lng'] : null),
            'province_name' => $component(['administrative_area_level_1']),
            'city_name' => $component(['locality', 'administrative_area_level_2']),
            'barangay_name' => $component([
                'sublocality_level_1',
                'administrative_area_level_4',
                'sublocality',
                'neighborhood',
            ]),
            'street' => $street,
            'house_number' => $houseNumber,
            'postcode' => $component(['postal_code']),
            'result_type' => $result['types'][0] ?? null,
            'address_components' => $addressComponents,
        ];
    }

    private function normalizeReverseResults(array $results): ?array
    {
        if ($results === []) {
            return null;
        }

        $primary = $results[0];
        $components = collect($results)
            ->flatMap(fn (array $result) => $result['addressComponents'] ?? $result['address_components'] ?? [])
            ->unique(function (array $component) {
                $name = $component['longText'] ?? $component['long_name'] ?? '';
                $types = $component['types'] ?? [];

                return $name.'|'.implode(',', $types);
            })
            ->values()
            ->all();

        unset($primary['addressComponents']);
        $primary['address_components'] = $components;

        return $this->normalizeLocation($primary);
    }

    private function placesClient(string $fieldMask): PendingRequest
    {
        return $this->client()->withHeaders([
            'X-Goog-Api-Key' => $this->apiKey(),
            'X-Goog-FieldMask' => $fieldMask,
        ]);
    }

    private function geocodingClient(): PendingRequest
    {
        return $this->client();
    }

    private function routesClient(string $fieldMask): PendingRequest
    {
        return $this->client()->withHeaders([
            'X-Goog-Api-Key' => $this->apiKey(),
            'X-Goog-FieldMask' => $fieldMask,
        ]);
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()->timeout(12)->retry(2, 250);
    }

    private function placesUrl(string $path): string
    {
        return rtrim((string) config('services.google_maps.places_base_url'), '/').$path;
    }

    private function geocodingUrl(): string
    {
        return rtrim((string) config('services.google_maps.geocoding_base_url'), '/').'/json';
    }

    private function routesUrl(string $path): string
    {
        return rtrim((string) config('services.google_maps.routes_base_url'), '/').$path;
    }

    private function apiKey(): string
    {
        $key = (string) config('services.google_maps.server_key');
        if ($key === '') {
            throw new RuntimeException('Google Maps Platform is not configured.');
        }

        return $key;
    }

    private function countryCode(): string
    {
        return strtoupper((string) config('services.google_maps.country_code', 'PH'));
    }

    private function language(): string
    {
        return (string) config('services.google_maps.language', 'en');
    }

    private function ensureRoutesEnabled(): void
    {
        if (! config('services.google_maps.routes_enabled')) {
            throw new RuntimeException('Google Routes API is disabled to control usage.');
        }
    }

    private function travelMode(string $mode): string
    {
        return match ($mode) {
            'walk' => 'WALK',
            'bicycle' => 'BICYCLE',
            'motorcycle' => 'TWO_WHEELER',
            default => 'DRIVE',
        };
    }

    private function durationSeconds(string $duration): float
    {
        return (float) rtrim($duration, 's');
    }
}
