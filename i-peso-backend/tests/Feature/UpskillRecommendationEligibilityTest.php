<?php

namespace Tests\Feature;

use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use App\Services\UpskillRecommendationService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class UpskillRecommendationEligibilityTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTables();
    }

    public function test_occupation_matched_seeker_failing_a_required_rule_is_not_notified(): void
    {
        $occupation = $this->createOccupation('Housekeeper');
        $otherOccupation = $this->createOccupation('Cook');

        $program = GovernmentProgram::create([
            'program_name' => 'SPES Housekeeping Batch',
            'target_occupation_id' => $occupation->id,
            'program_status' => 'open',
            'visibility' => 'public',
            'eligibility_rules' => [
                ['field' => 'age', 'min' => 18, 'max' => 45, 'label' => 'Age 18-45', 'weight' => 2, 'required' => true],
                ['field' => 'employment_status', 'values' => ['unemployed'], 'label' => 'Currently unemployed', 'weight' => 2, 'required' => true],
            ],
        ]);

        // Fully eligible and occupation-matched — should be notified.
        $eligible = $this->createSeeker(age: 25, employmentStatus: 'unemployed');
        $this->attachOccupation($eligible, $occupation->id);

        // Occupation-matched but employed — fails a required rule. This is the exact gap this
        // change closes: the old occupation-only filter would have notified this seeker anyway.
        $ineligible = $this->createSeeker(age: 25, employmentStatus: 'employed');
        $this->attachOccupation($ineligible, $occupation->id);

        // Eligible on the rules, but a different occupation — occupation still narrows when the
        // program specifies one, so this seeker stays excluded.
        $wrongOccupation = $this->createSeeker(age: 25, employmentStatus: 'unemployed');
        $this->attachOccupation($wrongOccupation, $otherOccupation->id);

        $recipients = app(UpskillRecommendationService::class)->recipientsForProgram($program);

        $this->assertTrue($recipients->contains('seeker_id', $eligible->seeker_id));
        $this->assertFalse($recipients->contains('seeker_id', $ineligible->seeker_id));
        $this->assertFalse($recipients->contains('seeker_id', $wrongOccupation->seeker_id));
    }

    public function test_a_program_with_no_target_occupation_still_notifies_eligible_seekers(): void
    {
        // Previously: recipientsForProgram() returned an empty collection outright whenever
        // target_occupation_id was null, regardless of how many seekers would actually pass
        // the program's own eligibility rules.
        $program = GovernmentProgram::create([
            'program_name' => 'TUPAD Open Enrollment',
            'target_occupation_id' => null,
            'program_status' => 'open',
            'visibility' => 'public',
            'eligibility_rules' => [
                ['field' => 'age', 'min' => 18, 'max' => 45, 'label' => 'Age 18-45', 'weight' => 1, 'required' => true],
            ],
        ]);

        $eligible = $this->createSeeker(age: 30, employmentStatus: 'unemployed');
        $tooOld = $this->createSeeker(age: 60, employmentStatus: 'unemployed');

        $recipients = app(UpskillRecommendationService::class)->recipientsForProgram($program);

        $this->assertTrue($recipients->contains('seeker_id', $eligible->seeker_id));
        $this->assertFalse($recipients->contains('seeker_id', $tooOld->seeker_id));
    }

    private function createOccupation(string $title): \App\Models\Occupation
    {
        return \App\Models\Occupation::create([
            'psoc_code' => 'TEST-'.strtoupper(\Illuminate\Support\Str::random(6)),
            'title' => $title,
            'source' => 'esco',
            'is_active' => true,
        ]);
    }

    private function createSeeker(int $age, string $employmentStatus): JobSeeker
    {
        return JobSeeker::create([
            'first_name' => 'Maria',
            'last_name' => fake()->unique()->lastName(),
            'mobile_number' => '09123456789',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'date_of_birth' => now()->subYears($age)->toDateString(),
            'employment_status' => $employmentStatus,
            'profile_completed' => true,
        ]);
    }

    private function attachOccupation(JobSeeker $seeker, int $occupationId): void
    {
        DB::table('seeker_occupations')->insert([
            'seeker_id' => $seeker->getKey(),
            'occupation_id' => $occupationId,
            'occupation_title' => 'Test Occupation',
            'status' => 'standardized',
            'preference_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createTables(): void
    {
        if (! Schema::hasTable('occupations')) {
            Schema::create('occupations', function (Blueprint $table) {
                $table->id();
                $table->string('psoc_code')->unique();
                $table->string('title');
                $table->text('description')->nullable();
                $table->text('search_terms')->nullable();
                $table->string('version')->default('2012');
                $table->string('source')->default('psa');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('mobile_number');
                $table->string('email')->unique();
                $table->string('password');
                $table->date('date_of_birth')->nullable();
                $table->string('educ_attainment')->nullable();
                $table->string('employment_status')->nullable();
                $table->boolean('profile_completed')->default(false);
                $table->string('verification_status')->default('pending');
                $table->boolean('is_verified')->default(false);
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_occupations')) {
            Schema::create('seeker_occupations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('general_term')->nullable();
                $table->string('occupation_title');
                $table->string('raw_job_title')->nullable();
                $table->string('status')->default('standardized');
                $table->unsignedTinyInteger('preference_order')->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('government_programs')) {
            Schema::create('government_programs', function (Blueprint $table) {
                $table->id('program_id');
                $table->string('program_name');
                $table->string('category')->nullable();
                $table->json('eligibility_rules')->nullable();
                $table->unsignedBigInteger('target_occupation_id')->nullable();
                $table->string('program_status')->default('open');
                $table->string('status')->default('open');
                $table->string('visibility')->default('public');
                $table->date('start_date')->nullable();
                $table->dateTime('schedule')->nullable();
                $table->unsignedInteger('slot_limit')->nullable();
                $table->unsignedInteger('total_slots')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }
}
