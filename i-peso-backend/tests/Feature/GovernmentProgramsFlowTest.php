<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Employer;
use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
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

    public function test_admin_can_publish_a_program_and_seekers_can_read_the_posting(): void
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

        // Government programs are postings only: the seeker reads the announcement
        // and its eligibility hint, then applies in person at the PESO office.
        $this->getJson("/api/seeker/government-programs/{$programId}")
            ->assertOk()
            ->assertJsonPath('program.title', 'SMAW NC II Training Test');

        // Seeker programs list returns the program with an eligibility payload.
        $this->getJson('/api/seeker/government-programs')
            ->assertOk()
            ->assertJsonPath('programs.data.0.eligibility.status', fn ($status) => is_string($status));
    }

    /**
     * The posting form pre-fills from these, so a preset that the API would
     * reject, or whose rules the eligibility engine cannot read, would hand an
     * administrator a form that fails on save or scores nobody.
     */
    public function test_every_category_preset_is_postable_and_scoreable(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Admin',
            'email' => 'preset.admin@example.test', 'password' => 'password123',
            'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($admin);
        $presets = $this->getJson('/api/admin/government-programs/presets')
            ->assertOk()
            ->json('presets');

        $this->assertNotEmpty($presets, 'No category presets are configured.');

        foreach ($presets as $category => $preset) {
            $this->postJson('/api/admin/government-programs', [
                'program_name' => "Preset check: {$category}",
                'category' => $category,
                'description' => $preset['description'] ?: 'Posted from the category preset.',
                'short_description' => $preset['short_description'],
                'target_beneficiaries' => $preset['target_beneficiaries'],
                'eligibility_requirements' => $preset['eligibility_requirements'],
                'required_documents' => $preset['required_documents'],
                'citizen_charter_steps' => $preset['citizen_charter_steps'],
                'eligibility_rules' => $preset['eligibility_rules'],
                'total_slots' => 10,
                'program_status' => 'open',
                'visibility' => 'public',
            ])->assertCreated();
        }
    }

    /**
     * A 17-year-old is under the SPES floor of 15-30 only at the top end, so
     * use an over-age seeker: the age rule is `required`, and a failed
     * required rule must force "not_eligible" however well the rest scores.
     */
    public function test_spes_preset_rules_actually_gate_on_age(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Admin',
            'email' => 'spes.admin@example.test', 'password' => 'password123',
            'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
        $preset = config('government_program_presets.spes');

        Sanctum::actingAs($admin);
        $programId = $this->postJson('/api/admin/government-programs', [
            'program_name' => 'SPES Summer Batch',
            'category' => 'spes',
            'description' => $preset['description'],
            'eligibility_rules' => $preset['eligibility_rules'],
            'total_slots' => 20,
            'program_status' => 'open',
            'visibility' => 'public',
        ])->assertCreated()->json('program.program_id');

        $eligible = JobSeeker::create([
            'first_name' => 'Ana', 'last_name' => 'Cruz', 'mobile_number' => '09170000101',
            'email' => 'spes.young@example.test', 'password' => 'password123',
            'profile_completed' => true, 'date_of_birth' => now()->subYears(19)->toDateString(),
        ]);
        $tooOld = JobSeeker::create([
            'first_name' => 'Ben', 'last_name' => 'Santos', 'mobile_number' => '09170000102',
            'email' => 'spes.old@example.test', 'password' => 'password123',
            'profile_completed' => true, 'date_of_birth' => now()->subYears(45)->toDateString(),
        ]);

        Sanctum::actingAs($eligible);
        $this->getJson("/api/seeker/government-programs/{$programId}")
            ->assertOk()
            ->assertJsonPath('program.eligibility.status', 'highly_eligible');

        Sanctum::actingAs($tooOld);
        $this->getJson("/api/seeker/government-programs/{$programId}")
            ->assertOk()
            ->assertJsonPath('program.eligibility.status', 'not_eligible');
    }

    /**
     * Programs a seeker qualifies for lead the list, and ones they do not are
     * ranked last rather than hidden — the criteria are verified in person and
     * a profile can be incomplete, so a government posting stays readable.
     */
    public function test_seeker_list_ranks_eligible_programs_first_without_hiding_the_rest(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Admin',
            'email' => 'rank.admin@example.test', 'password' => 'password123',
            'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        // Posted first, and with the earlier deadline, so the old ordering
        // would have put the one this seeker cannot join at the top.
        $this->postJson('/api/admin/government-programs', [
            'program_name' => 'Youth Only Program',
            'category' => 'spes',
            'description' => 'Restricted to 15-30 year olds.',
            'eligibility_rules' => config('government_program_presets.spes.eligibility_rules'),
            'total_slots' => 5, 'program_status' => 'open', 'visibility' => 'public',
            'application_deadline' => now()->addDays(3)->toDateString(),
        ])->assertCreated();

        $this->postJson('/api/admin/government-programs', [
            'program_name' => 'Open To Everyone Program',
            'category' => 'career_guidance',
            'description' => 'No eligibility rules at all.',
            'eligibility_rules' => [],
            'total_slots' => 5, 'program_status' => 'open', 'visibility' => 'public',
            'application_deadline' => now()->addDays(30)->toDateString(),
        ])->assertCreated();

        $olderSeeker = JobSeeker::create([
            'first_name' => 'Rita', 'last_name' => 'Bautista', 'mobile_number' => '09170000103',
            'email' => 'rank.seeker@example.test', 'password' => 'password123',
            'profile_completed' => true, 'date_of_birth' => now()->subYears(50)->toDateString(),
        ]);

        Sanctum::actingAs($olderSeeker);
        $rows = $this->getJson('/api/seeker/government-programs')->assertOk()->json('programs.data');

        $titles = array_column($rows, 'title');
        $this->assertSame('Open To Everyone Program', $titles[0], 'An eligible program should lead the list.');
        $this->assertContains('Youth Only Program', $titles, 'An ineligible program must still be listed.');
        $this->assertSame(
            'not_eligible',
            collect($rows)->firstWhere('title', 'Youth Only Program')['eligibility']['status'],
            'The ineligible program should be marked, not silently reordered.'
        );
    }

    public function test_government_programs_expose_no_application_routes(): void
    {
        // Programs are postings and announcements only — there is no in-app
        // transaction, so none of the old apply/review endpoints may come back.
        $uris = collect(Route::getRoutes()->getRoutes())->map(fn ($route) => $route->uri());

        foreach ([
            'api/seeker/government-programs/{governmentProgram}/apply',
            'api/seeker/government-program-applications',
            'api/admin/government-programs/{governmentProgram}/applications',
            'api/admin/government-program-applications/{programApplication}/status',
            'api/admin/programs/{governmentProgram}/applicants',
        ] as $uri) {
            $this->assertFalse($uris->contains($uri), "Unexpected program application route: {$uri}");
        }
    }

    public function test_job_fair_core_routes_are_registered(): void
    {
        $uris = collect(Route::getRoutes()->getRoutes())->map(fn ($route) => $route->uri());

        $this->assertTrue($uris->contains('api/job-fairs'));
        $this->assertTrue($uris->contains('api/job-fairs/{id}/rsvp'));
        $this->assertTrue($uris->contains('api/employer/job-fairs/{jobFair}/results'));
        $this->assertTrue($uris->contains('api/admin/job-fairs/{jobFair}/proxy-results'));
        // Seekers get a QR pass on RSVP, but employer booth-side scanning
        // remains a paper/manual process — that endpoint stays unrouted.
        $this->assertFalse($uris->contains('api/job-fairs/scan-qr'));
    }

    public function test_public_endpoint_lists_only_genuinely_open_programs_with_no_login(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => 'public.programs.admin@example.test',
            'password' => 'password123',
            'role' => 'administrator',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $basePayload = [
            'category' => 'tupad',
            'short_description' => 'Short-term emergency employment.',
            'description' => 'Full description of the program.',
            'eligibility_requirements' => ['Registered i-PESO job seeker'],
            'required_documents' => ['Valid ID'],
            'total_slots' => 5,
        ];

        // Should appear: open, public, future deadline, slots available.
        $this->postJson('/api/admin/government-programs', array_merge($basePayload, [
            'program_name' => 'TUPAD Batch 12',
            'program_status' => 'open',
            'visibility' => 'public',
            'application_deadline' => now()->addWeek()->toDateString(),
        ]))->assertCreated();

        // Should NOT appear: closed.
        $this->postJson('/api/admin/government-programs', array_merge($basePayload, [
            'program_name' => 'TUPAD Batch 11 (Closed)',
            'program_status' => 'closed',
            'visibility' => 'public',
            'application_deadline' => now()->addWeek()->toDateString(),
        ]))->assertCreated();

        // Should NOT appear: internal visibility (staff-only posting).
        $this->postJson('/api/admin/government-programs', array_merge($basePayload, [
            'program_name' => 'Internal Pilot Program',
            'program_status' => 'open',
            'visibility' => 'internal',
            'application_deadline' => now()->addWeek()->toDateString(),
        ]))->assertCreated();

        // Should NOT appear: deadline already passed.
        $this->postJson('/api/admin/government-programs', array_merge($basePayload, [
            'program_name' => 'TUPAD Batch 10 (Expired)',
            'program_status' => 'open',
            'visibility' => 'public',
            'application_deadline' => now()->subDay()->toDateString(),
        ]))->assertCreated();

        // Drop the admin session from earlier in this test — the whole point
        // of this endpoint is that the landing page has no seeker/admin
        // session yet, so the request below must be genuinely unauthenticated.
        $this->app['auth']->forgetGuards();

        $response = $this->getJson('/api/public/government-programs')->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains('TUPAD Batch 12'));
        $this->assertFalse($names->contains('TUPAD Batch 11 (Closed)'));
        $this->assertFalse($names->contains('Internal Pilot Program'));
        $this->assertFalse($names->contains('TUPAD Batch 10 (Expired)'));

        // Carries everything a visitor needs to act on the posting without an
        // account — the transaction happens in person at PESO, so gating the
        // requirements, documents and contact behind a login would only
        // obstruct the citizen.
        $entry = collect($response->json('data'))->firstWhere('name', 'TUPAD Batch 12');
        $this->assertEqualsCanonicalizing(
            [
                'program_id', 'slug', 'category', 'name', 'blurb', 'description',
                'target_beneficiaries', 'eligibility_requirements', 'required_documents',
                'citizen_charter_steps', 'start_date', 'end_date', 'application_deadline',
                'venue', 'location_address', 'total_slots', 'available_slots',
                'contact_person', 'contact_email', 'contact_phone',
            ],
            array_keys($entry),
        );

        // Internal detail still must not leak: eligibility_rules is the scoring
        // logic, and admin_id identifies the staff member who posted it.
        foreach (['eligibility_rules', 'admin_id', 'eligibility_snapshot', 'deleted_at'] as $internal) {
            $this->assertArrayNotHasKey($internal, $entry, "Public payload leaked {$internal}.");
        }
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
                // Added by later migrations; the harness builds this table by
                // hand, so it has to keep up or anything touching them fails
                // here while working fine in production.
                $table->json('eligibility_rules')->nullable();
                $table->json('citizen_charter_steps')->nullable();
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
