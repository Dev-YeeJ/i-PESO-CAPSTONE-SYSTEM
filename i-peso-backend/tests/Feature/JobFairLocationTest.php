<?php

namespace Tests\Feature;

use App\Models\Administrator;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Job fair venues now capture the same GPS-friendly PSGC address + map pin
 * that job vacancy posting does (province/city/barangay + lat/long), instead
 * of a single free-text "venue" string.
 */
class JobFairLocationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.google_maps.server_key', 'test-key');
        config()->set('services.google_maps.geocoding_base_url', 'https://maps.googleapis.test/maps/api/geocode');
        config()->set('services.google_maps.country_code', 'PH');
        config()->set('services.google_maps.language', 'en');
        Cache::flush();

        $this->createTables();
    }

    public function test_creating_a_job_fair_with_a_dropped_pin_persists_the_location_as_is(): void
    {
        Sanctum::actingAs($this->admin());
        Http::fake();

        $response = $this->postJson('/api/admin/job-fairs', $this->payload([
            'latitude' => 15.9762,
            'longitude' => 120.5721,
            'google_place_id' => 'pin-dropped-place-id',
        ]))->assertCreated();

        $response->assertJsonPath('job_fair.province', 'Pangasinan')
            ->assertJsonPath('job_fair.city_municipality', 'Urdaneta City')
            ->assertJsonPath('job_fair.barangay', 'Nancayasan')
            ->assertJsonPath('job_fair.latitude', 15.9762)
            ->assertJsonPath('job_fair.longitude', 120.5721)
            ->assertJsonPath('job_fair.google_place_id', 'pin-dropped-place-id')
            ->assertJsonPath('job_fair.full_address', 'SM City Urdaneta - Events Center, Nancayasan, Urdaneta City, Pangasinan');

        // A pin was already supplied, so the geocoder must not be consulted.
        Http::assertNothingSent();
    }

    public function test_missing_coordinates_are_filled_in_by_geocoding_the_psgc_address(): void
    {
        Sanctum::actingAs($this->admin());
        Http::fake([
            'https://maps.googleapis.test/maps/api/geocode/json*' => Http::response([
                'results' => [[
                    'place_id' => 'geocoded-place-id',
                    'formatted_address' => 'Nancayasan, Urdaneta City, Pangasinan, Philippines',
                    'geometry' => ['location' => ['lat' => 15.9762, 'lng' => 120.5721]],
                    'address_components' => [],
                ]],
            ]),
        ]);

        $payload = $this->payload();
        unset($payload['latitude'], $payload['longitude'], $payload['google_place_id']);

        $response = $this->postJson('/api/admin/job-fairs', $payload)->assertCreated();

        $response->assertJsonPath('job_fair.latitude', 15.9762)
            ->assertJsonPath('job_fair.longitude', 120.5721)
            ->assertJsonPath('job_fair.google_place_id', 'geocoded-place-id');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/geocode/json')
                && str_contains($request['address'], 'SM City Urdaneta - Events Center')
                && str_contains($request['address'], 'Urdaneta City');
        });
    }

    public function test_province_city_and_barangay_are_required_to_create_a_job_fair(): void
    {
        Sanctum::actingAs($this->admin());

        $payload = $this->payload();
        unset($payload['province'], $payload['city_municipality'], $payload['barangay']);

        $this->postJson('/api/admin/job-fairs', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['province', 'city_municipality', 'barangay']);
    }

    public function test_submission_deadline_cannot_be_in_the_past_or_after_the_start_date(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/job-fairs', $this->payload(['submission_deadline' => '2020-01-01']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['submission_deadline']);

        // start_date in payload() is 2026-10-10 — a deadline after that is invalid too.
        $this->postJson('/api/admin/job-fairs', $this->payload(['submission_deadline' => '2026-10-11']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['submission_deadline']);

        $this->postJson('/api/admin/job-fairs', $this->payload(['submission_deadline' => '2026-10-10']))
            ->assertCreated();
    }

    public function test_a_geocoding_failure_does_not_block_saving_the_job_fair(): void
    {
        Sanctum::actingAs($this->admin());
        Http::fake(['https://maps.googleapis.test/*' => Http::response(['error' => 'quota exceeded'], 500)]);

        $payload = $this->payload();
        unset($payload['latitude'], $payload['longitude'], $payload['google_place_id']);

        $response = $this->postJson('/api/admin/job-fairs', $payload)->assertCreated();

        $response->assertJsonPath('job_fair.latitude', null)
            ->assertJsonPath('job_fair.longitude', null)
            ->assertJsonPath('job_fair.venue', 'SM City Urdaneta - Events Center');
    }

    public function test_editing_only_the_status_does_not_trigger_a_geocode_lookup(): void
    {
        Sanctum::actingAs($this->admin());
        Http::fake();

        $fairId = $this->postJson('/api/admin/job-fairs', $this->payload([
            'latitude' => 15.9762,
            'longitude' => 120.5721,
        ]))->assertCreated()->json('job_fair.job_fair_id');

        Http::fake();

        $this->putJson("/api/admin/job-fairs/{$fairId}", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('job_fair.status', 'published')
            ->assertJsonPath('job_fair.province', 'Pangasinan');

        Http::assertNothingSent();
    }

    /**
     * map_eligible is the single condition that decides whether a fair gets a
     * pin on the public seeker Job Map: published + still upcoming/ongoing +
     * a pin was actually dropped. Closed/completed fairs stay in the
     * bulletin (is_public + PUBLIC_STATUSES) but drop off the live map.
     */
    public function test_map_eligible_reflects_publish_state_lifecycle_and_pin_presence(): void
    {
        Sanctum::actingAs($this->admin());
        Http::fake();

        // Draft: not yet public, no pin regardless of status.
        $draft = $this->postJson('/api/admin/job-fairs', $this->payload(['status' => 'draft']))
            ->assertCreated();
        $draft->assertJsonPath('job_fair.is_public', false)
            ->assertJsonPath('job_fair.map_eligible', false);
        $fairId = $draft->json('job_fair.job_fair_id');

        // Published with a pin: eligible.
        $this->putJson("/api/admin/job-fairs/{$fairId}", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('job_fair.is_public', true)
            ->assertJsonPath('job_fair.map_eligible', true);

        // Closed: still public (stays on the bulletin) but no longer map-eligible.
        $this->putJson("/api/admin/job-fairs/{$fairId}", ['status' => 'closed'])
            ->assertOk()
            ->assertJsonPath('job_fair.status', 'closed')
            ->assertJsonPath('job_fair.map_eligible', false);

        // Published but no coordinates on file: still not map-eligible — a pin
        // needs somewhere to sit. Every new fair now starts as a draft
        // regardless of the status field (creation no longer accepts it), so
        // publishing is a separate step, same as the real admin flow.
        $noPin = $this->payload();
        unset($noPin['latitude'], $noPin['longitude'], $noPin['google_place_id']);
        Http::fake(['https://maps.googleapis.test/*' => Http::response(['error' => 'quota exceeded'], 500)]);

        $secondFairId = $this->postJson('/api/admin/job-fairs', $noPin)
            ->assertCreated()
            ->assertJsonPath('job_fair.is_public', false)
            ->assertJsonPath('job_fair.latitude', null)
            ->json('job_fair.job_fair_id');

        $this->postJson("/api/admin/job-fairs/{$secondFairId}/publish")
            ->assertOk()
            ->assertJsonPath('job_fair.is_public', true)
            ->assertJsonPath('job_fair.latitude', null)
            ->assertJsonPath('job_fair.map_eligible', false);
    }

    // ── Fixtures ─────────────────────────────────────────────────────────

    private function admin(): Administrator
    {
        return Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => 'jobfair-admin@example.test',
            'password' => 'password123',
            'role' => 'administrator',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Urdaneta City Job Fair',
            'description' => 'Quarterly PESO job fair.',
            'venue' => 'SM City Urdaneta - Events Center',
            'province' => 'Pangasinan',
            'city_municipality' => 'Urdaneta City',
            'barangay' => 'Nancayasan',
            'sector' => 'local',
            'start_date' => '2026-10-10',
            'end_date' => '2026-10-10',
            'start_time' => '08:00',
            'end_time' => '17:00',
            'submission_deadline' => '2026-09-25',
            'status' => 'draft',
            'latitude' => 15.9762,
            'longitude' => 120.5721,
            'google_place_id' => 'test-place-id',
        ], $overrides);
    }

    private function createTables(): void
    {
        // Queried by publish()'s employer invitation broadcast even though
        // this suite is only exercising location/geocoding behavior.
        Schema::create('employers', function (Blueprint $t) {
            $t->id('employer_id');
            $t->string('email')->unique();
            $t->string('password');
            $t->string('company_name')->nullable();
            $t->string('trade_name')->nullable();
            $t->string('company_type')->nullable();
            $t->string('verification_status')->default('pending');
            $t->timestamp('email_verified_at')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('administrators', function (Blueprint $t) {
            $t->id('admin_id');
            $t->string('first_name');
            $t->string('last_name');
            $t->string('email')->unique();
            $t->string('password');
            $t->string('role')->nullable();
            $t->string('status')->nullable();
            $t->timestamp('email_verified_at')->nullable();
            $t->rememberToken();
            $t->timestamps();
        });

        Schema::create('job_fairs', function (Blueprint $t) {
            $t->id('job_fair_id');
            $t->unsignedBigInteger('admin_id');
            $t->unsignedBigInteger('created_by')->nullable();
            $t->string('title');
            $t->text('description')->nullable();
            $t->date('start_date')->nullable();
            $t->date('end_date')->nullable();
            $t->string('venue');
            $t->string('province', 100)->nullable();
            $t->string('province_code', 20)->nullable();
            $t->string('city_municipality', 150)->nullable();
            $t->string('city_code', 20)->nullable();
            $t->string('barangay', 150)->nullable();
            $t->string('barangay_code', 20)->nullable();
            $t->string('specific_address', 255)->nullable();
            $t->decimal('latitude', 10, 7)->nullable();
            $t->decimal('longitude', 10, 7)->nullable();
            $t->string('google_place_id')->nullable();
            $t->string('sector')->nullable();
            $t->string('target_sector')->nullable();
            $t->json('partner_agencies')->nullable();
            $t->date('event_date')->nullable();
            $t->time('start_time')->nullable();
            $t->time('end_time')->nullable();
            $t->dateTime('submission_deadline')->nullable();
            $t->string('contact_email')->nullable();
            $t->unsignedTinyInteger('maximum_representatives')->default(2);
            $t->string('status')->default('draft');
            $t->boolean('is_public')->default(false);
            $t->timestamp('published_at')->nullable();
            $t->unsignedBigInteger('published_by')->nullable();
            $t->timestamps();
        });

        Schema::create('job_fair_requirements', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('job_fair_id');
            $t->string('code');
            $t->string('label');
            $t->boolean('is_required')->default(true);
            $t->unsignedSmallInteger('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('job_fair_employers', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('job_fair_id');
            $t->unsignedBigInteger('employer_id');
            $t->string('participation_status')->default('interested');
            $t->string('source')->nullable();
            $t->string('confirmation_channel')->nullable();
            $t->timestamp('joined_at')->nullable();
            $t->timestamp('invited_at')->nullable();
            $t->timestamp('responded_at')->nullable();
            $t->timestamp('reviewed_at')->nullable();
            $t->timestamp('approved_at')->nullable();
            $t->timestamp('attended_at')->nullable();
            $t->timestamp('no_show_at')->nullable();
            $t->timestamp('encoded_results_at')->nullable();
            $t->timestamp('report_generated_at')->nullable();
            $t->text('remarks')->nullable();
            $t->unsignedBigInteger('reviewed_by')->nullable();
            $t->timestamps();
            $t->unique(['job_fair_id', 'employer_id']);
        });

        Schema::create('job_fair_vacancies', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('job_fair_id');
            $t->unsignedBigInteger('employer_id');
            $t->unsignedBigInteger('vacancy_id');
            $t->timestamps();
        });

        // Queried directly (not eager-loaded) by JobFairService::dashboard(),
        // which eventPayload() always calls for an admin — needed even though
        // this test never creates a result report.
        Schema::create('job_fair_result_reports', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('job_fair_id');
            $t->unsignedBigInteger('job_fair_employer_id')->nullable();
            $t->unsignedBigInteger('employer_id')->nullable();
            $t->string('company_name');
            $t->string('normalized_company_name');
            $t->string('dedupe_key');
            $t->string('employer_type');
            $t->string('source');
            $t->string('contact_person')->nullable();
            $t->string('contact_number')->nullable();
            foreach (['total_male', 'total_female', 'total_applicants', 'total_hots', 'total_near_hired', 'total_rejected', 'total_vacancies_solicited', 'total_vacancies_offered'] as $c) {
                $t->unsignedInteger($c)->default(0);
            }
            $t->text('remarks')->nullable();
            $t->unsignedBigInteger('encoded_by_admin_id')->nullable();
            $t->unsignedBigInteger('submitted_by_employer_id')->nullable();
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('report_generated_at')->nullable();
            $t->timestamps();
            $t->unique(['job_fair_id', 'dedupe_key']);
        });
    }
}
