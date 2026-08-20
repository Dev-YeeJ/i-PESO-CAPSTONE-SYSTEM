<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Employer;
use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use App\Models\ProgramApplication;
use App\Models\Skill;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GovernmentProgramsFlowTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
    }

    public function test_admin_and_seeker_can_complete_the_government_program_flow(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => 'programs.admin@example.test',
            'password' => 'password123',
            'role' => 'administrator',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $seeker = JobSeeker::create([
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'mobile_number' => '09171234567',
            'email' => 'program.seeker@example.test',
            'password' => 'password123',
            'profile_completed' => true,
            'address_municipality_city' => 'Urdaneta City',
            'address_province' => 'Pangasinan',
        ]);
        $employer = Employer::create([
            'email' => 'program.employer@example.test',
            'password' => 'password123',
            'company_type' => 'sole_proprietorship',
            'company_name' => 'Urdaneta Fabrication Works',
            'verification_status' => 'verified',
            'email_verified_at' => now(),
        ]);
        $welding = Skill::create([
            'name' => 'SMAW Welding',
            'normalized_name' => 'smaw welding',
            'category' => 'technical',
            'source' => 'test',
            'version' => 'test',
        ]);

        Sanctum::actingAs($admin);
        $programResponse = $this->postJson('/api/admin/government-programs', [
            'program_name' => 'SMAW NC II Training Test',
            'category' => 'tech_voc_training',
            'short_description' => 'Welding training for local job seekers.',
            'description' => 'Structured SMAW training and assessment preparation.',
            'eligibility_requirements' => ['Registered i-PESO job seeker'],
            'required_documents' => ['Valid ID'],
            'total_slots' => 2,
            'program_status' => 'open',
            'visibility' => 'public',
            'application_deadline' => now()->addWeek()->toDateString(),
            'skills' => [
                ['skill_id' => $welding->id, 'name' => 'SMAW Welding', 'type' => 'taught'],
            ],
        ])->assertCreated()
            ->assertJsonPath('program.title', 'SMAW NC II Training Test')
            ->assertJsonPath('program.available_slots', 2);

        $programId = $programResponse->json('program.program_id');

        Sanctum::actingAs($seeker);
        $applicationResponse = $this->postJson("/api/seeker/government-programs/{$programId}/apply")
            ->assertCreated()
            ->assertJsonPath('application.status', 'pending');

        $this->postJson("/api/seeker/government-programs/{$programId}/apply")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('program');

        $applicationId = $applicationResponse->json('application.application_id');
        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/government-program-applications/{$applicationId}/status", [
            'status' => 'approved',
            'remarks' => 'Qualified for the next training batch.',
        ])->assertOk()
            ->assertJsonPath('application.status', 'approved');

        $this->assertSame(1, GovernmentProgram::findOrFail($programId)->available_slots);
        $this->assertSame('approved', ProgramApplication::findOrFail($applicationId)->application_status);

        Sanctum::actingAs($seeker);
        $this->getJson('/api/seeker/government-program-applications')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'approved')
            ->assertJsonPath('data.0.remarks', 'Qualified for the next training batch.');

        // Seeker programs list returns the program with an eligibility payload.
        $this->getJson('/api/seeker/government-programs')
            ->assertOk()
            ->assertJsonPath('programs.data.0.eligibility.status', fn ($status) => is_string($status));
    }

    public function test_closed_full_and_expired_programs_reject_applications(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => 'rules.admin@example.test',
            'password' => 'password123',
            'role' => 'administrator',
            'status' => 'active',
        ]);
        $seeker = JobSeeker::create([
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'mobile_number' => '09179876543',
            'email' => 'rules.seeker@example.test',
            'password' => 'password123',
            'profile_completed' => true,
        ]);

        $program = GovernmentProgram::create([
            'admin_id' => $admin->admin_id,
            'program_name' => 'Closed Training',
            'category' => 'tech_voc_training',
            'description' => 'Closed training test.',
            'total_slots' => 1,
            'available_slots' => 1,
            'program_status' => 'closed',
            'visibility' => 'public',
        ]);

        Sanctum::actingAs($seeker);
        $this->postJson("/api/seeker/government-programs/{$program->program_id}/apply")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('program');

        $program->update([
            'program_status' => 'open',
            'application_deadline' => now()->subDay()->toDateString(),
        ]);
        $this->postJson("/api/seeker/government-programs/{$program->program_id}/apply")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('program');

        $program->update([
            'application_deadline' => now()->addDay()->toDateString(),
            'available_slots' => 0,
        ]);
        $this->postJson("/api/seeker/government-programs/{$program->program_id}/apply")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('program');
    }

    public function test_zero_interference_job_fair_routes_are_registered_without_qr_workflow(): void
    {
        $uris = collect(Route::getRoutes()->getRoutes())->map(fn ($route) => $route->uri());

        $this->assertTrue($uris->contains('api/job-fairs'));
        $this->assertTrue($uris->contains('api/employer/job-fairs/{jobFair}/results'));
        $this->assertTrue($uris->contains('api/admin/job-fairs/{jobFair}/proxy-results'));
        $this->assertFalse($uris->contains('api/job-fairs/{id}/rsvp'));
        $this->assertFalse($uris->contains('api/job-fairs/scan-qr'));
    }

    private function createTables(): void
    {
        if (! Schema::hasTable('administrators')) {
            Schema::create('administrators', function (Blueprint $table) {
                $table->id('admin_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('role')->default('admin');
                $table->string('status')->default('active');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('first_name');
                $table->string('middle_name')->nullable();
                $table->string('last_name');
                $table->string('mobile_number');
                $table->string('email')->unique();
                $table->string('password');
                $table->date('date_of_birth')->nullable();
                $table->string('educ_attainment')->nullable();
                $table->string('employment_status')->nullable();
                $table->string('address_house_street')->nullable();
                $table->string('address_barangay')->nullable();
                $table->string('address_municipality_city')->nullable();
                $table->string('address_province')->nullable();
                $table->boolean('profile_completed')->default(false);
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
                $table->string('industry')->nullable();
                $table->string('mobile_number')->nullable();
                $table->string('verification_status')->default('pending');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('occupations')) {
            Schema::create('occupations', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('skill_catalog_entries')) {
            Schema::create('skill_catalog_entries', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('normalized_name');
                $table->text('search_terms')->nullable();
                $table->string('category');
                $table->string('source')->nullable();
                $table->unsignedInteger('occupation_count')->default(0);
                $table->boolean('is_hot')->default(false);
                $table->boolean('is_in_demand')->default(false);
                $table->string('version')->nullable();
                $table->timestamps();
                $table->unique(['category', 'normalized_name']);
            });
        }

        if (! Schema::hasTable('job_vacancies')) {
            Schema::create('job_vacancies', function (Blueprint $table) {
                $table->id('post_id');
                $table->foreignId('employer_id');
                $table->foreignId('occupation_id')->nullable();
                $table->string('job_title')->nullable();
                $table->string('status')->default('active');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('government_programs')) {
            Schema::create('government_programs', function (Blueprint $table) {
                $table->id('program_id');
                $table->foreignId('admin_id');
                $table->string('program_name');
                $table->string('category');
                $table->string('slug')->nullable();
                $table->text('short_description')->nullable();
                $table->text('description')->nullable();
                $table->text('target_beneficiaries')->nullable();
                $table->json('eligibility_requirements')->nullable();
                $table->json('required_documents')->nullable();
                $table->string('target_industry')->nullable();
                $table->foreignId('target_occupation_id')->nullable();
                $table->dateTime('schedule')->nullable();
                $table->string('venue')->nullable();
                $table->text('location_address')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->date('application_deadline')->nullable();
                $table->unsignedInteger('slot_limit')->default(0);
                $table->unsignedInteger('total_slots')->default(0);
                $table->unsignedInteger('available_slots')->default(0);
                $table->string('status')->default('open');
                $table->string('program_status')->default('open');
                $table->string('visibility')->default('public');
                $table->string('contact_person')->nullable();
                $table->string('contact_email')->nullable();
                $table->string('contact_phone')->nullable();
                $table->string('attachment_path')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->timestamp('archived_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('program_applications')) {
            Schema::create('program_applications', function (Blueprint $table) {
                $table->id('prog_apply_id');
                $table->foreignId('program_id');
                $table->foreignId('seeker_id');
                $table->string('status')->default('pending');
                $table->string('application_status')->default('pending');
                $table->json('submitted_files')->nullable();
                $table->json('eligibility_snapshot')->nullable();
                $table->unsignedTinyInteger('eligibility_score')->nullable();
                $table->text('admin_remarks')->nullable();
                $table->foreignId('reviewed_by_admin_id')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamps();
                $table->unique(['program_id', 'seeker_id']);
            });
        }

        if (! Schema::hasTable('government_program_skills')) {
            Schema::create('government_program_skills', function (Blueprint $table) {
                $table->id();
                $table->foreignId('government_program_id');
                $table->foreignId('skill_id')->nullable();
                $table->string('skill_name');
                $table->string('type')->default('taught');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('government_program_application_documents')) {
            Schema::create('government_program_application_documents', function (Blueprint $table) {
                $table->id('document_id');
                $table->foreignId('application_id');
                $table->string('document_type');
                $table->string('document_name');
                $table->string('file_path');
                $table->string('original_filename');
                $table->string('mime_type');
                $table->unsignedBigInteger('size');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_certificates')) {
            Schema::create('seeker_certificates', function (Blueprint $table) {
                $table->id('certificate_id');
                $table->foreignId('seeker_id');
                $table->foreignId('program_application_id')->nullable();
                $table->string('title');
                $table->string('issuing_body');
                $table->string('file_path');
                $table->string('original_filename');
                $table->string('mime_type');
                $table->unsignedBigInteger('file_size');
                $table->date('issued_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('employer_skill_demands')) {
            Schema::create('employer_skill_demands', function (Blueprint $table) {
                $table->id('demand_id');
                $table->foreignId('employer_id');
                $table->foreignId('job_vacancy_id')->nullable();
                $table->foreignId('skill_id')->nullable();
                $table->string('skill_name');
                $table->foreignId('occupation_id')->nullable();
                $table->foreignId('linked_program_id')->nullable();
                $table->unsignedInteger('workers_needed');
                $table->text('reason');
                $table->string('preferred_training_timeline')->nullable();
                $table->string('status')->default('submitted');
                $table->text('remarks')->nullable();
                $table->text('admin_remarks')->nullable();
                $table->foreignId('reviewed_by_admin_id')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->string('notifiable_type');
                $table->unsignedBigInteger('notifiable_id');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('sms_notifications')) {
            Schema::create('sms_notifications', function (Blueprint $table) {
                $table->id('notification_id');
                $table->string('recipient_type');
                $table->unsignedBigInteger('recipient_id');
                $table->string('phone_number');
                $table->string('message_type');
                $table->text('content');
                $table->string('status')->default('pending');
                $table->timestamp('sent_at')->nullable();
                $table->timestamps();
            });
        }
    }
}
