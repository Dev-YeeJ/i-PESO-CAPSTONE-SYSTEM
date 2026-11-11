<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Models\SafetyReport;
use App\Notifications\SafetyActionNotice;
use App\Notifications\SafetyReportUpdateNotification;
use App\Services\Chatbot\PublicChatTools;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesFeedbackTables;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class SafetyReportFlowTest extends TestCase
{
    use CreatesFeedbackTables, CreatesStaffTables, DatabaseTransactions;

    private int $employerId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();
        $this->createHiringTables();
        Schema::table('employers', fn (Blueprint $table) => $table->string('password')->nullable());
        foreach (['employers', 'job_seekers'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->timestamp('email_verified_at')->nullable());
        }

        $this->createLegacyEmployerReportsTable();
        (require database_path('migrations/2026_11_13_000001_create_safety_reports_tables.php'))->up();
        (require database_path('migrations/2026_11_13_000002_add_account_and_vacancy_moderation_columns.php'))->up();

        Storage::fake('local');
        $this->employerId = $this->employer('Urdaneta Rice Mill Corp.');
    }

    // ── Job seeker reports an employer ──────────────────────────────────────

    public function test_a_seeker_reports_an_employer_from_a_vacancy_and_the_context_is_linked(): void
    {
        $seeker = $this->seeker('ana@example.test');
        [$postId, $applicationId] = $this->applyTo($seeker, $this->employerId);
        Sanctum::actingAs($seeker);

        $response = $this->post('/api/seeker/safety-reports', [
            'subject_id' => $this->employerId,
            'post_id' => $postId,
            'category' => 'illegal_fees',
            'description' => 'The HR officer asked me to pay 1,500 pesos for a medical before the interview.',
            'incident_date' => now()->subDays(2)->toDateString(),
            'acknowledge' => '1',
            'attachments' => [UploadedFile::fake()->image('receipt.jpg')],
        ], ['Accept' => 'application/json'])->assertCreated();

        $report = SafetyReport::firstOrFail();
        $this->assertMatchesRegularExpression('/^RPT-\d{4}-\d{5}$/', $report->case_number);
        $this->assertSame($applicationId, $report->application_id, 'The application is connected automatically.');
        $this->assertSame('high', $report->priority, 'Money requests start at high priority.');
        $this->assertSame('submitted', $report->status);
        $this->assertCount(1, $report->attachments);
        Storage::disk('local')->assertExists($report->attachments->first()->stored_path);

        $response->assertJsonPath('report.case_number', $report->case_number)
            ->assertJsonPath('report.attachments.0.name', 'receipt.jpg');

        $this->assertSame(1, DB::table('notifications')->where('type', SafetyReportUpdateNotification::class)->where('notifiable_type', JobSeeker::class)->count());
        $this->assertSame(0, DB::table('notifications')->where('notifiable_type', Employer::class)->count(), 'Filing a report never notifies the reported employer.');
    }

    public function test_a_second_open_report_about_the_same_employer_points_to_the_existing_case(): void
    {
        $seeker = $this->seeker('ana@example.test');
        Sanctum::actingAs($seeker);
        $first = $this->fileAgainstEmployer()->json('report');

        $this->postJson('/api/seeker/safety-reports', $this->employerPayload())
            ->assertStatus(409)
            ->assertJsonPath('existing_report.case_number', $first['case_number']);

        $this->postJson("/api/seeker/safety-reports/{$first['id']}/details", ['details' => 'They called again today asking for the fee.'])
            ->assertOk()
            ->assertJsonPath('report.updates.0.body', 'They called again today asking for the fee.');

        // Once closed, a new incident can be reported.
        SafetyReport::query()->update(['status' => 'dismissed']);
        $this->fileAgainstEmployer()->assertCreated();
    }

    public function test_reporters_are_held_to_a_daily_limit(): void
    {
        config(['safety_reports.daily_limit' => 2]);
        Sanctum::actingAs($this->seeker('busy@example.test'));

        $this->fileAgainstEmployer($this->employer('Company A'))->assertCreated();
        $this->fileAgainstEmployer($this->employer('Company B'))->assertCreated();
        $this->fileAgainstEmployer($this->employer('Company C'))->assertStatus(422)->assertJsonValidationErrors('subject_id');
    }

    public function test_a_report_must_confirm_it_is_truthful_and_describe_what_happened(): void
    {
        Sanctum::actingAs($this->seeker('ana@example.test'));

        $this->postJson('/api/seeker/safety-reports', [...$this->employerPayload(), 'acknowledge' => false, 'description' => 'Scam'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['acknowledge', 'description']);
    }

    public function test_a_seeker_cannot_attach_someone_elses_application(): void
    {
        $other = $this->seeker('other@example.test');
        [, $theirs] = $this->applyTo($other, $this->employerId);
        Sanctum::actingAs($this->seeker('ana@example.test'));

        $this->postJson('/api/seeker/safety-reports', [...$this->employerPayload(), 'application_id' => $theirs])
            ->assertStatus(422)->assertJsonValidationErrors('application_id');
    }

    // ── Employer reports a job seeker ───────────────────────────────────────

    public function test_an_employer_can_only_report_a_seeker_who_applied_to_them(): void
    {
        $seeker = $this->seeker('applicant@example.test');
        [, $ownApplication] = $this->applyTo($seeker, $this->employerId);
        [, $elsewhere] = $this->applyTo($seeker, $this->employer('Another Company'));
        Sanctum::actingAs($this->employerModel());

        $payload = ['category' => 'no_show', 'description' => 'Confirmed the interview twice by text and did not arrive or answer calls.', 'acknowledge' => true];

        $this->postJson('/api/employer/safety-reports', [...$payload, 'application_id' => $elsewhere])
            ->assertStatus(422)->assertJsonValidationErrors('application_id');
        $this->postJson('/api/employer/safety-reports', $payload)
            ->assertStatus(422)->assertJsonValidationErrors('application_id');

        $this->postJson('/api/employer/safety-reports', [...$payload, 'application_id' => $ownApplication])
            ->assertCreated()
            ->assertJsonPath('report.subject_type', 'job_seeker')
            ->assertJsonPath('report.subject_name', 'Test Seeker');

        $report = SafetyReport::firstOrFail();
        $this->assertSame('employer', $report->reporter_type);
        $this->assertSame((int) $seeker->seeker_id, (int) $report->subject_seeker_id);
        $this->assertSame('low', $report->priority);
        $this->assertSame(0, DB::table('notifications')->where('notifiable_type', JobSeeker::class)->count(), 'The reported seeker is not told.');

        // The employer sees their own case; the seeker cannot open it.
        $this->getJson('/api/employer/safety-reports')->assertOk()->assertJsonCount(1, 'data');
        Sanctum::actingAs($seeker);
        $this->getJson("/api/seeker/safety-reports/{$report->id}")->assertNotFound();
    }

    public function test_report_options_differ_by_who_is_reporting(): void
    {
        Sanctum::actingAs($this->seeker('ana@example.test'));
        $seekerCategories = collect($this->getJson('/api/seeker/safety-reports/options')->assertOk()->json('categories'))->pluck('value');
        $this->assertContains('illegal_fees', $seekerCategories);
        $this->assertNotContains('no_show', $seekerCategories);

        Sanctum::actingAs($this->employerModel());
        $employerCategories = collect($this->getJson('/api/employer/safety-reports/options')->assertOk()->json('categories'))->pluck('value');
        $this->assertContains('no_show', $employerCategories);
        $this->assertNotContains('illegal_fees', $employerCategories);
    }

    // ── Confidentiality ─────────────────────────────────────────────────────

    public function test_the_reporter_never_sees_internal_notes_or_actions_and_the_subject_never_sees_the_reporter(): void
    {
        $seeker = JobSeeker::forceCreate(['first_name' => 'Maria', 'last_name' => 'Santos', 'email' => 'maria@example.test', 'password' => 'x']);
        Sanctum::actingAs($seeker);
        $id = $this->fileAgainstEmployer()->json('report.id');

        Sanctum::actingAs($this->staff());
        $this->postJson("/api/admin/safety-reports/{$id}/notes", ['note' => 'Called the employer HR; they deny it.'])->assertOk();
        $this->postJson("/api/admin/safety-reports/{$id}/actions", [
            'action' => 'warning',
            'reason' => 'Two applicants describe the same fee request.',
            'notice' => 'Charging applicants any fee is prohibited. Further reports may lead to suspension.',
        ])->assertOk();

        Sanctum::actingAs($seeker);
        $view = json_encode($this->getJson("/api/seeker/safety-reports/{$id}")->assertOk()->json('report'));
        $this->assertStringNotContainsString('deny it', $view);
        $this->assertStringNotContainsString('Two applicants', $view);
        $this->assertStringNotContainsString('prohibited', $view);

        $notice = DB::table('notifications')->where('type', SafetyActionNotice::class)->first();
        $this->assertSame(Employer::class, $notice->notifiable_type);
        $this->assertStringContainsString('Charging applicants any fee is prohibited', $notice->data);
        $this->assertStringNotContainsString('Maria', $notice->data);
        $this->assertStringNotContainsString('Santos', $notice->data);
    }

    // ── Admin workflow ──────────────────────────────────────────────────────

    public function test_closing_a_case_requires_a_documented_reason_and_keeps_who_closed_it(): void
    {
        Sanctum::actingAs($this->seeker('ana@example.test'));
        $id = $this->fileAgainstEmployer()->json('report.id');
        $first = $this->staff();
        Sanctum::actingAs($first);

        $this->patchJson("/api/admin/safety-reports/{$id}", ['status' => 'under_review'])->assertOk();
        $this->patchJson("/api/admin/safety-reports/{$id}", ['status' => 'dismissed', 'resolution_summary' => 'No proof.'])
            ->assertStatus(422)->assertJsonValidationErrors(['resolution_summary']);
        $this->patchJson("/api/admin/safety-reports/{$id}", ['status' => 'dismissed', 'resolution_summary' => 'No evidence of a fee after interviews with both sides.'])
            ->assertStatus(422)->assertJsonValidationErrors(['dismissal_reason']);
        $this->patchJson("/api/admin/safety-reports/{$id}", [
            'status' => 'dismissed', 'dismissal_reason' => 'insufficient_evidence',
            'resolution_summary' => 'No evidence of a fee after interviews with both sides.',
        ])->assertOk()->assertJsonPath('report.closed_by', 'Staff Member');

        // Another staff member editing priority later does not re-attribute the closure.
        Sanctum::actingAs($this->staff('second@peso.test'));
        $this->patchJson("/api/admin/safety-reports/{$id}", ['priority' => 'low'])->assertOk();
        $this->assertSame($first->admin_id, SafetyReport::find($id)->closed_by_admin_id);

        // Reopening needs an explanation.
        $this->patchJson("/api/admin/safety-reports/{$id}", ['status' => 'under_review'])->assertStatus(422)->assertJsonValidationErrors('note');
        $this->patchJson("/api/admin/safety-reports/{$id}", ['status' => 'under_review', 'note' => 'The applicant brought a receipt to the office.'])
            ->assertOk()->assertJsonPath('report.closed_by', null);

        $events = $this->getJson("/api/admin/safety-reports/{$id}")->json('report.timeline');
        $this->assertGreaterThanOrEqual(5, count($events), 'Every change is in the case history.');

        $updates = DB::table('notifications')->where('type', SafetyReportUpdateNotification::class)->pluck('data')->map(fn ($data) => json_decode($data, true)['title']);
        $this->assertSame(['Report received', 'Your report is being reviewed', 'Your report has been closed'], $updates->values()->all(), 'Reopening into review does not re-notify.');
    }

    public function test_suspending_an_employer_ends_sessions_hides_vacancies_and_blocks_sign_in(): void
    {
        $employer = $this->employerModel();
        $employer->forceFill(['password' => 'secret-pass-1'])->save();
        $employer->createToken('web');
        $active = $this->vacancy($this->employerId, 'active');
        $draft = $this->vacancy($this->employerId, 'draft');

        Sanctum::actingAs($this->seeker('ana@example.test'));
        $id = $this->fileAgainstEmployer()->json('report.id');
        Sanctum::actingAs($this->staff());

        $this->postJson("/api/admin/safety-reports/{$id}/actions", ['action' => 'suspend_account', 'reason' => 'Confirmed fee collection.'])
            ->assertStatus(422)->assertJsonValidationErrors('notice');
        $this->postJson("/api/admin/safety-reports/{$id}/actions", [
            'action' => 'suspend_account',
            'reason' => 'Confirmed fee collection from three applicants.',
            'notice' => 'Your account is suspended for collecting fees from applicants, which PESO prohibits.',
            'ends_at' => now()->addDays(30)->toDateString(),
        ])->assertOk()->assertJsonPath('report.subject.restriction.type', 'suspended');

        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_type', Employer::class)->count());
        $this->assertSame('closed', DB::table('job_vacancies')->where('post_id', $active)->value('status'));
        $this->assertNotNull(DB::table('job_vacancies')->where('post_id', $active)->value('admin_hold_at'));
        $this->assertNull(DB::table('job_vacancies')->where('post_id', $draft)->value('admin_hold_at'), 'Only open vacancies are held.');
        $this->assertSame(1, DB::table('notifications')->where('type', SafetyActionNotice::class)->count());

        $this->postJson('/api/auth/login', ['email' => $employer->email, 'password' => 'secret-pass-1'])
            ->assertForbidden()
            ->assertJsonPath('account_suspended', true);

        $this->postJson("/api/admin/safety-reports/{$id}/actions", [
            'action' => 'lift_restriction', 'reason' => 'Refunds confirmed by PESO.', 'notice' => 'Your account is active again. Thank you for cooperating.',
        ])->assertOk()->assertJsonPath('report.subject.restriction', null);
        $this->assertNull(DB::table('job_vacancies')->where('post_id', $active)->value('admin_hold_at'));
        $this->assertSame('closed', DB::table('job_vacancies')->where('post_id', $active)->value('status'), 'Released vacancies wait for the employer to reopen them.');
    }

    public function test_a_restricted_seeker_cannot_apply_until_the_restriction_ends(): void
    {
        $seeker = $this->seeker('repeat@example.test');
        [, $applicationId] = $this->applyTo($seeker, $this->employerId);
        Sanctum::actingAs($this->employerModel());
        $id = $this->postJson('/api/employer/safety-reports', [
            'application_id' => $applicationId, 'category' => 'application_misuse', 'acknowledge' => true,
            'description' => 'Submitted forty applications in an hour with copied text from other profiles.',
        ])->json('report.id');

        Sanctum::actingAs($this->staff());
        $this->postJson("/api/admin/safety-reports/{$id}/actions", [
            'action' => 'restrict_account', 'reason' => 'Confirmed automated mass applications.',
            'notice' => 'New applications are paused while PESO reviews your account activity.', 'ends_at' => now()->addDays(7)->toDateString(),
        ])->assertOk();

        $vacancy = $this->vacancy($this->employerId, 'active');
        Sanctum::actingAs($seeker->fresh());
        $this->postJson("/api/seeker/jobs/{$vacancy}/apply")->assertForbidden()->assertJsonPath('account_restricted', true);

        $this->travel(8)->days();
        $this->assertFalse($seeker->fresh()->isRestricted(), 'A dated restriction lapses on its own.');
    }

    public function test_a_hidden_vacancy_cannot_be_reopened_by_the_employer_until_restored(): void
    {
        $postId = $this->vacancy($this->employerId, 'active');
        Sanctum::actingAs($this->seeker('ana@example.test'));
        $id = $this->postJson('/api/seeker/safety-reports', [...$this->employerPayload(), 'post_id' => $postId, 'category' => 'fake_vacancy'])->json('report.id');

        Sanctum::actingAs($this->staff());
        $this->postJson("/api/admin/safety-reports/{$id}/actions", [
            'action' => 'hide_vacancy', 'reason' => 'Address on the vacancy is a vacant lot.',
            'notice' => 'Please confirm the work location with PESO before this vacancy is shown again.',
        ])->assertOk();
        $this->assertSame('closed', DB::table('job_vacancies')->where('post_id', $postId)->value('status'));

        Sanctum::actingAs($this->employerModel());
        $this->putJson("/api/employer/vacancies/{$postId}", ['status' => 'active'])->assertStatus(422)->assertJsonPath('vacancy_on_hold', true);
        $listing = $this->getJson('/api/employer/vacancies')->assertOk();
        $this->assertNotNull($listing->json('data.0.admin_hold_at'), 'The employer can see the vacancy is on hold…');
        $this->assertStringNotContainsString('vacant lot', $listing->getContent(), '…but not the internal reason PESO recorded.');

        Sanctum::actingAs($this->staff());
        $this->postJson("/api/admin/safety-reports/{$id}/actions", [
            'action' => 'restore_vacancy', 'reason' => 'Employer confirmed the real address in person.', 'notice' => 'Thank you. You may now reopen the vacancy.',
        ])->assertOk();
        $this->assertNull(DB::table('job_vacancies')->where('post_id', $postId)->value('admin_hold_at'));
    }

    public function test_view_only_staff_can_read_cases_without_reporter_contact_but_cannot_act(): void
    {
        Sanctum::actingAs($this->seeker('ana@example.test'));
        $id = $this->fileAgainstEmployer()->json('report.id');

        Sanctum::actingAs($this->staff('intern@peso.test', ['constituent_crm' => 'view']));
        $this->getJson('/api/admin/safety-reports')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/admin/safety-reports/{$id}")
            ->assertOk()
            ->assertJsonPath('report.reporter.email', null)
            ->assertJsonPath('report.reporter.contact_hidden', true)
            ->assertJsonPath('report.can_manage', false);
        $this->patchJson("/api/admin/safety-reports/{$id}", ['status' => 'under_review'])->assertForbidden();
        $this->postJson("/api/admin/safety-reports/{$id}/actions", ['action' => 'no_action', 'reason' => 'Trying as intern.'])->assertForbidden();

        Sanctum::actingAs($this->staff('aide@peso.test'));
        $this->getJson("/api/admin/safety-reports/{$id}")->assertJsonPath('report.reporter.email', 'ana@example.test');

        Sanctum::actingAs($this->staff('hub@peso.test', ['employment_hub' => 'manage']));
        $this->getJson('/api/admin/safety-reports')->assertForbidden();
    }

    public function test_the_admin_list_filters_by_direction_status_and_priority(): void
    {
        Sanctum::actingAs($this->seeker('ana@example.test'));
        $this->fileAgainstEmployer(null, 'scam_fraud')->assertCreated();
        $applicant = $this->seeker('applicant@example.test');
        [, $applicationId] = $this->applyTo($applicant, $this->employerId);
        Sanctum::actingAs($this->employerModel());
        $this->postJson('/api/employer/safety-reports', [
            'application_id' => $applicationId, 'category' => 'no_show', 'acknowledge' => true,
            'description' => 'Did not attend the confirmed interview on Monday and did not reply.',
        ])->assertCreated();

        Sanctum::actingAs($this->staff());
        $this->getJson('/api/admin/safety-reports/summary')
            ->assertJsonPath('open', 2)->assertJsonPath('open_about_employers', 1)->assertJsonPath('open_about_seekers', 1)->assertJsonPath('open_high_priority', 1);

        $this->assertSame(['employer'], collect($this->getJson('/api/admin/safety-reports?reporter_type=employer')->json('data'))->pluck('reporter_type')->all());
        $this->assertSame(['job_seeker'], collect($this->getJson('/api/admin/safety-reports?subject_type=job_seeker')->json('data'))->pluck('subject_type')->all());
        $this->assertSame(['high', 'low'], collect($this->getJson('/api/admin/safety-reports?sort=priority&status=open')->json('data'))->pluck('priority')->all());
        $this->assertCount(2, $this->getJson('/api/admin/safety-reports?search=Urdaneta')->json('data'), 'The company is reporter in one case and reported in the other.');
        $this->assertCount(1, $this->getJson('/api/admin/safety-reports?search=applicant@example')->json('data'));
        $caseNumber = SafetyReport::query()->where('reporter_type', 'employer')->value('case_number');
        $this->assertSame([$caseNumber], collect($this->getJson('/api/admin/safety-reports?search='.$caseNumber)->json('data'))->pluck('case_number')->all());
        $this->assertCount(1, $this->getJson("/api/admin/safety-reports/subjects/employer/{$this->employerId}")->assertOk()->json('reports'));
    }

    // ── Compatibility and fixes ─────────────────────────────────────────────

    public function test_the_original_mobile_endpoint_still_files_a_case(): void
    {
        Sanctum::actingAs($this->seeker('mobile@example.test'));

        $this->postJson("/api/seeker/employers/{$this->employerId}/report", ['reason' => 'fake_job', 'description' => 'This job does not exist.'])
            ->assertCreated()
            ->assertJsonPath('report.status', 'submitted');

        $this->assertSame('fake_vacancy', SafetyReport::firstOrFail()->category);
    }

    public function test_existing_employer_reports_are_carried_over(): void
    {
        DB::table('employer_reports')->insert([
            'id' => 900, 'employer_id' => $this->employerId, 'seeker_id' => 77, 'reason' => 'misleading',
            'description' => 'Salary was lower than posted.', 'status' => 'resolved',
            'admin_notes' => 'Warned the employer by phone.', 'resolved_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $migration = require database_path('migrations/2026_11_13_000001_create_safety_reports_tables.php');
        $migration->up();
        $migration->up(); // Re-running never copies a row twice.

        $this->assertSame(1, SafetyReport::query()->where('legacy_employer_report_id', 900)->count());
        $report = SafetyReport::query()->where('legacy_employer_report_id', 900)->firstOrFail();

        $this->assertSame('resolved', $report->status);
        $this->assertSame('misleading_terms', $report->category);
        $this->assertSame('Warned the employer by phone.', $report->resolution_summary);
        $this->assertNotNull($report->case_number);
    }

    public function test_the_employer_chatbot_no_longer_reveals_complaints_about_them(): void
    {
        Sanctum::actingAs($this->seeker('ana@example.test'));
        $this->fileAgainstEmployer()->assertCreated();
        Schema::table('placement_report_uploads', function (Blueprint $table) {
            $table->boolean('is_nil_report')->default(false);
            $table->unsignedTinyInteger('coverage_month')->nullable();
            $table->unsignedSmallInteger('coverage_year')->nullable();
        });
        DB::table('placement_report_uploads')->insert([
            'employer_id' => $this->employerId, 'status' => 'pending_review', 'coverage_month' => 10, 'coverage_year' => 2026,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $workspace = app(PublicChatTools::class)->execute('get_my_employer_workspace', [], $this->employerModel());

        $this->assertSame([['period' => 'October 2026', 'status' => 'pending review', 'no_hires_declared' => false]], $workspace['placement_reports']);
        $this->assertStringNotContainsString('submitted', json_encode($workspace));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function employerModel(): Employer
    {
        return Employer::find($this->employerId);
    }

    private function employerPayload(?int $employerId = null, string $category = 'illegal_fees'): array
    {
        return [
            'subject_id' => $employerId ?? $this->employerId,
            'category' => $category,
            'description' => 'They asked me to pay a processing fee before they would schedule my interview.',
            'acknowledge' => true,
        ];
    }

    private function fileAgainstEmployer(?int $employerId = null, string $category = 'illegal_fees')
    {
        return $this->postJson('/api/seeker/safety-reports', $this->employerPayload($employerId, $category));
    }

    private function vacancy(int $employerId, string $status): int
    {
        return DB::table('job_vacancies')->insertGetId([
            'employer_id' => $employerId, 'job_title' => 'Machine Operator', 'status' => $status,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    /** @return array{0: int, 1: int} post id, application id */
    private function applyTo(JobSeeker $seeker, int $employerId): array
    {
        $postId = $this->vacancy($employerId, 'active');
        $applicationId = DB::table('applications')->insertGetId([
            'post_id' => $postId, 'seeker_id' => $seeker->seeker_id, 'status' => 'interview',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return [$postId, $applicationId];
    }

    private function staff(string $email = 'aide@peso.test', array $permissions = ['constituent_crm' => 'manage']): Administrator
    {
        if ($existing = Administrator::query()->where('email', $email)->first()) {
            return $existing;
        }

        $role = AdminRole::create(['name' => 'Role '.$email, 'slug' => 'role-'.md5($email), 'permissions' => $permissions, 'is_system' => false]);

        return Administrator::forceCreate([
            'first_name' => 'Staff', 'last_name' => 'Member', 'email' => $email, 'password' => 'password123',
            'role' => $role->slug, 'admin_role_id' => $role->id, 'position' => 'administrative_aide',
            'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function createLegacyEmployerReportsTable(): void
    {
        Schema::dropIfExists('employer_reports');
        Schema::create('employer_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employer_id');
            $table->unsignedBigInteger('seeker_id');
            $table->string('reason');
            $table->text('description');
            $table->string('status')->default('pending');
            $table->text('admin_notes')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }
}
