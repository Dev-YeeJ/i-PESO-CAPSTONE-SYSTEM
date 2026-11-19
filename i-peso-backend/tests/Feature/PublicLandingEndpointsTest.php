<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PublicLandingEndpointsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
        Cache::forget('public-landing-stats');
    }

    public function test_featured_jobs_lists_only_open_vacancies_from_verified_employers(): void
    {
        $verified = $this->employer('CityMall Urdaneta', 'verified');
        $pending = $this->employer('Unverified Co', 'pending');

        $this->vacancy($verified, 'Store Supervisor', ['salary_min' => 18000, 'salary_max' => 22000]);
        $this->vacancy($verified, 'Hidden Salary Clerk', ['hide_salary' => true, 'salary_min' => 15000]);
        $this->vacancy($verified, 'Closed Cashier', ['status' => 'closed']);
        $this->vacancy($verified, 'Held Guard', ['admin_hold_at' => now()]);
        $this->vacancy($verified, 'Expired Driver', ['application_deadline' => now()->subDay()->toDateString()]);
        $this->vacancy($pending, 'Pending Employer Job');

        $response = $this->getJson('/api/public/featured-jobs')->assertOk();

        $titles = collect($response->json('data'))->pluck('job_title')->all();
        $this->assertEqualsCanonicalizing(['Store Supervisor', 'Hidden Salary Clerk'], $titles);
        $this->assertSame(2, $response->json('meta.total'));

        $hidden = collect($response->json('data'))->firstWhere('job_title', 'Hidden Salary Clerk');
        $this->assertNull($hidden['salary_min']);
        $this->assertSame('CityMall Urdaneta', $hidden['company_name']);
        $this->assertArrayNotHasKey('admin_hold_reason', $hidden);
    }

    public function test_featured_jobs_filters_by_keyword_and_location(): void
    {
        $employer = $this->employer('Puregold Urdaneta', 'verified');
        $this->vacancy($employer, 'Cashier', ['barangay' => 'Poblacion']);
        $this->vacancy($employer, 'Cashier Trainee', ['barangay' => 'Anonas']);
        $this->vacancy($employer, 'Warehouse Helper', ['barangay' => 'Poblacion']);

        $byKeyword = $this->getJson('/api/public/featured-jobs?q=cashier')->assertOk();
        $this->assertSame(2, $byKeyword->json('meta.total'));

        $byBoth = $this->getJson('/api/public/featured-jobs?q=cashier&location=anonas')->assertOk();
        $this->assertSame(['Cashier Trainee'], collect($byBoth->json('data'))->pluck('job_title')->all());

        $byCompany = $this->getJson('/api/public/featured-jobs?q=puregold')->assertOk();
        $this->assertSame(3, $byCompany->json('meta.total'));
    }

    public function test_job_fairs_returns_upcoming_public_fairs_with_employer_counts(): void
    {
        $upcoming = $this->fair('Mega Job Fair', now()->addDays(5)->toDateString());
        $this->fair('Past Fair', now()->subDays(5)->toDateString());
        $this->fair('Private Fair', now()->addDays(5)->toDateString(), ['is_public' => false]);
        $this->fair('Draft Fair', now()->addDays(5)->toDateString(), ['status' => 'draft']);

        DB::table('job_fair_employers')->insert([
            ['job_fair_id' => $upcoming, 'employer_id' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['job_fair_id' => $upcoming, 'employer_id' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $response = $this->getJson('/api/public/job-fairs')->assertOk();

        $this->assertSame(['Mega Job Fair'], collect($response->json('data'))->pluck('title')->all());
        $this->assertSame(2, $response->json('data.0.employers_count'));
    }

    public function test_stats_counts_open_vacancies_employers_placements_and_fairs(): void
    {
        $verified = $this->employer('Verified One', 'verified');
        $this->employer('Pending One', 'pending');
        $this->vacancy($verified, 'Open Job');
        $this->vacancy($verified, 'Closed Job', ['status' => 'closed']);
        $this->fair('Upcoming Fair', now()->addDays(3)->toDateString());

        DB::table('applications')->insert([
            ['status' => 'hired', 'created_at' => now(), 'updated_at' => now()],
            ['status' => 'hired', 'created_at' => now()->subYears(2), 'updated_at' => now()->subYears(2)],
            ['status' => 'pending', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->getJson('/api/public/stats')
            ->assertOk()
            ->assertExactJson(['data' => [
                'open_vacancies' => 1,
                'verified_employers' => 1,
                'placed_this_year' => 1,
                'upcoming_job_fairs' => 1,
            ]]);
    }

    private function employer(string $name, string $status): int
    {
        return DB::table('employers')->insertGetId([
            'company_name' => $name,
            'verification_status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'employer_id');
    }

    private function vacancy(int $employerId, string $title, array $overrides = []): void
    {
        DB::table('job_vacancies')->insert(array_merge([
            'employer_id' => $employerId,
            'job_title' => $title,
            'status' => 'active',
            'employment_type' => 'full_time',
            'barangay' => 'Nancayasan',
            'city_municipality' => 'Urdaneta City',
            'hide_salary' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));
    }

    private function fair(string $title, string $date, array $overrides = []): int
    {
        return DB::table('job_fairs')->insertGetId(array_merge([
            'title' => $title,
            'venue' => 'City Gymnasium',
            'start_date' => $date,
            'status' => 'published',
            'is_public' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides), 'job_fair_id');
    }

    private function createTables(): void
    {
        if (! Schema::hasTable('employers')) {
            Schema::create('employers', function (Blueprint $table) {
                $table->id('employer_id');
                $table->string('company_name');
                $table->string('trade_name')->nullable();
                $table->string('verification_status')->default('pending');
                $table->softDeletes();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_vacancies')) {
            Schema::create('job_vacancies', function (Blueprint $table) {
                $table->id('post_id');
                $table->timestamp('seekers_notified_at')->nullable();
                $table->unsignedBigInteger('employer_id');
                $table->string('job_title');
                $table->string('general_term')->nullable();
                $table->string('status')->default('active');
                $table->timestamp('admin_hold_at')->nullable();
                $table->date('application_deadline')->nullable();
                $table->string('location')->nullable();
                $table->string('barangay')->nullable();
                $table->string('city_municipality')->nullable();
                $table->string('employment_type')->nullable();
                $table->string('work_setup')->nullable();
                $table->decimal('salary_min', 12, 2)->nullable();
                $table->decimal('salary_max', 12, 2)->nullable();
                $table->string('salary_type')->nullable();
                $table->boolean('hide_salary')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_fairs')) {
            Schema::create('job_fairs', function (Blueprint $table) {
                $table->id('job_fair_id');
                $table->string('title');
                $table->string('venue')->nullable();
                $table->string('barangay')->nullable();
                $table->string('city_municipality')->nullable();
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->date('event_date')->nullable();
                $table->string('start_time')->nullable();
                $table->string('end_time')->nullable();
                $table->string('status')->default('draft');
                $table->boolean('is_public')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_fair_employers')) {
            Schema::create('job_fair_employers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('job_fair_id');
                $table->unsignedBigInteger('employer_id');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('applications')) {
            Schema::create('applications', function (Blueprint $table) {
                $table->id('apply_id');
                $table->string('status');
                $table->timestamps();
            });
        }
    }
}
