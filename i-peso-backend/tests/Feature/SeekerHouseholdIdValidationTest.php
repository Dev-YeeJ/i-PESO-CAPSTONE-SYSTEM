<?php

namespace Tests\Feature;

use App\Models\JobSeeker;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SeekerHouseholdIdValidationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('mobile_number');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('employment_status')->nullable();
                $table->string('employment_type')->nullable();
                $table->string('self_employed_type')->nullable();
                $table->string('self_employed_type_others')->nullable();
                $table->unsignedInteger('unemployment_months')->nullable();
                $table->string('unemployment_reason')->nullable();
                $table->string('unemployment_reason_others')->nullable();
                $table->string('unemployment_terminated_country')->nullable();
                $table->boolean('is_ofw')->default(false);
                $table->string('ofw_country')->nullable();
                $table->boolean('is_former_ofw')->default(false);
                $table->string('former_ofw_country')->nullable();
                $table->date('former_ofw_return_date')->nullable();
                $table->boolean('is_4ps_beneficiary')->default(false);
                $table->string('household_id_4ps')->nullable();
                $table->boolean('is_first_time_jobseeker')->default(false);
                $table->boolean('profile_completed')->default(false);
                $table->json('form_validation_state')->nullable();
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function test_beneficiary_household_id_must_use_the_complete_masked_format(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-2', $this->step2Payload('12-34-56'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('household_id_4ps');
    }

    public function test_complete_masked_household_id_is_saved(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-2', $this->step2Payload('12-34-56-789-01234'))
            ->assertOk();

        $this->assertDatabaseHas('job_seekers', [
            'seeker_id' => $seeker->getKey(),
            'household_id_4ps' => '12-34-56-789-01234',
        ]);
    }

    private function createSeeker(): JobSeeker
    {
        return JobSeeker::create([
            'first_name' => 'Maria',
            'last_name' => fake()->unique()->lastName(),
            'mobile_number' => '09123456789',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
        ]);
    }

    private function step2Payload(string $householdId): array
    {
        return [
            'employment_status' => 'unemployed',
            'unemployment_months' => 1,
            'unemployment_reason' => 'fresh_graduate',
            'is_ofw' => false,
            'is_former_ofw' => false,
            'is_4ps_beneficiary' => true,
            'household_id_4ps' => $householdId,
        ];
    }
}
