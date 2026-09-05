<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobFairResultReport;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JobFairEcosystemFlowTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        // This test verifies the safe *fallback* to log-only when live UniSMS
        // credentials aren't configured — so those credentials must be cleared
        // here rather than left to whatever happens to be in the environment.
        // Without this, a developer machine with real UNISMS_SECRET_KEY /
        // UNISMS_SENDER_ID set (e.g. for testing the SMS feature itself)
        // makes the provider binding resolve to the live UniSmsProvider
        // instead, which then fails outright since Http::fake() isn't set up
        // to intercept it.
        config([
            'services.sms.log_only' => false,
            'services.sms.secret_key' => null,
            'services.sms.sender_id' => null,
        ]);
        $this->createTables();
    }

    public function test_omnichannel_job_fair_flow_with_seeker_qr_registration(): void
    {
        Storage::fake('local');
        $admin = Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Manager', 'email' => 'jobfair-admin@example.test',
            'mobile_number' => '09170000001', 'password' => 'password123', 'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
        $employer = $this->employer('ecosystem-employer@example.test', 'Northstar Manufacturing');
        $otherEmployer = $this->employer('other-employer@example.test', 'Other Employer');

        Sanctum::actingAs($admin);
        $fairId = $this->postJson('/api/admin/job-fairs', [
            'title' => 'Labor Day Job Fair and One-Stop Shop', 'description' => 'PESO employment bulletin.',
            'start_date' => '2026-11-01', 'end_date' => '2026-11-01', 'start_time' => '08:00', 'end_time' => '16:00',
            'venue' => '3rd Level, CB Mall Event Center, Urdaneta City',
            'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City', 'barangay' => 'Nancayasan',
            'sector' => 'local', 'target_sector' => 'Multi-sector',
            'partner_agencies' => ['DOLE', 'CB Mall Urdaneta City'], 'submission_deadline' => '2026-10-15 17:00:00',
            'contact_email' => 'peso@example.test', 'maximum_representatives' => 2, 'status' => 'draft',
        ])->assertCreated()->assertJsonPath('job_fair.status', 'draft')->json('job_fair.job_fair_id');

        $this->postJson("/api/admin/job-fairs/{$fairId}/publish", ['status' => 'accepting_employers'])->assertOk();
        $this->postJson("/api/admin/job-fairs/{$fairId}/invite", ['employer_id' => $employer->employer_id])->assertCreated();

        Sanctum::actingAs($employer);
        $event = $this->getJson('/api/employer/job-fairs')->assertOk()
            ->assertJsonPath('data.0.title', 'Labor Day Job Fair and One-Stop Shop')
            ->assertJsonMissingPath('data.0.pass')->json('data.0');
        $this->postJson("/api/employer/job-fairs/{$fairId}/respond", ['response' => 'accepted'])->assertOk();

        $requirementId = collect($event['requirements'])->firstWhere('code', 'business_permit')['id'];
        $upload = $this->post("/api/employer/job-fairs/{$fairId}/requirements/{$requirementId}", [
            'document' => UploadedFile::fake()->create('permit.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonMissingPath('submission.document_path');
        $submissionId = $upload->json('submission.id');

        $this->postJson("/api/employer/job-fairs/{$fairId}/confirmation-slip", [
            'representative_1_name' => 'Maria Santos', 'representative_1_contact' => '09171234567',
            'email' => $employer->email, 'number_of_job_vacancies' => 5,
            'will_conduct_onsite_interview' => true, 'logistics_requests' => 'One electrical outlet',
        ])->assertOk();

        $selfReportId = $this->postJson("/api/employer/job-fairs/{$fairId}/results", [
            'total_male' => 1, 'total_female' => 0, 'total_applicants' => 1, 'total_hots' => 1,
            'total_near_hired' => 0, 'total_rejected' => 0, 'total_vacancies_solicited' => 5, 'total_vacancies_offered' => 5,
            'entries' => [['applicant_name' => 'Juan Dela Cruz', 'gender' => 'male', 'position_applied_for' => 'Production Operator', 'status' => 'hots']],
        ])->assertOk()->assertJsonPath('result_report.source', 'employer_self_service')->json('result_report.id');
        $this->get("/api/employer/job-fair-results/{$selfReportId}/roi-form-3")->assertOk()->assertHeader('content-type', 'application/pdf');

        Sanctum::actingAs($otherEmployer);
        $this->get("/api/employer/job-fair-results/{$selfReportId}/roi-form-3")->assertForbidden();
        $this->get("/api/employer/job-fair-requirements/{$submissionId}/view")->assertForbidden();

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/job-fairs/{$fairId}/proxy-confirmation-slip", [
            'company_name' => 'Phone Confirmed Company', 'representative_1_name' => 'Pedro Reyes',
            'representative_1_contact' => '09175550000', 'email' => 'paper@example.test',
            'number_of_job_vacancies' => 3, 'will_conduct_onsite_interview' => false,
        ])->assertCreated()->assertJsonPath('confirmation_slip.source', 'admin_proxy');
        $proxyPayload = [
            'company_name' => 'Walk-In Paper Company', 'employer_type' => 'paper_only_employer',
            'total_male' => 0, 'total_female' => 1, 'total_applicants' => 1, 'total_hots' => 0,
            'total_near_hired' => 0, 'total_rejected' => 1, 'total_vacancies_solicited' => 3, 'total_vacancies_offered' => 2,
            'mismatch_tallies' => [['mismatch_code' => 'skills_mismatch', 'count' => 1]],
        ];
        $this->postJson("/api/admin/job-fairs/{$fairId}/proxy-results", $proxyPayload)->assertCreated()->assertJsonPath('result_report.source', 'admin_proxy');
        $this->postJson("/api/admin/job-fairs/{$fairId}/proxy-results", $proxyPayload)->assertCreated();
        $this->assertSame(2, JobFairResultReport::where('job_fair_id', $fairId)->count());
        $this->postJson("/api/admin/job-fairs/{$fairId}/proxy-results", [...$proxyPayload, 'company_name' => 'Northstar Manufacturing'])
            ->assertUnprocessable()->assertJsonValidationErrors('company_name');

        $this->getJson("/api/admin/job-fairs/{$fairId}")->assertOk()
            ->assertJsonPath('metrics.self_service_reports', 1)->assertJsonPath('metrics.proxy_reports', 1)
            ->assertJsonPath('metrics.total_applicants', 2)->assertJsonPath('metrics.total_hots', 1);
        $this->get("/api/admin/job-fairs/{$fairId}/export-sprs")->assertOk()->assertHeader('content-type', 'application/pdf');

        $uris = collect(Route::getRoutes())->map(fn ($route) => $route->uri());
        $this->assertTrue($uris->contains('api/job-fairs/{id}/rsvp'));

        // A seeker can register while the fair is still open and gets a QR pass
        // back; re-registering is idempotent and returns the same pass.
        $seeker = $this->seeker('rsvp-seeker@example.test', 'Juana', 'Cruz');
        Sanctum::actingAs($seeker);
        $firstRsvp = $this->postJson("/api/job-fairs/{$fairId}/rsvp")->assertOk()
            ->assertJsonPath('pass.event_name', 'Labor Day Job Fair and One-Stop Shop')
            ->assertJsonPath('pass.name', 'Juana Cruz')
            ->json('pass');
        $this->assertNotEmpty($firstRsvp['qr_code_uuid']);

        $secondRsvp = $this->postJson("/api/job-fairs/{$fairId}/rsvp")->assertOk()->json('pass');
        $this->assertSame($firstRsvp['qr_code_uuid'], $secondRsvp['qr_code_uuid']);
        $this->assertSame(1, \DB::table('job_fair_attendees')->where('job_fair_id', $fairId)->count());

        $listing = $this->getJson('/api/job-fairs')->assertOk()->json('data');
        $this->assertTrue(collect($listing)->firstWhere('job_fair_id', $fairId)['is_rsvped']);

        Sanctum::actingAs($admin);
        $this->putJson("/api/admin/job-fairs/{$fairId}", ['status' => 'completed'])->assertOk();
        $this->postJson('/api/admin/reports/generate-sprs', ['month' => 11, 'year' => 2026])->assertOk()
            ->assertJsonPath('data.1_6_job_fairs.fairs_conducted', 1)
            ->assertJsonPath('data.1_6_job_fairs.participating_companies', 2)
            ->assertJsonPath('data.1_6_job_fairs.hots', 1);
        $this->assertGreaterThan(0, \DB::table('sms_notifications')->where('provider', 'log_only')->count());
        $this->assertSame(0, \DB::table('sms_notifications')->where('provider', '!=', 'log_only')->count());
    }

    public function test_verified_employer_reuses_accreditation_documents_for_job_fair_requirements(): void
    {
        Storage::fake('local');
        $admin = Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Manager', 'email' => 'reuse-admin@example.test',
            'mobile_number' => '09170000002', 'password' => 'password123', 'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
        $employer = $this->employer('reuse-employer@example.test', 'Verified Reuse Corp');

        Storage::disk('local')->put('employer_documents/permit-on-file.pdf', '%PDF-1.4 fake permit content');
        \DB::table('employer_documents')->insert([
            'employer_id' => $employer->employer_id, 'document_type' => 'mayors_permit',
            'document_path' => 'employer_documents/permit-on-file.pdf', 'original_filename' => 'business-permit-2026.pdf',
            'file_size' => 2048, 'mime_type' => 'application/pdf', 'uploaded_at' => now(),
            'verification_status' => 'approved', 'created_at' => now(), 'updated_at' => now(),
        ]);

        Sanctum::actingAs($admin);
        $fairId = $this->postJson('/api/admin/job-fairs', [
            'title' => 'Reuse Verified Documents Job Fair', 'description' => 'Checks accreditation document reuse.',
            'start_date' => '2026-11-15', 'end_date' => '2026-11-15', 'start_time' => '08:00', 'end_time' => '16:00',
            'venue' => 'PESO Urdaneta Hall',
            'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City', 'barangay' => 'Nancayasan',
            'sector' => 'local', 'target_sector' => 'Multi-sector',
            'partner_agencies' => ['DOLE'], 'submission_deadline' => '2026-10-30 17:00:00',
            'contact_email' => 'peso@example.test', 'maximum_representatives' => 2, 'status' => 'draft',
        ])->assertCreated()->json('job_fair.job_fair_id');
        $this->postJson("/api/admin/job-fairs/{$fairId}/publish", ['status' => 'accepting_employers'])->assertOk();
        $this->postJson("/api/admin/job-fairs/{$fairId}/invite", ['employer_id' => $employer->employer_id])->assertCreated();

        Sanctum::actingAs($employer);
        $this->postJson("/api/employer/job-fairs/{$fairId}/respond", ['response' => 'accepted'])->assertOk();

        // No manual upload happens for business_permit — the approved
        // accreditation document should already satisfy it.
        $event = $this->getJson('/api/employer/job-fairs')->assertOk()->json('data.0');
        $businessPermit = collect($event['participation']['requirements'])->firstWhere('label', 'Business Permit');

        $this->assertNotNull($businessPermit, 'Business Permit requirement should be auto-satisfied.');
        $this->assertTrue($businessPermit['reused_from_verification']);
        $this->assertSame('business-permit-2026.pdf', $businessPermit['original_filename']);
        $this->assertSame('approved', $businessPermit['status']);

        // The employer can still view/download the reused document.
        $this->get("/api/employer/job-fair-requirements/{$businessPermit['id']}/view")
            ->assertOk()->assertHeader('content-type', 'application/pdf');

        // A requirement with no matching accreditation document type
        // (job_vacancy_count) still needs a manual submission.
        $jobVacancyCount = collect($event['participation']['requirements'])->firstWhere('label', 'Job Vacancy Count');
        $this->assertNull($jobVacancyCount);
    }

    public function test_seeker_poster_feed_only_shows_approved_posterized_vacancy_submissions(): void
    {
        Storage::fake('local');
        $admin = Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Manager', 'email' => 'poster-admin@example.test',
            'mobile_number' => '09170000003', 'password' => 'password123', 'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
        $employer = $this->employer('poster-employer@example.test', 'Poster Corp');
        $seeker = $this->seeker('poster-seeker@example.test', 'Ana', 'Reyes');

        Sanctum::actingAs($admin);
        $fairId = $this->postJson('/api/admin/job-fairs', [
            'title' => 'Poster Feed Job Fair', 'description' => 'Checks the seeker poster feed.',
            'start_date' => '2026-11-20', 'end_date' => '2026-11-20', 'start_time' => '08:00', 'end_time' => '16:00',
            'venue' => 'PESO Urdaneta Hall',
            'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City', 'barangay' => 'Nancayasan',
            'sector' => 'local', 'target_sector' => 'Multi-sector',
            'partner_agencies' => ['DOLE'], 'submission_deadline' => '2026-11-05 17:00:00',
            'contact_email' => 'peso@example.test', 'maximum_representatives' => 2, 'status' => 'draft',
        ])->assertCreated()->json('job_fair.job_fair_id');
        $this->postJson("/api/admin/job-fairs/{$fairId}/publish", ['status' => 'accepting_employers'])->assertOk();
        $this->postJson("/api/admin/job-fairs/{$fairId}/invite", ['employer_id' => $employer->employer_id])->assertCreated();

        Sanctum::actingAs($employer);
        $this->postJson("/api/employer/job-fairs/{$fairId}/respond", ['response' => 'accepted'])->assertOk();
        $event = $this->getJson('/api/employer/job-fairs')->assertOk()->json('data.0');
        $posterRequirementId = collect($event['requirements'])->firstWhere('code', 'posterized_vacancy')['id'];
        $permitRequirementId = collect($event['requirements'])->firstWhere('code', 'business_permit')['id'];

        $posterUpload = $this->post("/api/employer/job-fairs/{$fairId}/requirements/{$posterRequirementId}", [
            'document' => \Illuminate\Http\UploadedFile::fake()->image('poster.jpg'),
        ], ['Accept' => 'application/json'])->assertOk();
        $posterSubmissionId = $posterUpload->json('submission.id');

        $permitUpload = $this->post("/api/employer/job-fairs/{$fairId}/requirements/{$permitRequirementId}", [
            'document' => \Illuminate\Http\UploadedFile::fake()->create('permit.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertOk();
        $permitSubmissionId = $permitUpload->json('submission.id');

        Sanctum::actingAs($seeker);
        $this->getJson('/api/job-fairs/posters')->assertOk()->assertJsonCount(0, 'data');
        $this->get("/api/job-fair-posters/{$posterSubmissionId}/view")->assertNotFound();

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/job-fair-requirements/{$posterSubmissionId}/review", ['status' => 'approved'])->assertOk();
        // Approving a different requirement type must never leak into the poster feed.
        $this->patchJson("/api/admin/job-fair-requirements/{$permitSubmissionId}/review", ['status' => 'approved'])->assertOk();

        Sanctum::actingAs($seeker);
        $feed = $this->getJson('/api/job-fairs/posters')->assertOk()->assertJsonCount(1, 'data')->json('data');
        $this->assertSame('Poster Corp', $feed[0]['company_name']);
        $this->assertSame('Poster Feed Job Fair', $feed[0]['job_fair_title']);
        $this->assertSame($fairId, $feed[0]['job_fair_id']);
        $this->assertStringStartsWith('image/', $feed[0]['mime_type']);

        $this->get("/api/job-fair-posters/{$posterSubmissionId}/view")->assertOk()->assertHeader('content-type', $feed[0]['mime_type']);
        $this->get("/api/job-fair-posters/{$permitSubmissionId}/view")->assertNotFound();

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/job-fair-requirements/{$posterSubmissionId}/review", ['status' => 'rejected', 'admin_remarks' => 'Blurry — please re-upload.'])->assertOk();
        Sanctum::actingAs($seeker);
        $this->getJson('/api/job-fairs/posters')->assertOk()->assertJsonCount(0, 'data');
    }

    private function employer(string $email, string $company): Employer
    {
        return Employer::create([
            'email' => $email, 'password' => 'password123', 'company_type' => 'corporation_partnership',
            'company_name' => $company, 'mobile_number' => '09171234567', 'verification_status' => 'verified',
            'verified_at' => now(), 'email_verified_at' => now(),
        ]);
    }

    private function seeker(string $email, string $firstName, string $lastName): \App\Models\JobSeeker
    {
        return \App\Models\JobSeeker::create([
            'email' => $email, 'password' => 'password123', 'first_name' => $firstName, 'last_name' => $lastName,
        ]);
    }

    private function createTables(): void
    {
        Schema::create('administrators', function (Blueprint $t) { $t->id('admin_id'); $t->string('first_name'); $t->string('last_name'); $t->string('email')->unique(); $t->string('mobile_number')->nullable(); $t->string('password'); $t->string('role')->nullable(); $t->string('status')->nullable(); $t->timestamp('email_verified_at')->nullable(); $t->rememberToken(); $t->timestamps(); });
        Schema::create('employers', function (Blueprint $t) { $t->id('employer_id'); $t->string('email')->unique(); $t->string('password'); $t->string('company_type')->nullable(); $t->string('company_name')->nullable(); $t->string('trade_name')->nullable(); $t->string('mobile_number')->nullable(); $t->string('representative_contact_number')->nullable(); $t->string('verification_status')->nullable(); $t->timestamp('verified_at')->nullable(); $t->timestamp('email_verified_at')->nullable(); $t->softDeletes(); $t->rememberToken(); $t->timestamps(); });
        Schema::create('employer_documents', function (Blueprint $t) { $t->id('document_id'); $t->unsignedBigInteger('employer_id'); $t->string('document_type'); $t->string('document_path'); $t->string('original_filename'); $t->integer('file_size'); $t->string('mime_type'); $t->timestamp('uploaded_at')->nullable(); $t->string('verification_status')->default('pending'); $t->text('admin_notes')->nullable(); $t->date('expiration_date')->nullable(); $t->timestamp('viewed_at')->nullable(); $t->timestamps(); });
        Schema::create('job_seekers', function (Blueprint $t) { $t->id('seeker_id'); $t->string('email')->nullable(); $t->string('password')->nullable(); $t->string('first_name')->nullable(); $t->string('last_name')->nullable(); $t->string('sex')->nullable(); $t->string('gender')->nullable(); $t->timestamps(); });
        Schema::create('seeker_skills', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('seeker_id'); $t->unsignedBigInteger('skill_id')->nullable(); $t->string('skill_name')->nullable(); $t->timestamps(); });
        Schema::create('job_fair_attendees', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->unsignedBigInteger('seeker_id'); $t->uuid('qr_code_uuid')->unique(); $t->timestamp('scanned_at')->nullable(); $t->boolean('is_attended')->default(false); $t->timestamps(); });
        Schema::create('job_vacancies', function (Blueprint $t) { $t->id('post_id'); $t->unsignedBigInteger('employer_id'); $t->unsignedInteger('vacancies_count')->default(0); $t->boolean('spes_tupad_eligible')->default(false); $t->string('status')->default('active'); $t->timestamps(); });
        Schema::create('applications', function (Blueprint $t) { $t->id('apply_id'); $t->unsignedBigInteger('post_id'); $t->unsignedBigInteger('seeker_id'); $t->string('status')->default('pending'); $t->timestamp('status_changed_at')->nullable(); $t->timestamps(); });
        Schema::create('job_fairs', function (Blueprint $t) { $t->id('job_fair_id'); $t->unsignedBigInteger('admin_id'); $t->unsignedBigInteger('created_by')->nullable(); $t->string('title'); $t->text('description')->nullable(); $t->date('start_date')->nullable(); $t->date('end_date')->nullable(); $t->string('venue'); $t->string('province', 100)->nullable(); $t->string('province_code', 20)->nullable(); $t->string('city_municipality', 150)->nullable(); $t->string('city_code', 20)->nullable(); $t->string('barangay', 150)->nullable(); $t->string('barangay_code', 20)->nullable(); $t->string('specific_address', 255)->nullable(); $t->decimal('latitude', 10, 7)->nullable(); $t->decimal('longitude', 10, 7)->nullable(); $t->string('google_place_id')->nullable(); $t->string('sector')->nullable(); $t->string('target_sector')->nullable(); $t->json('partner_agencies')->nullable(); $t->date('event_date')->nullable(); $t->time('start_time')->nullable(); $t->time('end_time')->nullable(); $t->dateTime('submission_deadline')->nullable(); $t->string('contact_email')->nullable(); $t->unsignedTinyInteger('maximum_representatives')->default(2); $t->string('status')->default('draft'); $t->boolean('is_public')->default(false); $t->timestamp('published_at')->nullable(); $t->unsignedBigInteger('published_by')->nullable(); $t->timestamps(); });
        Schema::create('job_fair_employers', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->unsignedBigInteger('employer_id'); $t->string('participation_status')->default('interested'); $t->string('source')->nullable(); $t->string('confirmation_channel')->nullable(); $t->timestamp('joined_at')->nullable(); $t->timestamp('invited_at')->nullable(); $t->timestamp('responded_at')->nullable(); $t->timestamp('reviewed_at')->nullable(); $t->timestamp('approved_at')->nullable(); $t->timestamp('attended_at')->nullable(); $t->timestamp('no_show_at')->nullable(); $t->timestamp('encoded_results_at')->nullable(); $t->timestamp('report_generated_at')->nullable(); $t->text('remarks')->nullable(); $t->unsignedBigInteger('reviewed_by')->nullable(); $t->timestamps(); $t->unique(['job_fair_id','employer_id']); });
        Schema::create('job_fair_requirements', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->string('code'); $t->string('label'); $t->boolean('is_required')->default(true); $t->unsignedSmallInteger('sort_order')->default(0); $t->timestamps(); });
        Schema::create('job_fair_requirement_submissions', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('job_fair_requirement_id'); $t->unsignedBigInteger('job_fair_employer_id'); $t->unsignedBigInteger('employer_id'); $t->unsignedBigInteger('employer_document_id')->nullable(); $t->string('document_path')->nullable(); $t->string('original_filename')->nullable(); $t->unsignedBigInteger('file_size')->nullable(); $t->string('mime_type')->nullable(); $t->string('status'); $t->text('admin_remarks')->nullable(); $t->timestamp('submitted_at')->nullable(); $t->timestamp('reviewed_at')->nullable(); $t->unsignedBigInteger('reviewed_by')->nullable(); $t->timestamps(); });
        Schema::create('job_fair_confirmation_slips', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->unsignedBigInteger('job_fair_employer_id')->nullable(); $t->unsignedBigInteger('employer_id')->nullable(); $t->string('company_name'); $t->string('representative_1_name')->nullable(); $t->string('representative_1_contact')->nullable(); $t->string('representative_2_name')->nullable(); $t->string('representative_2_contact')->nullable(); $t->string('email')->nullable(); $t->unsignedInteger('number_of_job_vacancies'); $t->boolean('will_conduct_onsite_interview'); $t->text('logistics_requests')->nullable(); $t->string('source'); $t->string('dedupe_key'); $t->string('submitted_by')->nullable(); $t->timestamp('submitted_at')->nullable(); $t->timestamps(); $t->unique(['job_fair_id','dedupe_key']); });
        Schema::create('job_fair_result_reports', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->unsignedBigInteger('job_fair_employer_id')->nullable(); $t->unsignedBigInteger('employer_id')->nullable(); $t->string('company_name'); $t->string('normalized_company_name'); $t->string('dedupe_key'); $t->string('employer_type'); $t->string('source'); $t->string('office_location')->nullable(); $t->string('contact_person')->nullable(); $t->string('contact_number')->nullable(); foreach (['total_male','total_female','total_applicants','total_hots','total_near_hired','total_rejected','total_vacancies_solicited','total_vacancies_offered'] as $c) $t->unsignedInteger($c)->default(0); $t->text('remarks')->nullable(); $t->unsignedBigInteger('encoded_by_admin_id')->nullable(); $t->unsignedBigInteger('submitted_by_employer_id')->nullable(); $t->timestamp('submitted_at')->nullable(); $t->timestamp('report_generated_at')->nullable(); $t->timestamps(); $t->unique(['job_fair_id','dedupe_key']); });
        Schema::create('job_fair_result_entries', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('result_report_id'); $t->string('applicant_name'); $t->string('gender'); $t->string('position_applied_for'); $t->string('status'); $t->string('mismatch_code')->nullable(); $t->text('remarks')->nullable(); $t->timestamps(); });
        Schema::create('job_fair_result_mismatch_tallies', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('result_report_id'); $t->string('mismatch_code'); $t->unsignedInteger('count'); $t->timestamps(); });
        Schema::create('job_fair_vacancies', function (Blueprint $t) { $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->unsignedBigInteger('employer_id'); $t->unsignedBigInteger('vacancy_id'); $t->timestamps(); });
        Schema::create('notifications', function (Blueprint $t) { $t->uuid('id')->primary(); $t->string('type'); $t->morphs('notifiable'); $t->text('data'); $t->timestamp('read_at')->nullable(); $t->timestamps(); });
        Schema::create('analytics_reports', function (Blueprint $t) { $t->id('report_id'); $t->unsignedBigInteger('admin_id'); $t->string('title'); $t->string('report_category'); $t->date('coverage_start'); $t->date('coverage_end'); $t->json('data_summary'); $t->string('status')->nullable(); $t->timestamps(); });
        Schema::create('sms_notifications', function (Blueprint $t) { $t->id('notification_id'); $t->string('recipient_type'); $t->unsignedBigInteger('recipient_id'); $t->string('phone_number')->nullable(); $t->string('normalized_phone_number')->nullable(); $t->string('message_type'); $t->string('purpose')->nullable(); $t->text('content'); $t->string('status')->default('pending'); $t->string('gateway_status')->nullable(); $t->string('provider')->nullable(); $t->string('provider_message_id')->nullable(); $t->string('provider_reference_id')->nullable(); $t->text('provider_error')->nullable(); $t->text('error_message')->nullable(); $t->json('metadata')->nullable(); $t->timestamp('sent_at')->nullable(); $t->timestamps(); });
    }
}
