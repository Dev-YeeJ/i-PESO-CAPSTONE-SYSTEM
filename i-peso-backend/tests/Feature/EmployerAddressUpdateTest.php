<?php

namespace Tests\Feature;

use App\Models\Employer;
use App\Services\GoogleMapsService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

/** Employers can update their business address themselves (panel revision #8). */
class EmployerAddressUpdateTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('employers')) {
            Schema::create('employers', function (Blueprint $table) {
                $table->id('employer_id');
                $table->string('email')->unique();
                $table->string('password')->nullable();
                $table->string('company_name')->nullable();
                $table->string('company_type')->nullable();
                $table->json('industry')->nullable();
                $table->string('company_size')->nullable();
                $table->text('company_description')->nullable();
                $table->string('company_logo')->nullable();
                $table->string('representative_name')->nullable();
                $table->string('representative_designation')->nullable();
                $table->string('representative_contact_number')->nullable();
                $table->string('mobile_number')->nullable();
                $table->string('verification_status')->default('verified');
                foreach (['province', 'province_code', 'city_municipality', 'city_code', 'barangay', 'barangay_code', 'house_unit_street', 'complete_address', 'full_address', 'region_code', 'google_place_id'] as $column) {
                    $table->string($column)->nullable();
                }
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->unsignedInteger('location_accuracy')->nullable();
                $table->timestamp('location_verified_at')->nullable();
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id('log_id');
                $table->string('user_type');
                $table->unsignedBigInteger('user_id');
                $table->string('action', 100);
                $table->text('description')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();
            });
        }
    }

    public function test_an_employer_can_move_their_business_address_and_peso_sees_the_change(): void
    {
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        $this->putJson('/api/employer/profile', [
            ...$this->profile(),
            'province' => 'Pangasinan', 'province_code' => '0155',
            'city_municipality' => 'Dagupan City', 'city_code' => '015518',
            'barangay' => 'Lucao', 'barangay_code' => '015518023',
            'house_unit_street' => '12 Arellano St.',
            'latitude' => 16.0433, 'longitude' => 120.3333, 'location_accuracy' => 15,
        ])->assertOk()
            ->assertJsonPath('employer.city_municipality', 'Dagupan City')
            ->assertJsonPath('employer.complete_address', '12 Arellano St., Lucao, Dagupan City, Pangasinan');

        $employer->refresh();
        $this->assertSame('01', $employer->region_code);
        $this->assertEqualsWithDelta(16.0433, $employer->latitude, 0.0001);
        $this->assertNotNull($employer->location_verified_at);
        $this->assertDatabaseHas('activity_logs', [
            'action' => 'employer_address_updated',
            'description' => 'Changed the business address from "1 Old Rd., Poblacion, Urdaneta City, Pangasinan" to "12 Arellano St., Lucao, Dagupan City, Pangasinan".',
        ]);
    }

    public function test_a_new_address_without_a_pin_is_geocoded_instead_of_keeping_the_old_pin(): void
    {
        $this->mock(GoogleMapsService::class, fn (MockInterface $mock) => $mock->shouldReceive('geocode')
            ->once()->with('5 Rizal Ave., San Vicente, Urdaneta City, Pangasinan, Philippines')
            ->andReturn(['latitude' => 15.98, 'longitude' => 120.57, 'place_id' => 'place-123']));

        $employer = $this->employer();
        Sanctum::actingAs($employer);

        $this->putJson('/api/employer/profile', [
            ...$this->profile(),
            'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City',
            'barangay' => 'San Vicente', 'house_unit_street' => '5 Rizal Ave.',
        ])->assertOk();

        $employer->refresh();
        $this->assertEqualsWithDelta(15.98, $employer->latitude, 0.0001);
        $this->assertSame('place-123', $employer->google_place_id);
    }

    public function test_saving_other_details_leaves_the_address_and_pin_alone(): void
    {
        $this->mock(GoogleMapsService::class, fn (MockInterface $mock) => $mock->shouldNotReceive('geocode'));
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        $this->putJson('/api/employer/profile', [...$this->profile(), 'mobile_number' => '09998887777'])->assertOk();

        $employer->refresh();
        $this->assertSame('09998887777', $employer->mobile_number);
        $this->assertSame('1 Old Rd., Poblacion, Urdaneta City, Pangasinan', $employer->complete_address);
        $this->assertEqualsWithDelta(15.9761, $employer->latitude, 0.0001);
        $this->assertDatabaseMissing('activity_logs', ['action' => 'employer_address_updated']);
    }

    public function test_an_address_must_be_complete_and_a_pin_comes_as_a_pair(): void
    {
        Sanctum::actingAs($this->employer());

        $this->putJson('/api/employer/profile', [...$this->profile(), 'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['barangay', 'house_unit_street'], 'errors');

        $this->putJson('/api/employer/profile', [
            ...$this->profile(),
            'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City', 'barangay' => 'Poblacion', 'house_unit_street' => '1 Old Rd.',
            'latitude' => 15.9,
        ])->assertStatus(422)->assertJsonValidationErrors(['longitude'], 'errors');
    }

    private function employer(): Employer
    {
        return Employer::forceCreate([
            'email' => 'hr@ricemill.test',
            'password' => 'password123',
            'company_name' => 'Urdaneta Rice Mill Corp.',
            'verification_status' => 'verified',
            'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City',
            'barangay' => 'Poblacion', 'house_unit_street' => '1 Old Rd.',
            'complete_address' => '1 Old Rd., Poblacion, Urdaneta City, Pangasinan',
            'latitude' => 15.9761, 'longitude' => 120.5711,
        ]);
    }

    private function profile(): array
    {
        return [
            'industry' => ['Manufacturing'],
            'company_size' => 'small',
            'representative_name' => 'Ana Reyes',
            'representative_designation' => 'HR Manager',
            'mobile_number' => '09171234567',
        ];
    }
}
