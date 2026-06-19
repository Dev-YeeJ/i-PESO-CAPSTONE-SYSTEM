<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\Occupation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HiringApplicationFlowTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
    }

    public function test_seeker_employer_and_admin_can_complete_hiring_flow(): void
    {
        $employer = $this->createEmployer();
        $seeker = $this->createSeeker();
        $admin = $this->createAdmin();
        $vacancy = $this->createVacancy($employer);

        Sanctum::actingAs($seeker);
        $this->postJson("/api/seeker/jobs/{$vacancy->post_id}/apply")
            ->assertCreated()
            ->assertJsonPath('application.status', 'pending')
            ->assertJsonPath('application.job.job_title', 'Software Developer');

        $this->postJson("/api/seeker/jobs/{$vacancy->post_id}/apply")
            ->assertOk()
            ->assertJsonPath('message', 'You already applied to this job.');

        $this->getJson('/api/seeker/applications')
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('applications.0.status', 'pending');

        $application = Application::firstOrFail();

        Sanctum::actingAs($employer);
        $this->getJson('/api/employer/applications')
            ->assertOk()
            ->assertJsonPath('data.0.apply_id', $application->apply_id)
            ->assertJsonPath('data.0.seeker.name', 'Juan Dela Cruz');

        $this->patchJson("/api/employer/applications/{$application->apply_id}/status", [
            'status' => 'interview',
            'employer_remarks' => 'Please attend the interview.',
            'interview' => [
                'mode_of_interview' => 'face_to_face',
                'schedule' => now()->addDays(2)->format('Y-m-d H:i:s'),
                'venue_or_link' => 'PESO Urdaneta Office',
                'instructions' => 'Bring a valid ID.',
            ],
        ])
            ->assertOk()
            ->assertJsonPath('application.status', 'interview')
            ->assertJsonPath('application.interview.venue_or_link', 'PESO Urdaneta Office');

        $this->patchJson("/api/employer/applications/{$application->apply_id}/status", [
            'status' => 'hired',
            'employer_remarks' => 'Accepted for onboarding.',
            'placement_start_date' => now()->addWeek()->toDateString(),
            'placement_salary' => 28000,
        ])
            ->assertOk()
            ->assertJsonPath('application.status', 'hired')
            ->assertJsonPath('application.placement.salary', '28000.00');

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/applications')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'hired')
            ->assertJsonPath('data.0.job.employer.company_name', 'Verified Employer Inc.');
    }

    private function createEmployer(): Employer
    {
        return Employer::create([
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'company_type' => 'sole_proprietorship',
            'company_name' => 'Verified Employer Inc.',
            'verification_status' => 'verified',
            'email_verified_at' => now(),
        ]);
    }

    private function createSeeker(): JobSeeker
    {
        return JobSeeker::create([
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'mobile_number' => '09123456789',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'profile_completed' => true,
            'address_barangay' => 'Poblacion',
            'address_municipality_city' => 'Urdaneta City',
            'address_province' => 'Pangasinan',
            'latitude' => 15.9761,
            'longitude' => 120.5711,
        ]);
    }

    private function createAdmin(): Administrator
    {
        return Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function createVacancy(Employer $employer): JobVacancy
    {
        $occupation = Occupation::firstOrCreate(
            ['psoc_code' => '2512'],
            [
                'title' => 'Software Developer',
                'version' => '2012',
                'source' => 'psa',
                'is_active' => true,
            ]
        );

        return JobVacancy::create([
            'employer_id' => $employer->employer_id,
            'occupation_id' => $occupation->id,
            'job_title' => 'Software Developer',
            'employment_type' => 'Permanent/Regular',
            'work_setup' => 'Hybrid',
            'location' => 'Poblacion, Urdaneta City, Pangasinan',
            'region' => 'Region I - Ilocos Region',
            'province' => 'Pangasinan',
            'city_municipality' => 'Urdaneta City',
            'barangay' => 'Poblacion',
            'specific_address' => 'PESO Employment Center',
            'latitude' => 15.9761,
            'longitude' => 120.5711,
            'job_description' => 'Build and maintain employment services.',
            'vacancies_count' => 1,
            'minimum_education' => 'College Graduate',
            'target_courses' => ['BS Information Technology'],
            'experience_level' => 'No Experience Required',
            'salary_min' => 20000,
            'salary_max' => 30000,
            'salary_type' => 'Monthly',
            'hide_salary' => false,
            'benefits' => ['HMO'],
            'required_skills' => ['PHP', 'Laravel'],
            'soft_skills' => ['Communication'],
            'required_certifications' => [],
            'application_deadline' => now()->addMonth()->toDateString(),
            'open_to_pwds' => true,
            'open_to_senior_citizens' => false,
            'spes_tupad_eligible' => false,
            'status' => 'active',
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
                $table->string('classification_code')->nullable();
                $table->string('isco_group')->nullable();
                $table->string('version')->default('2012');
                $table->string('source')->default('psa');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('employers')) {
            Schema::create('employers', function (Blueprint $table) {
                $table->id('employer_id');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('company_type')->nullable();
                $table->string('company_name')->nullable();
                $table->string('verification_status')->default('pending');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
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
                $table->string('educ_attainment')->nullable();
                $table->string('address_barangay')->nullable();
                $table->string('address_municipality_city')->nullable();
                $table->string('address_province')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->json('preferred_locations_details')->nullable();
                $table->boolean('profile_completed')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('administrators')) {
            Schema::create('administrators', function (Blueprint $table) {
                $table->id('admin_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('role');
                $table->string('status');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_vacancies')) {
            Schema::create('job_vacancies', function (Blueprint $table) {
                $table->id('post_id');
                $table->unsignedBigInteger('employer_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('job_title');
                $table->string('employment_type');
                $table->string('work_setup')->nullable();
                $table->string('location')->nullable();
                $table->string('region')->nullable();
                $table->string('province')->nullable();
                $table->string('city_municipality')->nullable();
                $table->string('barangay')->nullable();
                $table->string('specific_address')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->text('job_description');
                $table->unsignedInteger('vacancies_count')->default(1);
                $table->string('minimum_education')->nullable();
                $table->json('target_courses')->nullable();
                $table->string('experience_level')->nullable();
                $table->unsignedInteger('minimum_experience_months')->default(0);
                $table->decimal('salary_min', 10, 2)->nullable();
                $table->decimal('salary_max', 10, 2)->nullable();
                $table->string('salary_type')->nullable();
                $table->boolean('hide_salary')->default(false);
                $table->json('benefits')->nullable();
                $table->json('required_skills')->nullable();
                $table->json('soft_skills')->nullable();
                $table->json('required_certifications')->nullable();
                $table->date('application_deadline')->nullable();
                $table->boolean('open_to_pwds')->default(false);
                $table->boolean('open_to_senior_citizens')->default(false);
                $table->boolean('spes_tupad_eligible')->default(false);
                $table->string('status')->default('active');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_skills')) {
            Schema::create('seeker_skills', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('skill_id')->nullable();
                $table->string('skill_name');
                $table->string('normalized_skill_name')->nullable();
                $table->string('skill_type')->default('technical');
                $table->string('proficiency')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_educations')) {
            Schema::create('seeker_educations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->string('level')->nullable();
                $table->string('institution_name')->nullable();
                $table->string('course_strand')->nullable();
                $table->string('normalized_course_strand')->nullable();
                $table->string('completion_status')->nullable();
                $table->integer('year_started')->nullable();
                $table->integer('year_graduated')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_work_experiences')) {
            Schema::create('seeker_work_experiences', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('company_name')->nullable();
                $table->string('position')->nullable();
                $table->string('normalized_position')->nullable();
                $table->integer('number_of_months')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_occupations')) {
            Schema::create('seeker_occupations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('occupation_title')->nullable();
                $table->string('raw_job_title')->nullable();
                $table->unsignedTinyInteger('preference_order')->default(1);
                $table->string('status')->default('manual');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('applications')) {
            Schema::create('applications', function (Blueprint $table) {
                $table->id('apply_id');
                $table->unsignedBigInteger('post_id');
                $table->unsignedBigInteger('seeker_id');
                $table->decimal('match_percentage', 5, 2)->default(0);
                $table->string('status')->default('pending');
                $table->timestamp('status_changed_at')->nullable();
                $table->unsignedBigInteger('status_changed_by')->nullable();
                $table->text('employer_remarks')->nullable();
                $table->date('placement_start_date')->nullable();
                $table->decimal('placement_salary', 12, 2)->nullable();
                $table->timestamp('placement_captured_at')->nullable();
                $table->json('submitted_documents')->nullable();
                $table->timestamps();
                $table->unique(['post_id', 'seeker_id']);
            });
        }

        if (! Schema::hasTable('interview_schedules')) {
            Schema::create('interview_schedules', function (Blueprint $table) {
                $table->id('interview_id');
                $table->unsignedBigInteger('apply_id')->unique();
                $table->string('mode_of_interview');
                $table->dateTime('schedule');
                $table->string('venue_or_link', 500)->nullable();
                $table->text('instructions')->nullable();
                $table->string('status')->default('scheduled');
                $table->timestamps();
            });
        }
    }
}
