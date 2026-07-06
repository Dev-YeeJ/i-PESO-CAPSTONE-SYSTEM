<?php

namespace Tests\Feature;

use App\Models\Administrator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAnalyticsDashboardTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->createSchema();
    }

    protected function tearDown(): void
    {
        foreach (['analytics_reports', 'job_vacancy_skills', 'seeker_skills', 'skill_catalog_entries', 'job_fair_attendees', 'program_applications', 'interview_schedules', 'applications', 'job_vacancies', 'occupations', 'employers', 'job_seekers', 'administrators'] as $table) {
            Schema::dropIfExists($table);
        }
        parent::tearDown();
    }

    public function test_admin_analytics_returns_panel_indicators_and_real_forecast(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Admin', 'email' => 'analytics@example.com',
            'password' => 'password', 'role' => 'admin', 'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $now = CarbonImmutable::now();
        DB::table('job_seekers')->insert([
            'seeker_id' => 1, 'first_name' => 'Ana', 'last_name' => 'Santos', 'email' => 'ana@example.com', 'password' => 'password',
            'sex' => 'female', 'educ_attainment' => 'College Graduate', 'employment_status' => 'unemployed', 'profile_completed' => true,
            'address_province' => 'Pangasinan', 'address_municipality_city' => 'Urdaneta City', 'address_barangay' => 'Poblacion',
            'created_at' => $now->subMonths(2), 'updated_at' => $now,
        ]);
        DB::table('employers')->insert([
            'employer_id' => 1, 'company_name' => 'Northstar Manufacturing', 'email' => 'northstar@example.com', 'password' => 'password',
            'verification_status' => 'verified', 'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City', 'barangay' => 'Poblacion',
            'created_at' => $now->subMonths(3), 'updated_at' => $now,
        ]);
        DB::table('occupations')->insert(['id' => 1, 'title' => 'Welder', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('skill_catalog_entries')->insert(['id' => 1, 'name' => 'Welding', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('seeker_skills')->insert(['seeker_id' => 1, 'skill_id' => 1, 'skill_name' => 'Welding', 'created_at' => $now, 'updated_at' => $now]);

        foreach ([3, 2, 1] as $index => $monthsAgo) {
            $postId = $index + 1;
            $createdAt = $now->subMonths($monthsAgo)->startOfMonth()->addDays(3);
            DB::table('job_vacancies')->insert([
                'post_id' => $postId, 'employer_id' => 1, 'occupation_id' => 1, 'general_term' => 'Skilled Trades',
                'job_title' => 'Welder', 'status' => 'active', 'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City',
                'barangay' => 'Poblacion', 'created_at' => $createdAt, 'updated_at' => $createdAt,
            ]);
            DB::table('job_vacancy_skills')->insert(['post_id' => $postId, 'skill_id' => 1, 'original_name' => 'Welding', 'created_at' => $createdAt, 'updated_at' => $createdAt]);
        }
        DB::table('applications')->insert([
            'apply_id' => 1, 'post_id' => 3, 'seeker_id' => 1, 'status' => 'hired',
            'status_changed_at' => $now->subMonth(), 'created_at' => $now->subMonth(), 'updated_at' => $now->subMonth(),
        ]);
        DB::table('interview_schedules')->insert(['apply_id' => 1, 'status' => 'scheduled', 'created_at' => $now, 'updated_at' => $now]);

        $this->getJson('/api/admin/analytics?date_from='.$now->subMonths(4)->toDateString().'&date_to='.$now->toDateString().'&period=monthly')
            ->assertOk()
            ->assertJsonPath('summary.total_registered_applicants', 1)
            ->assertJsonPath('summary.complete_profiles', 1)
            ->assertJsonPath('summary.hired_applicants', 1)
            ->assertJsonPath('summary.scheduled_interviews', 1)
            ->assertJsonPath('distributions.gender.0.label', 'Female')
            ->assertJsonPath('top_lists.most_applied_job_categories.0.label', 'Skilled Trades')
            ->assertJsonPath('top_lists.companies_with_highest_hires.0.label', 'Northstar Manufacturing')
            ->assertJsonPath('forecast.available', true)
            ->assertJsonPath('forecast.label', 'Experimental Forecast')
            ->assertJsonMissingPath('private_documents');

        $this->postJson('/api/admin/reports/generate', [
            'title' => 'Filtered Labor Market Snapshot',
            'report_category' => 'labor_market_analytics',
            'coverage_start' => $now->subMonths(4)->toDateString(),
            'coverage_end' => $now->toDateString(),
            'period' => 'monthly',
            'province' => 'Pangasinan',
        ])->assertCreated()
            ->assertJsonPath('report.report_category', 'labor_market_analytics')
            ->assertJsonPath('report.data_summary.summary.total_registered_applicants', 1);
    }

    public function test_forecast_reports_insufficient_history_without_inventing_demand(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Admin', 'email' => 'empty-analytics@example.com',
            'password' => 'password', 'role' => 'admin', 'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/analytics?date_from='.now()->startOfMonth()->toDateString().'&date_to='.now()->toDateString())
            ->assertOk()
            ->assertJsonPath('forecast.available', false)
            ->assertJsonPath('forecast.message', 'Not enough historical data yet to generate reliable predictions.');
    }

    private function createSchema(): void
    {
        Schema::create('administrators', function (Blueprint $table) {
            $table->id('admin_id'); $table->string('first_name'); $table->string('last_name'); $table->string('email')->unique();
            $table->string('password'); $table->string('role'); $table->string('status'); $table->timestamps();
        });
        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id('seeker_id'); $table->string('first_name'); $table->string('last_name'); $table->string('email')->unique(); $table->string('password');
            $table->string('sex')->nullable(); $table->string('educ_attainment')->nullable(); $table->string('employment_status')->nullable(); $table->boolean('profile_completed')->default(false);
            $table->string('address_province')->nullable(); $table->string('address_municipality_city')->nullable(); $table->string('address_barangay')->nullable(); $table->timestamps();
        });
        Schema::create('employers', function (Blueprint $table) {
            $table->id('employer_id'); $table->string('company_name')->nullable(); $table->string('email')->unique(); $table->string('password'); $table->string('verification_status')->default('pending');
            $table->string('province')->nullable(); $table->string('city_municipality')->nullable(); $table->string('barangay')->nullable(); $table->softDeletes(); $table->timestamps();
        });
        Schema::create('occupations', function (Blueprint $table) { $table->id(); $table->string('title'); $table->timestamps(); });
        Schema::create('job_vacancies', function (Blueprint $table) {
            $table->id('post_id'); $table->unsignedBigInteger('employer_id'); $table->unsignedBigInteger('occupation_id')->nullable(); $table->string('general_term')->nullable();
            $table->string('job_title'); $table->string('status'); $table->string('province')->nullable(); $table->string('city_municipality')->nullable(); $table->string('barangay')->nullable(); $table->timestamps();
        });
        Schema::create('applications', function (Blueprint $table) {
            $table->id('apply_id'); $table->unsignedBigInteger('post_id'); $table->unsignedBigInteger('seeker_id'); $table->string('status'); $table->timestamp('status_changed_at')->nullable(); $table->timestamps();
        });
        Schema::create('interview_schedules', function (Blueprint $table) { $table->id('interview_id'); $table->unsignedBigInteger('apply_id'); $table->string('status'); $table->timestamps(); });
        Schema::create('program_applications', function (Blueprint $table) { $table->id('prog_apply_id'); $table->unsignedBigInteger('seeker_id'); $table->timestamps(); });
        Schema::create('job_fair_attendees', function (Blueprint $table) { $table->id(); $table->unsignedBigInteger('seeker_id'); $table->timestamps(); });
        Schema::create('skill_catalog_entries', function (Blueprint $table) { $table->id(); $table->string('name'); $table->timestamps(); });
        Schema::create('seeker_skills', function (Blueprint $table) { $table->id(); $table->unsignedBigInteger('seeker_id'); $table->unsignedBigInteger('skill_id')->nullable(); $table->string('skill_name')->nullable(); $table->timestamps(); });
        Schema::create('job_vacancy_skills', function (Blueprint $table) { $table->id(); $table->unsignedBigInteger('post_id'); $table->unsignedBigInteger('skill_id'); $table->string('original_name'); $table->timestamps(); });
        Schema::create('analytics_reports', function (Blueprint $table) {
            $table->id('report_id'); $table->unsignedBigInteger('admin_id'); $table->string('title'); $table->string('report_category');
            $table->date('coverage_start'); $table->date('coverage_end'); $table->json('data_summary'); $table->timestamps();
        });
    }
}
