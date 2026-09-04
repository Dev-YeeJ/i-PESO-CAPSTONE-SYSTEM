<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Employer;
use App\Models\EmployerDocument;
use App\Models\JobFair;
use App\Models\JobFairEmployer;
use App\Models\JobFairRequirement;
use App\Models\JobSeeker;
use App\Notifications\JobFairNotification;
use App\Notifications\JobFairPublished;
use App\Services\JobFairService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Publishing a job fair mass-invites every verified employer — the digital
 * equivalent of PESO mailing the same recruitment-day letter to every
 * company on file — but each one only sees the documentary requirements
 * still outstanding for their own company type and accreditation record.
 */
class JobFairInvitationBroadcastTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTables();
    }

    public function test_publishing_notifies_every_verified_employer_and_tracks_them_as_invited(): void
    {
        Notification::fake();

        $verifiedOne = $this->employer('verified-one@example.test', 'sole_proprietorship');
        $verifiedTwo = $this->employer('verified-two@example.test', 'corporation_partnership');
        $unverified = $this->employer('unverified@example.test', 'sole_proprietorship', 'pending');
        $seekerOne = $this->seeker('seeker-one@example.test');
        $seekerTwo = $this->seeker('seeker-two@example.test');

        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $fair = $this->createFair($admin);

        $this->postJson("/api/admin/job-fairs/{$fair->job_fair_id}/publish")
            ->assertOk()
            ->assertJsonPath('message', 'Job Fair announcement published. 2 verified employer(s) notified by email, 2 job seeker(s) notified.');

        Notification::assertSentTo($verifiedOne, JobFairNotification::class);
        Notification::assertSentTo($verifiedTwo, JobFairNotification::class);
        Notification::assertNotSentTo($unverified, JobFairNotification::class);
        Notification::assertSentTo($seekerOne, JobFairPublished::class);
        Notification::assertSentTo($seekerTwo, JobFairPublished::class);

        $this->assertDatabaseHas('job_fair_employers', [
            'job_fair_id' => $fair->job_fair_id, 'employer_id' => $verifiedOne->employer_id,
            'participation_status' => 'invited', 'source' => 'peso_broadcast',
        ]);
        $this->assertSame(2, JobFairEmployer::where('job_fair_id', $fair->job_fair_id)->count());
    }

    public function test_republishing_does_not_send_a_second_round_of_invitations(): void
    {
        Notification::fake();
        $employer = $this->employer('repeat@example.test', 'sole_proprietorship');
        $seeker = $this->seeker('repeat-seeker@example.test');
        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $fair = $this->createFair($admin);

        $this->postJson("/api/admin/job-fairs/{$fair->job_fair_id}/publish")->assertOk();
        Notification::assertSentToTimes($employer, JobFairNotification::class, 1);
        Notification::assertSentToTimes($seeker, JobFairPublished::class, 1);

        // Re-publishing (e.g. after moving from accepting_employers back to
        // published) must not re-email everyone who was already invited, nor
        // re-notify every seeker.
        $this->postJson("/api/admin/job-fairs/{$fair->job_fair_id}/publish")
            ->assertOk()
            ->assertJsonPath('message', 'Job Fair announcement published.');

        Notification::assertSentToTimes($employer, JobFairNotification::class, 1);
        Notification::assertSentToTimes($seeker, JobFairPublished::class, 1);
        $this->assertSame(1, JobFairEmployer::where('job_fair_id', $fair->job_fair_id)->count());
    }

    public function test_an_employer_manually_invited_before_publish_is_not_double_invited(): void
    {
        Notification::fake();
        $employer = $this->employer('pre-invited@example.test', 'sole_proprietorship');
        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $fair = $this->createFair($admin);

        $this->postJson("/api/admin/job-fairs/{$fair->job_fair_id}/invite", ['employer_id' => $employer->employer_id])
            ->assertCreated();
        $this->postJson("/api/admin/job-fairs/{$fair->job_fair_id}/publish")->assertOk();

        $this->assertSame(1, JobFairEmployer::where('job_fair_id', $fair->job_fair_id)->count());
        $this->assertDatabaseHas('job_fair_employers', [
            'job_fair_id' => $fair->job_fair_id, 'employer_id' => $employer->employer_id,
            'source' => 'admin_invitation',
        ]);
    }

    public function test_outstanding_requirements_are_trimmed_by_approved_documents_and_company_type(): void
    {
        $fair = $this->createFair();
        app(JobFairService::class)->seedRequirements($fair);
        $fair->refresh();

        $soleProp = $this->employer('sole-prop@example.test', 'sole_proprietorship');
        $corp = $this->employer('corp@example.test', 'corporation_partnership');

        // Sole prop already has an approved DTI cert and Mayor's Permit —
        // those two requirements should drop off; PhilJobNet and the
        // job-fair-only items (never backed by an accreditation document)
        // stay.
        $this->approvedDocument($soleProp, 'dti_certificate');
        $this->approvedDocument($soleProp, 'mayors_permit');

        $outstanding = app(JobFairService::class)->outstandingRequirementsFor($fair, $soleProp)->pluck('code');
        $this->assertNotContains('business_registration', $outstanding);
        $this->assertNotContains('business_permit', $outstanding);
        $this->assertContains('philjobnet_registration', $outstanding);
        $this->assertContains('no_pending_case', $outstanding);
        $this->assertContains('job_vacancy_count', $outstanding);

        // A corporation's SEC certificate does NOT satisfy a sole
        // proprietor's DTI-based business_registration requirement, and
        // vice versa — company type genuinely narrows which document counts.
        $this->approvedDocument($corp, 'dti_certificate');
        $corpOutstanding = app(JobFairService::class)->outstandingRequirementsFor($fair, $corp)->pluck('code');
        $this->assertContains('business_registration', $corpOutstanding);

        $corpLabel = app(JobFairService::class)->outstandingRequirementsFor($fair, $corp)
            ->firstWhere('code', 'business_registration')['label'];
        $this->assertStringContainsString('SEC', $corpLabel);

        $this->approvedDocument($corp, 'sec_certificate');
        $corpOutstandingAfter = app(JobFairService::class)->outstandingRequirementsFor($fair, $corp)->pluck('code');
        $this->assertNotContains('business_registration', $corpOutstandingAfter);
    }

    /**
     * Notification::fake() (used by the other tests here) intercepts before
     * toMail() ever runs, so a bug inside the letter template itself would
     * slip past every assertion above. Render it for real.
     */
    public function test_the_invitation_email_renders_without_error_and_mirrors_the_official_letter(): void
    {
        $fair = $this->createFair();
        app(JobFairService::class)->seedRequirements($fair);
        $fair->refresh();

        $employer = $this->employer('render-check@example.test', 'sole_proprietorship');
        $participation = JobFairEmployer::create([
            'job_fair_id' => $fair->job_fair_id, 'employer_id' => $employer->employer_id,
            'participation_status' => 'invited', 'source' => 'peso_broadcast', 'invited_at' => now(),
        ]);
        $outstanding = app(JobFairService::class)->outstandingRequirementsFor($fair, $employer);

        $mail = (new JobFairNotification($fair, 'invited', $participation, $outstanding))->toMail($employer);
        $rendered = $mail->render();

        $this->assertSame('Invitation: Broadcast Test Job Fair', $mail->subject);
        $this->assertStringContainsString('December 1, 2026, Tuesday', $rendered);
        $this->assertStringContainsString('8:00 AM', $rendered);
        $this->assertStringContainsString('5:00 PM', $rendered);
        $this->assertStringContainsString('PESO Urdaneta Hall', $rendered);
        $this->assertStringContainsString('BIR Certificate of Registration + DTI Business Name Registration', $rendered);
        $this->assertStringContainsString('pesourdanetacity@gmail.com', $rendered);
        $this->assertStringContainsString('two (2) printed copies', $rendered);
    }

    public function test_a_single_day_event_and_a_multi_day_event_format_the_date_line_differently(): void
    {
        $fair = $this->createFair();
        $employer = $this->employer('date-format@example.test', 'sole_proprietorship');
        $participation = JobFairEmployer::create([
            'job_fair_id' => $fair->job_fair_id, 'employer_id' => $employer->employer_id,
            'participation_status' => 'invited', 'source' => 'peso_broadcast', 'invited_at' => now(),
        ]);

        $singleDayRendered = (new JobFairNotification($fair, 'invited', $participation))->toMail($employer)->render();
        $this->assertStringContainsString('December 1, 2026, Tuesday', $singleDayRendered);

        $fair->update(['end_date' => '2026-12-03']);
        $multiDayRendered = (new JobFairNotification($fair->fresh(), 'invited', $participation))->toMail($employer)->render();
        $this->assertStringContainsString('December 1 to December 3, 2026', $multiDayRendered);
    }

    public function test_the_seeker_announcement_carries_the_fair_details_via_database_and_push(): void
    {
        $fair = $this->createFair();
        $seeker = $this->seeker('array-check@example.test');

        $notification = new JobFairPublished($fair);

        $this->assertSame(['database', \App\Notifications\Channels\ExpoPushChannel::class], $notification->via($seeker));

        $data = $notification->toArray($seeker);
        $this->assertSame($fair->job_fair_id, $data['job_fair_id']);
        $this->assertStringContainsString('Broadcast Test Job Fair', $data['message']);
        $this->assertStringContainsString('December 1, 2026', $data['message']);
        $this->assertStringContainsString('PESO Urdaneta Hall', $data['message']);
        $this->assertSame('/seeker/job-fairs', $data['action_url']);

        $push = $notification->toExpoPush($seeker);
        $this->assertSame($data['title'], $push['title']);
        $this->assertSame($data['message'], $push['body']);
        $this->assertSame('job_fair', $push['data']['type']);
    }

    // ── Fixtures ─────────────────────────────────────────────────────────

    private function admin(): Administrator
    {
        return Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Admin', 'email' => 'jobfair-broadcast-admin@example.test',
            'password' => 'password123', 'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function employer(string $email, string $companyType, string $verificationStatus = 'verified'): Employer
    {
        return Employer::create([
            'email' => $email, 'password' => 'password123', 'company_name' => ucfirst(explode('@', $email)[0]),
            'company_type' => $companyType, 'verification_status' => $verificationStatus, 'email_verified_at' => now(),
        ]);
    }

    private function seeker(string $email): JobSeeker
    {
        return JobSeeker::create([
            'first_name' => ucfirst(explode('@', $email)[0]), 'last_name' => 'Seeker',
            'email' => $email, 'password' => 'password123',
        ]);
    }

    private function approvedDocument(Employer $employer, string $type): void
    {
        EmployerDocument::create([
            'employer_id' => $employer->employer_id, 'document_type' => $type,
            'document_path' => "employer_documents/{$type}.pdf", 'original_filename' => "{$type}.pdf",
            'file_size' => 100, 'mime_type' => 'application/pdf', 'verification_status' => 'approved',
        ]);
    }

    private function createFair(?Administrator $admin = null): JobFair
    {
        return JobFair::create([
            'admin_id' => ($admin ?? $this->admin())->admin_id, 'title' => 'Broadcast Test Job Fair',
            'venue' => 'PESO Urdaneta Hall', 'province' => 'Pangasinan', 'city_municipality' => 'Urdaneta City',
            'barangay' => 'Nancayasan', 'sector' => 'local', 'start_date' => '2026-12-01', 'end_date' => '2026-12-01',
            'start_time' => '08:00', 'end_time' => '17:00', 'submission_deadline' => '2026-11-20',
            'status' => 'draft', 'is_public' => false, 'maximum_representatives' => 2,
        ]);
    }

    private function createTables(): void
    {
        Schema::create('administrators', function (Blueprint $t) {
            $t->id('admin_id'); $t->string('first_name'); $t->string('last_name'); $t->string('email')->unique();
            $t->string('password'); $t->string('role')->nullable(); $t->string('status')->nullable();
            $t->timestamp('email_verified_at')->nullable(); $t->rememberToken(); $t->timestamps();
        });

        Schema::create('employers', function (Blueprint $t) {
            $t->id('employer_id'); $t->string('email')->unique(); $t->string('password');
            $t->string('company_name')->nullable(); $t->string('trade_name')->nullable();
            $t->string('company_type')->nullable(); $t->string('mobile_number')->nullable();
            $t->string('verification_status')->default('pending'); $t->timestamp('email_verified_at')->nullable();
            $t->timestamps(); $t->softDeletes();
        });

        Schema::create('job_seekers', function (Blueprint $t) {
            $t->id('seeker_id'); $t->string('first_name')->nullable(); $t->string('last_name')->nullable();
            $t->string('email')->unique(); $t->string('password'); $t->timestamps();
        });

        Schema::create('employer_documents', function (Blueprint $t) {
            $t->id('document_id'); $t->unsignedBigInteger('employer_id'); $t->string('document_type');
            $t->string('document_path'); $t->string('original_filename'); $t->integer('file_size');
            $t->string('mime_type'); $t->timestamp('uploaded_at')->nullable();
            $t->string('verification_status')->default('pending'); $t->text('admin_notes')->nullable();
            $t->date('expiration_date')->nullable(); $t->timestamp('viewed_at')->nullable(); $t->timestamps();
        });

        Schema::create('job_fairs', function (Blueprint $t) {
            $t->id('job_fair_id'); $t->unsignedBigInteger('admin_id'); $t->unsignedBigInteger('created_by')->nullable();
            $t->string('title'); $t->text('description')->nullable(); $t->date('start_date')->nullable();
            $t->date('end_date')->nullable(); $t->string('venue'); $t->string('province', 100)->nullable();
            $t->string('province_code', 20)->nullable(); $t->string('city_municipality', 150)->nullable();
            $t->string('city_code', 20)->nullable(); $t->string('barangay', 150)->nullable();
            $t->string('barangay_code', 20)->nullable(); $t->string('specific_address', 255)->nullable();
            $t->decimal('latitude', 10, 7)->nullable(); $t->decimal('longitude', 10, 7)->nullable();
            $t->string('google_place_id')->nullable(); $t->string('sector')->nullable();
            $t->string('target_sector')->nullable(); $t->json('partner_agencies')->nullable();
            $t->date('event_date')->nullable(); $t->time('start_time')->nullable(); $t->time('end_time')->nullable();
            $t->dateTime('submission_deadline')->nullable(); $t->string('contact_email')->nullable();
            $t->unsignedTinyInteger('maximum_representatives')->default(2); $t->string('status')->default('draft');
            $t->boolean('is_public')->default(false); $t->timestamp('published_at')->nullable();
            $t->unsignedBigInteger('published_by')->nullable(); $t->timestamps();
        });

        Schema::create('job_fair_requirements', function (Blueprint $t) {
            $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->string('code'); $t->string('label');
            $t->boolean('is_required')->default(true); $t->unsignedSmallInteger('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('job_fair_employers', function (Blueprint $t) {
            $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->unsignedBigInteger('employer_id');
            $t->string('participation_status')->default('interested'); $t->string('source')->nullable();
            $t->string('confirmation_channel')->nullable(); $t->timestamp('joined_at')->nullable();
            $t->timestamp('invited_at')->nullable(); $t->timestamp('responded_at')->nullable();
            $t->timestamp('reviewed_at')->nullable(); $t->timestamp('approved_at')->nullable();
            $t->timestamp('attended_at')->nullable(); $t->timestamp('no_show_at')->nullable();
            $t->timestamp('encoded_results_at')->nullable(); $t->timestamp('report_generated_at')->nullable();
            $t->text('remarks')->nullable(); $t->unsignedBigInteger('reviewed_by')->nullable(); $t->timestamps();
            $t->unique(['job_fair_id', 'employer_id']);
        });

        Schema::create('job_fair_requirement_submissions', function (Blueprint $t) {
            $t->id(); $t->unsignedBigInteger('job_fair_requirement_id'); $t->unsignedBigInteger('job_fair_employer_id');
            $t->unsignedBigInteger('employer_id'); $t->unsignedBigInteger('employer_document_id')->nullable();
            $t->string('document_path')->nullable(); $t->string('original_filename')->nullable();
            $t->unsignedBigInteger('file_size')->nullable(); $t->string('mime_type')->nullable();
            $t->string('status'); $t->text('admin_remarks')->nullable(); $t->timestamp('submitted_at')->nullable();
            $t->timestamp('reviewed_at')->nullable(); $t->unsignedBigInteger('reviewed_by')->nullable();
            $t->timestamps();
        });

        Schema::create('job_fair_vacancies', function (Blueprint $t) {
            $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->unsignedBigInteger('employer_id');
            $t->unsignedBigInteger('vacancy_id'); $t->timestamps();
        });

        Schema::create('job_fair_result_reports', function (Blueprint $t) {
            $t->id(); $t->unsignedBigInteger('job_fair_id'); $t->unsignedBigInteger('job_fair_employer_id')->nullable();
            $t->unsignedBigInteger('employer_id')->nullable(); $t->string('company_name');
            $t->string('normalized_company_name'); $t->string('dedupe_key'); $t->string('employer_type');
            $t->string('source'); $t->string('contact_person')->nullable(); $t->string('contact_number')->nullable();
            foreach (['total_male', 'total_female', 'total_applicants', 'total_hots', 'total_near_hired', 'total_rejected', 'total_vacancies_solicited', 'total_vacancies_offered'] as $c) {
                $t->unsignedInteger($c)->default(0);
            }
            $t->text('remarks')->nullable(); $t->unsignedBigInteger('encoded_by_admin_id')->nullable();
            $t->unsignedBigInteger('submitted_by_employer_id')->nullable(); $t->timestamp('submitted_at')->nullable();
            $t->timestamp('report_generated_at')->nullable(); $t->timestamps();
            $t->unique(['job_fair_id', 'dedupe_key']);
        });

        Schema::create('notifications', function (Blueprint $t) {
            $t->uuid('id')->primary(); $t->string('type'); $t->morphs('notifiable'); $t->text('data');
            $t->timestamp('read_at')->nullable(); $t->timestamps();
        });
    }
}
