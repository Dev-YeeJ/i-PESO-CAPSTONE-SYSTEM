<?php

namespace Tests\Unit;

use App\Services\GeoapifyService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeoapifyServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.geoapify.key', 'test-key');
        config()->set('services.geoapify.base_url', 'https://api.geoapify.test/v1');
        Cache::flush();
    }

    public function test_autocomplete_is_restricted_to_philippine_results_and_normalized(): void
    {
        Http::fake([
            'https://api.geoapify.test/v1/geocode/autocomplete*' => Http::response([
                'results' => [[
                    'place_id' => 'place-123',
                    'formatted' => 'Poblacion, Urdaneta, Pangasinan, Philippines',
                    'address_line1' => 'Poblacion',
                    'address_line2' => 'Urdaneta, Pangasinan, Philippines',
                    'lat' => 15.976,
                    'lon' => 120.5669,
                    'state' => 'Pangasinan',
                    'city' => 'Urdaneta',
                    'suburb' => 'Poblacion',
                    'result_type' => 'suburb',
                ]],
            ]),
        ]);

        $results = app(GeoapifyService::class)->autocomplete('Poblacion Urdaneta');

        $this->assertSame('place-123', $results[0]['place_id']);
        $this->assertSame('Pangasinan', $results[0]['province_name']);
        $this->assertSame('Poblacion', $results[0]['barangay_name']);

        Http::assertSent(fn ($request) => str_contains($request->url(), 'filter=countrycode%3Aph'));
    }

    public function test_route_returns_kilometers_and_minutes(): void
    {
        Http::fake([
            'https://api.geoapify.test/v1/routing*' => Http::response([
                'features' => [[
                    'properties' => [
                        'distance' => 12500,
                        'time' => 1500,
                    ],
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => [],
                    ],
                ]],
            ]),
        ]);

        $route = app(GeoapifyService::class)->route(15.97, 120.56, 16.04, 120.33);

        $this->assertSame(12.5, $route['distance_kilometers']);
        $this->assertSame(25, $route['duration_minutes']);
        $this->assertSame('drive', $route['mode']);
    }
}
