<?php

namespace Tests\Feature;

use App\Models\Employer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployerMatchEstimateTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();

        foreach (['seeker_occupations', 'job_seekers', 'employers'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::create('employers', function (Blueprint $table) {
            $table->id('employer_id');
            $table->string('company_name')->nullable();
            $table->string('email')->unique();
            $table->string('verification_status')->default('pending');
            $table->timestamps();
            $table->softDeletes();
        });
        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id('seeker_id');
            $table->string('email')->unique();
            $table->boolean('profile_completed')->default(false);
            $table->string('address_municipality_city')->nullable();
            $table->timestamps();
        });
        Schema::create('seeker_occupations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seeker_id');
            $table->string('general_term')->nullable();
            $table->timestamps();
        });
    }

    public function test_counts_profile_complete_seekers_in_the_same_field_and_city(): void
    {
        // Stored terms differ in spelling; all three mean the same broad field.
        $this->seeker('a@x.test', true, 'Urdaneta City', 'general:office-work');
        $this->seeker('b@x.test', true, 'URDANETA CITY ', 'office work');
        $this->seeker('c@x.test', true, 'Dagupan City', 'Office_Work');
        $this->seeker('d@x.test', false, 'Urdaneta City', 'office work'); // profile not finished
        $this->seeker('e@x.test', true, 'Urdaneta City', 'retail work');  // other field

        Sanctum::actingAs($this->employer());

        $this->getJson('/api/employer/vacancies/match-estimate?general_term=general:office-work&city_municipality=Urdaneta%20City')
            ->assertOk()
            ->assertExactJson(['same_field' => 3, 'same_field_nearby' => 2]);

        $this->getJson('/api/employer/vacancies/match-estimate?general_term=office-work')
            ->assertOk()
            ->assertExactJson(['same_field' => 3, 'same_field_nearby' => null]);
    }

    public function test_needs_a_verified_employer_and_a_field(): void
    {
        Sanctum::actingAs($this->employer('pending'));
        $this->getJson('/api/employer/vacancies/match-estimate?general_term=office-work')->assertForbidden();

        Sanctum::actingAs($this->employer('verified', 'second@x.test'));
        $this->getJson('/api/employer/vacancies/match-estimate')->assertStatus(422);
    }

    private function employer(string $status = 'verified', string $email = 'boss@x.test'): Employer
    {
        $id = DB::table('employers')->insertGetId([
            'company_name' => 'Acme', 'email' => $email, 'verification_status' => $status,
            'created_at' => now(), 'updated_at' => now(),
        ], 'employer_id');

        return Employer::findOrFail($id);
    }

    private function seeker(string $email, bool $complete, string $city, string $term): void
    {
        $id = DB::table('job_seekers')->insertGetId([
            'email' => $email, 'profile_completed' => $complete, 'address_municipality_city' => $city,
            'created_at' => now(), 'updated_at' => now(),
        ], 'seeker_id');
        DB::table('seeker_occupations')->insert(['seeker_id' => $id, 'general_term' => $term, 'created_at' => now(), 'updated_at' => now()]);
    }
}
