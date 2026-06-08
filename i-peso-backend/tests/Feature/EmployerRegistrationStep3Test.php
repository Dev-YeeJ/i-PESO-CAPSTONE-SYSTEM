<?php

namespace Tests\Feature;

use App\Models\Employer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployerRegistrationStep3Test extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('employers')) {
            Schema::create('employers', function (Blueprint $table) {
                $table->id('employer_id');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('company_type')->nullable();
                $table->string('company_name')->nullable();
                $table->string('tin')->nullable();
                $table->string('trade_name')->nullable();
                $table->string('industry')->nullable();
                $table->string('industry_type')->nullable();
                $table->string('company_size')->nullable();
                $table->string('province')->nullable();
                $table->string('city_municipality')->nullable();
                $table->string('barangay')->nullable();
                $table->string('house_unit_street')->nullable();
                $table->string('complete_address')->nullable();
                $table->text('company_description')->nullable();
                $table->string('company_logo')->nullable();
                $table->string('verification_status')->default('pending');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    public function test_verified_employer_can_save_company_profile(): void
    {
        $employer = Employer::create([
            'email' => 'step3-test@example.com',
            'password' => 'password123',
            'company_type' => 'sole_proprietorship',
            'email_verified_at' => now(),
            'verification_status' => 'pending',
        ]);

        Sanctum::actingAs($employer);

        $response = $this->post('/api/employer/register/step-2', [
            'company_name' => 'Step Three Test Company',
            'tin' => '123-456-789-000',
            'trade_name' => 'Step Three',
            'industry' => 'Information Technology',
            'company_size' => 'micro',
            'province' => 'Pangasinan',
            'city_municipality' => 'Urdaneta City',
            'barangay' => 'Poblacion',
            'house_unit_street' => '123 Test Street',
            'company_description' => 'A test company profile for employer onboarding.',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('company_name', 'Step Three Test Company');

        $this->assertDatabaseHas('employers', [
            'employer_id' => $employer->employer_id,
            'company_name' => 'Step Three Test Company',
            'tin' => '123-456-789-000',
            'company_size' => 'micro',
        ]);
    }
}
