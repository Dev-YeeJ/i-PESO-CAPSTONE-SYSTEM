<?php

namespace Tests\Unit;

use App\Services\GoogleMapsService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class GoogleMapsServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.google_maps.server_key', 'test-key');
        config()->set('services.google_maps.places_base_url', 'https://places.googleapis.test/v1');
        config()->set('services.google_maps.geocoding_base_url', 'https://maps.googleapis.test/maps/api/geocode');
        config()->set('services.google_maps.routes_base_url', 'https://routes.googleapis.test');
        config()->set('services.google_maps.country_code', 'PH');
        config()->set('services.google_maps.language', 'en');
        config()->set('services.google_maps.routes_enabled', false);
        Cache::flush();
    }

    public function test_autocomplete_is_restricted_to_philippine_results(): void
    {
        Http::fake([
            'https://places.googleapis.test/v1/places:autocomplete' => Http::response([
                'suggestions' => [[
                    'placePrediction' => [
                        'placeId' => 'place-123',
                        'text' => ['text' => 'Poblacion, Urdaneta, Pangasinan, Philippines'],
                        'structuredFormat' => [
                            'mainText' => ['text' => 'Poblacion'],
                            'secondaryText' => ['text' => 'Urdaneta, Pangasinan, Philippines'],
                        ],
                    ],
                ]],
            ]),
        ]);

        $results = app(GoogleMapsService::class)->autocomplete(
            'Poblacion Urdaneta',
            null,
            null,
            'session-123'
        );

        $this->assertSame('place-123', $results[0]['place_id']);
        $this->assertSame('Poblacion', $results[0]['address_line1']);

        Http::assertSent(fn ($request) => $request['includedRegionCodes'] === ['ph']
            && $request['sessionToken'] === 'session-123'
            && $request->hasHeader('X-Goog-Api-Key', 'test-key'));
    }

    public function test_place_details_are_normalized_for_psgc_matching(): void
    {
        Http::fake([
            'https://places.googleapis.test/v1/places/place-123*' => Http::response([
                'id' => 'place-123',
                'formattedAddress' => 'Poblacion, Urdaneta City, Pangasinan, Philippines',
                'location' => ['latitude' => 15.976, 'longitude' => 120.5669],
                'types' => ['neighborhood'],
                'addressComponents' => [
                    ['longText' => '123', 'shortText' => '123', 'types' => ['street_number']],
                    ['longText' => 'Rizal Street', 'shortText' => 'Rizal St', 'types' => ['route']],
                    ['longText' => 'Poblacion', 'types' => ['sublocality_level_1']],
                    ['longText' => 'Urdaneta City', 'types' => ['locality']],
                    ['longText' => 'Pangasinan', 'types' => ['administrative_area_level_1']],
                ],
            ]),
        ]);

        $location = app(GoogleMapsService::class)->place('place-123');

        $this->assertSame('Pangasinan', $location['province_name']);
        $this->assertSame('Urdaneta City', $location['city_name']);
        $this->assertSame('Poblacion', $location['barangay_name']);
        $this->assertSame(15.976, $location['latitude']);
        $this->assertSame('123', $location['address_components'][0]['long_name']);
        $this->assertSame(['street_number'], $location['address_components'][0]['types']);
        $this->assertSame('Rizal St', $location['address_components'][1]['short_name']);
    }

    public function test_reverse_geocoding_recovers_barangay_from_alternate_result(): void
    {
        Http::fake([
            'https://maps.googleapis.test/maps/api/geocode/json*' => Http::response([
                'results' => [
                    [
                        'place_id' => 'plus-code-result',
                        'formatted_address' => 'WRCX+MRJ, Umingan, Pangasinan, Philippines',
                        'geometry' => [
                            'location' => ['lat' => 15.9, 'lng' => 120.8],
                        ],
                        'types' => ['plus_code'],
                        'address_components' => [
                            ['long_name' => 'Rural Umingan Area', 'types' => ['neighborhood']],
                            ['long_name' => 'Umingan', 'types' => ['locality']],
                            ['long_name' => 'Pangasinan', 'types' => ['administrative_area_level_2']],
                            ['long_name' => 'Ilocos Region', 'types' => ['administrative_area_level_1']],
                        ],
                    ],
                    [
                        'place_id' => 'barangay-result',
                        'formatted_address' => 'San Leon, Umingan, Pangasinan, Philippines',
                        'geometry' => [
                            'location' => ['lat' => 15.9, 'lng' => 120.8],
                        ],
                        'types' => ['political'],
                        'address_components' => [
                            ['long_name' => 'San Leon', 'types' => ['administrative_area_level_4']],
                            ['long_name' => 'Umingan', 'types' => ['locality']],
                            ['long_name' => 'Pangasinan', 'types' => ['administrative_area_level_2']],
                        ],
                    ],
                ],
            ]),
        ]);

        $location = app(GoogleMapsService::class)->reverse(15.9, 120.8);

        $this->assertSame('San Leon', $location['barangay_name']);
        $this->assertSame('WRCX+MRJ, Umingan, Pangasinan, Philippines', $location['formatted']);
        $this->assertContains(
            ['long_name' => 'San Leon', 'short_name' => '', 'types' => ['administrative_area_level_4']],
            $location['address_components']
        );
    }

    public function test_routes_are_disabled_by_default_to_control_usage(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Google Routes API is disabled');

        app(GoogleMapsService::class)->route(15.97, 120.56, 16.04, 120.33);
    }
}
