<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Application;
use App\Models\Employer;
use App\Models\EmployerDocument;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\Occupation;
use App\Notifications\EmployerVerificationProgressUpdated;
use App\Notifications\EmployerVerificationStatusChanged;
use App\Notifications\InterviewScheduledNotification;
use App\Services\EnhancedJobMatchingService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class EmployerVerificationJobPostingTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
    }

    public function test_employer_cannot_use_admin_approval_endpoint(): void
    {
        $employer = $this->createEmployer();
        Sanctum::actingAs($employer);

        $this->postJson("/api/admin/employers/{$employer->employer_id}/approve")
            ->assertForbidden()
            ->assertJsonPath('message', 'Administrator account required.');
    }

    public function test_pending_employer_cannot_create_job_vacancy(): void
    {
        $employer = $this->createEmployer();
        Sanctum::actingAs($employer);

        $this->postJson('/api/employer/vacancies', $this->vacancyPayload())
            ->assertForbidden()
            ->assertJsonPath('verification_status', 'pending');

        $this->assertDatabaseCount('job_vacancies', 0);
    }

    public function test_employer_can_submit_registration_and_queue_submission_notification(): void
    {
        Notification::fake();
        Storage::fake('public');
        Storage::fake('local');
        $employer = $this->createEmployer();
        $this->uploadRequiredDocuments($employer, 'pending');

        Sanctum::actingAs($employer);
        $this->post('/api/employer/register/step-4', [
            'representative_first_name' => 'Jamie',
            'representative_middle_name' => 'P',
            'representative_last_name' => 'Santos',
            'representative_designation' => 'Owner',
            'representative_contact_number' => '09123456789',
            'representative_is_owner' => true,
            'government_id' => UploadedFile::fake()->createWithContent(
                'government-id.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            ),
        ])
            ->assertOk()
            ->assertJsonPath('verification_status', 'pending');

        Notification::assertSentTo(
            $employer,
            EmployerVerificationProgressUpdated::class,
            fn ($notification) => $notification->event === 'registration_submitted'
        );

        $this->assertDatabaseHas('employer_documents', [
            'employer_id' => $employer->employer_id,
            'document_type' => 'government_id',
            'verification_status' => 'pending',
        ]);
    }

    public function test_admin_cannot_approve_employer_until_required_documents_are_approved(): void
    {
        Notification::fake();
        $employer = $this->createEmployer();
        $this->uploadRequiredDocuments($employer, 'pending');
        $admin = $this->createAdmin('document-review-admin@example.com');

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/employers/{$employer->employer_id}/approve")
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Review and approve every required document before approving the employer.');

        Notification::assertNothingSent();
        $this->assertDatabaseHas('employers', [
            'employer_id' => $employer->employer_id,
            'verification_status' => 'pending',
        ]);
    }

    public function test_admin_approval_unlocks_job_posting(): void
    {
        Notification::fake();
        $employer = $this->createEmployer();
        $this->uploadRequiredDocuments($employer);
        $admin = $this->createAdmin('admin@example.com');

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/employers/{$employer->employer_id}/approve")
            ->assertOk()
            ->assertJsonPath('verification_status', 'verified');

        $this->assertDatabaseHas('employers', [
            'employer_id' => $employer->employer_id,
            'verification_status' => 'verified',
            'verified_by_admin_id' => $admin->admin_id,
        ]);
        Notification::assertSentTo($employer, EmployerVerificationStatusChanged::class, function ($notification) {
            return $notification->status === 'verified';
        });

        Sanctum::actingAs($employer->fresh());
        $this->postJson('/api/employer/vacancies', $this->vacancyPayload())
            ->assertCreated()
            ->assertJsonPath('vacancy.job_title', 'Software Developer');

        $this->assertDatabaseHas('job_vacancies', [
            'employer_id' => $employer->employer_id,
            'job_title' => 'Software Developer',
            'province' => 'Pangasinan',
            'city_municipality' => 'Urdaneta City',
            'minimum_education' => 'College Graduate',
            'salary_type' => 'Monthly',
            'preferred_gender' => 'Any',
            'minimum_age' => 21,
            'maximum_age' => 55,
            'status' => 'active',
        ]);
    }

    public function test_expired_active_vacancy_is_closed_when_employer_lists_vacancies(): void
    {
        $employer = $this->createEmployer();
        $employer->update(['verification_status' => 'verified']);

        JobVacancy::create([
            'employer_id' => $employer->employer_id,
            'location' => 'Poblacion, Urdaneta City, Pangasinan',
            ...$this->vacancyPayload(),
            'application_deadline' => now()->subDay()->toDateString(),
        ]);

        Sanctum::actingAs($employer->fresh());
        $this->getJson('/api/employer/vacancies')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'closed');

        $this->assertDatabaseHas('job_vacancies', [
            'employer_id' => $employer->employer_id,
            'status' => 'closed',
        ]);
    }

    public function test_within_radius_scope_returns_nearby_vacancies_with_distance(): void
    {
        $employer = $this->createEmployer();
        $payload = [
            'employer_id' => $employer->employer_id,
            'location' => 'Urdaneta City, Pangasinan',
            ...$this->vacancyPayload(),
        ];

        $nearest = JobVacancy::create([
            ...$payload,
            'job_title' => 'Nearby Developer',
            'latitude' => 15.9761,
            'longitude' => 120.5711,
        ]);
        JobVacancy::create([
            ...$payload,
            'job_title' => 'Nearby Support Specialist',
            'latitude' => 15.9810,
            'longitude' => 120.5790,
        ]);
        JobVacancy::create([
            ...$payload,
            'job_title' => 'Far-away Developer',
            'latitude' => 16.4023,
            'longitude' => 120.5960,
        ]);
        JobVacancy::create([
            ...$payload,
            'job_title' => 'Unmapped Developer',
            'latitude' => null,
            'longitude' => null,
        ]);

        $nearby = JobVacancy::query()
            ->withinRadius(15.9761, 120.5711, 5)
            ->get();

        $this->assertCount(2, $nearby);
        $this->assertSame($nearest->post_id, $nearby->first()->post_id);
        $this->assertEqualsWithDelta(0, (float) $nearby->first()->distance_km, 0.01);
        $this->assertLessThan(2, (float) $nearby->last()->distance_km);
        $this->assertNotContains('Far-away Developer', $nearby->pluck('job_title'));
        $this->assertNotContains('Unmapped Developer', $nearby->pluck('job_title'));
    }

    public function test_seeker_can_get_active_nearby_jobs_ordered_by_distance(): void
    {
        $employer = $this->createEmployer();
        $seeker = $this->createSeeker([
            'latitude' => 15.9761,
            'longitude' => 120.5711,
        ]);
        $payload = [
            'employer_id' => $employer->employer_id,
            'location' => 'Urdaneta City, Pangasinan',
            ...$this->vacancyPayload(),
        ];

        JobVacancy::create([
            ...$payload,
            'job_title' => 'Closest Job',
            'latitude' => 15.9761,
            'longitude' => 120.5711,
        ]);
        JobVacancy::create([
            ...$payload,
            'job_title' => 'Second Job',
            'latitude' => 15.9810,
            'longitude' => 120.5790,
        ]);
        JobVacancy::create([
            ...$payload,
            'job_title' => 'Expired Job',
            'latitude' => 15.9770,
            'longitude' => 120.5720,
            'application_deadline' => now()->subDay()->toDateString(),
        ]);
        JobVacancy::create([
            ...$payload,
            'job_title' => 'Closed Job',
            'latitude' => 15.9770,
            'longitude' => 120.5720,
            'status' => 'closed',
        ]);

        Sanctum::actingAs($seeker);

        $this->getJson('/api/seeker/nearby-jobs?radius_km=5')
            ->assertOk()
            ->assertJsonPath('radius_km', 5)
            ->assertJsonPath('count', 2)
            ->assertJsonPath('jobs.0.job_title', 'Closest Job')
            ->assertJsonPath('jobs.0.employer.company_name', 'Test Employer')
            ->assertJsonPath('jobs.0.distance_km', 0)
            ->assertJsonPath('jobs.1.job_title', 'Second Job')
            ->assertJsonMissing(['job_title' => 'Expired Job'])
            ->assertJsonMissing(['job_title' => 'Closed Job']);
    }

    public function test_nearby_jobs_applies_minimum_match_and_returns_map_contract_fields(): void
    {
        $employer = $this->createEmployer();
        $seeker = $this->createSeeker([
            'latitude' => 15.9761,
            'longitude' => 120.5711,
        ]);
        $payload = [
            'employer_id' => $employer->employer_id,
            'location' => 'Urdaneta City, Pangasinan',
            ...$this->vacancyPayload(),
        ];

        JobVacancy::create([...$payload, 'job_title' => 'High Match Job', 'latitude' => 15.9770, 'longitude' => 120.5720]);
        JobVacancy::create([...$payload, 'job_title' => 'Low Match Job', 'latitude' => 15.9780, 'longitude' => 120.5730]);

        $this->mock(EnhancedJobMatchingService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('calculateMatch')->twice()->andReturnUsing(function (JobVacancy $job): array {
                $percentage = $job->job_title === 'High Match Job' ? 85 : 20;

                return [
                    'percentage' => $percentage,
                    'eligible' => true,
                    'missing_critical_skills' => [],
                    'factors' => ['skills' => ['details' => []]],
                ];
            });
        });

        Sanctum::actingAs($seeker);

        $this->getJson('/api/seeker/job-map?radius_km=5&min_match=70&hide_low_match=false&hide_applied=false&coordinates_only=false')
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('summary.total_found', 1)
            ->assertJsonPath('summary.high_match_count', 1)
            ->assertJsonPath('seeker.id', $seeker->seeker_id)
            ->assertJsonPath('filters_applied.min_match', 70)
            ->assertJsonPath('jobs.0.job_title', 'High Match Job')
            ->assertJsonPath('jobs.0.match_percentage', 85)
            ->assertJsonPath('jobs.0.employer_name', 'Test Employer')
            ->assertJsonPath('jobs.0.vacancy_id', fn ($id) => is_int($id))
            ->assertJsonPath('jobs.0.job_fair.is_available_at_job_fair', false)
            ->assertJsonPath('jobs.0.upskill.recommended', false)
            ->assertJsonPath('jobs.0.actions.can_save', true)
            ->assertJsonMissing(['job_title' => 'Low Match Job']);
    }

    public function test_job_map_defers_detailed_matching_until_a_vacancy_is_selected(): void
    {
        $employer = $this->createEmployer();
        $seeker = $this->createSeeker(['latitude' => 15.9761, 'longitude' => 120.5711]);
        $job = JobVacancy::create([
            ...$this->vacancyPayload(),
            'employer_id' => $employer->employer_id,
            'job_title' => 'Deferred Match Vacancy',
            'location' => 'Urdaneta City, Pangasinan',
            'latitude' => 15.9770,
            'longitude' => 120.5720,
        ]);

        $this->mock(EnhancedJobMatchingService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('calculateMatch')->once()->andReturn([
                'percentage' => 82,
                'eligible' => true,
                'missing_critical_skills' => [],
                'factors' => ['skills' => ['score' => 80, 'details' => []]],
            ]);
        });

        Sanctum::actingAs($seeker);

        $this->getJson('/api/seeker/job-map?radius_km=5&limit=30&compact=true')
            ->assertOk()
            ->assertJsonPath('jobs.0.post_id', $job->post_id)
            ->assertJsonPath('jobs.0.match_percentage', null)
            ->assertJsonPath('jobs.0.match_deferred', true)
            ->assertJsonPath('jobs.0.job_description', $job->job_description);

        $this->getJson("/api/seeker/job-map/{$job->post_id}")
            ->assertOk()
            ->assertJsonPath('job.post_id', $job->post_id)
            ->assertJsonPath('job.match_percentage', 82)
            ->assertJsonPath('job.job_title', 'Deferred Match Vacancy');
    }

    public function test_nearby_jobs_requires_a_saved_seeker_location(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->getJson('/api/seeker/nearby-jobs')
            ->assertUnprocessable()
            ->assertJsonPath('code', 'location_required');
    }

    public function test_latest_dashboard_feed_works_without_a_saved_seeker_location(): void
    {
        $employer = $this->createEmployer();
        $seeker = $this->createSeeker();
        JobVacancy::create([
            ...$this->vacancyPayload(),
            'employer_id' => $employer->employer_id,
            'job_title' => 'Latest Active Vacancy',
            'location' => 'Urdaneta City, Pangasinan',
            'latitude' => 15.9761,
            'longitude' => 120.5711,
        ]);

        $this->mock(EnhancedJobMatchingService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('calculateMatch')->once()->andReturn([
                'percentage' => 60,
                'eligible' => true,
                'missing_critical_skills' => [],
                'factors' => ['skills' => ['details' => []]],
            ]);
        });

        Sanctum::actingAs($seeker);

        $this->getJson('/api/seeker/nearby-jobs?feed_mode=latest&sort=newest&limit=10')
            ->assertOk()
            ->assertJsonPath('feed_mode', 'latest')
            ->assertJsonPath('location_available', false)
            ->assertJsonPath('jobs.0.job_title', 'Latest Active Vacancy');
    }

    public function test_hired_application_is_excluded_from_the_seeker_dashboard_feed(): void
    {
        $employer = $this->createEmployer();
        $seeker = $this->createSeeker(['latitude' => 15.9761, 'longitude' => 120.5711]);
        $payload = [
            'employer_id' => $employer->employer_id,
            'location' => 'Urdaneta City, Pangasinan',
            ...$this->vacancyPayload(),
        ];

        $hiredJob = JobVacancy::create([...$payload, 'job_title' => 'Already Hired Job', 'latitude' => 15.9761, 'longitude' => 120.5711]);
        JobVacancy::create([...$payload, 'job_title' => 'Still Open Job', 'latitude' => 15.9770, 'longitude' => 120.5720]);

        DB::table('applications')->insert([
            'post_id' => $hiredJob->post_id, 'seeker_id' => $seeker->seeker_id, 'status' => 'hired',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        Sanctum::actingAs($seeker);

        $this->getJson('/api/seeker/nearby-jobs?radius_km=5')
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('jobs.0.job_title', 'Still Open Job')
            ->assertJsonMissing(['job_title' => 'Already Hired Job']);
    }

    public function test_scheduling_an_online_interview_generates_a_jitsi_link_without_google(): void
    {
        Notification::fake();
        $employer = $this->createEmployer();
        $employer->update(['verification_status' => 'verified']);
        $seeker = $this->createSeeker();
        $vacancy = JobVacancy::create([
            ...$this->vacancyPayload(),
            'employer_id' => $employer->employer_id,
            'location' => 'Urdaneta City, Pangasinan',
        ]);
        $application = Application::create([
            'post_id' => $vacancy->post_id,
            'seeker_id' => $seeker->seeker_id,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($employer->fresh());

        $this->patchJson("/api/employer/applications/{$application->apply_id}/status", [
            'status' => 'interview',
            'interview' => [
                'mode_of_interview' => 'online',
                'schedule' => now()->addDay()->format('Y-m-d H:i:s'),
                'auto_meet_link' => true,
            ],
        ])->assertOk();

        $link = DB::table('interview_schedules')->where('apply_id', $application->apply_id)->value('venue_or_link');

        $this->assertNotNull($link, 'Expected a Jitsi link to be generated without any Google connection.');
        $this->assertStringStartsWith('https://meet.jit.si/iPESO-', $link);

        Notification::assertSentTo($seeker, InterviewScheduledNotification::class);
        Notification::assertSentTo($employer->fresh(), InterviewScheduledNotification::class);
    }

    public function test_employer_cannot_access_seeker_nearby_jobs(): void
    {
        Sanctum::actingAs($this->createEmployer());

        $this->getJson('/api/seeker/nearby-jobs')
            ->assertForbidden();
    }

    public function test_rejection_email_contains_the_admin_reason(): void
    {
        Notification::fake();
        $employer = $this->createEmployer();
        $admin = $this->createAdmin('rejection-admin@example.com');
        $reason = 'The submitted business permit is expired and must be renewed.';

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/employers/{$employer->employer_id}/reject", [
            'rejection_reason' => $reason,
        ])
            ->assertOk()
            ->assertJsonPath('verification_status', 'rejected')
            ->assertJsonPath('notification_queued', true);

        Notification::assertSentTo($employer, EmployerVerificationStatusChanged::class, function ($notification) use ($reason) {
            return $notification->status === 'rejected'
                && $notification->remarks === $reason;
        });
    }

    public function test_rejected_document_marks_employer_for_resubmission(): void
    {
        Notification::fake();
        $employer = $this->createEmployer();
        $this->uploadRequiredDocuments($employer, 'pending');
        $document = $employer->documents()->where('document_type', 'mayors_permit')->firstOrFail();
        $admin = $this->createAdmin('resubmission-admin@example.com');
        $notes = 'The permit has expired. Upload the renewed permit with a visible validity date.';

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/documents/{$document->document_id}/review", [
            'verification_status' => 'rejected',
            'admin_notes' => $notes,
        ])
            ->assertOk();

        $employer->refresh();
        $this->assertSame('rejected', $employer->verification_status);
        $this->assertStringContainsString('expired', $employer->rejection_reason);

        Sanctum::actingAs($employer);
        $this->getJson('/api/employer/profile')
            ->assertOk()
            ->assertJsonPath('employer.verification_status', 'rejected')
            ->assertJsonPath('employer.rejection_reason', $employer->rejection_reason);
    }

    public function test_rejected_document_notifies_employer_with_admin_notes(): void
    {
        Notification::fake();
        $employer = $this->createEmployer();
        $this->uploadRequiredDocuments($employer, 'pending');
        $document = $employer->documents()->where('document_type', 'mayors_permit')->firstOrFail();
        $admin = $this->createAdmin('document-rejection-admin@example.com');
        $notes = 'The permit has expired. Upload the renewed permit with a visible validity date.';

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/documents/{$document->document_id}/review", [
            'verification_status' => 'rejected',
            'admin_notes' => $notes,
        ])
            ->assertOk()
            ->assertJsonPath('notification_queued', true);

        Notification::assertSentTo(
            $employer,
            EmployerVerificationProgressUpdated::class,
            function ($notification, $channels) use ($notes) {
                return $notification->event === 'document_rejected'
                    && $notification->documentType === 'mayors_permit'
                    && $notification->remarks === $notes
                    && $channels === ['database', 'mail'];
            }
        );
    }

    public function test_document_approval_uses_in_app_only_until_all_requirements_are_approved(): void
    {
        Notification::fake();
        $employer = $this->createEmployer();
        $this->uploadRequiredDocuments($employer, 'pending');
        $documents = $employer->documents()->orderBy('document_id')->get();
        $admin = $this->createAdmin('document-approval-admin@example.com');

        Sanctum::actingAs($admin);

        foreach ($documents as $index => $document) {
            $this->postJson("/api/admin/documents/{$document->document_id}/review", [
                'verification_status' => 'approved',
            ])->assertOk();

            $expectedEvent = $index === $documents->count() - 1
                ? 'all_required_documents_approved'
                : 'document_approved';

            Notification::assertSentTo(
                $employer,
                EmployerVerificationProgressUpdated::class,
                function ($notification, $channels) use ($expectedEvent) {
                    $expectedChannels = $expectedEvent === 'all_required_documents_approved'
                        ? ['database', 'mail']
                        : ['database'];

                    return $notification->event === $expectedEvent
                        && $channels === $expectedChannels;
                }
            );
        }
    }

    public function test_employer_can_list_and_read_only_their_notifications(): void
    {
        $employer = $this->createEmployer();
        $otherEmployer = $this->createEmployer();
        $notificationId = (string) Str::uuid();
        $otherNotificationId = (string) Str::uuid();

        foreach ([
            [$notificationId, $employer->employer_id],
            [$otherNotificationId, $otherEmployer->employer_id],
        ] as [$id, $employerId]) {
            DB::table('notifications')->insert([
                'id' => $id,
                'type' => EmployerVerificationStatusChanged::class,
                'notifiable_type' => Employer::class,
                'notifiable_id' => $employerId,
                'data' => json_encode([
                    'title' => 'Employer account verified',
                    'message' => 'Your employer account has been verified.',
                    'status' => 'verified',
                    'action_url' => '/employer/dashboard',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Sanctum::actingAs($employer);

        $this->getJson('/api/employer/notifications')
            ->assertOk()
            ->assertJsonCount(1, 'notifications')
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.0.id', $notificationId);

        $this->patchJson("/api/employer/notifications/{$otherNotificationId}/read")
            ->assertNotFound();

        $this->patchJson("/api/employer/notifications/{$notificationId}/read")
            ->assertOk();

        $this->assertDatabaseMissing('notifications', [
            'id' => $notificationId,
            'read_at' => null,
        ]);
    }

    public function test_only_admin_can_view_uploaded_employer_document(): void
    {
        Storage::fake('public');
        $employer = $this->createEmployer();
        $document = EmployerDocument::create([
            'employer_id' => $employer->employer_id,
            'document_type' => 'mayors_permit',
            'document_path' => 'employer_documents/mayors-permit.pdf',
            'original_filename' => 'mayors-permit.pdf',
            'file_size' => 13,
            'mime_type' => 'application/pdf',
            'uploaded_at' => now(),
        ]);
        Storage::disk('public')->put($document->document_path, 'mock pdf data');

        Sanctum::actingAs($employer);
        $this->get("/api/admin/documents/{$document->document_id}/view")
            ->assertForbidden();

        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Reviewer',
            'email' => 'reviewer@example.com',
            'password' => 'password123',
            'role' => 'administrator',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($admin);
        $this->get("/api/admin/documents/{$document->document_id}/view")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('cache-control', 'must-revalidate, no-cache, no-store, private');

        $this->assertDatabaseHas('activity_logs', [
            'user_type' => Administrator::class,
            'user_id' => $admin->admin_id,
            'action' => 'viewed_employer_document',
            'description' => "Viewed employer document #{$document->document_id} (mayors_permit) for employer #{$employer->employer_id}.",
        ]);
    }

    public function test_admin_download_requires_reason_and_creates_audit_log(): void
    {
        Storage::fake('public');
        $employer = $this->createEmployer();
        $document = EmployerDocument::create([
            'employer_id' => $employer->employer_id,
            'document_type' => 'bir_certificate',
            'document_path' => 'employer_documents/bir-certificate.pdf',
            'original_filename' => 'bir-certificate.pdf',
            'file_size' => 13,
            'mime_type' => 'application/pdf',
            'uploaded_at' => now(),
        ]);
        Storage::disk('public')->put($document->document_path, 'mock pdf data');

        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Downloader',
            'email' => 'downloader@example.com',
            'password' => 'password123',
            'role' => 'administrator',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/documents/{$document->document_id}/download")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');

        $reason = 'Required for official employer accreditation review.';
        $this->post("/api/admin/documents/{$document->document_id}/download", [
            'reason' => $reason,
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'user_type' => Administrator::class,
            'user_id' => $admin->admin_id,
            'action' => 'downloaded_employer_document',
            'ip_address' => '127.0.0.1',
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'action' => 'downloaded_employer_document',
            'description' => "Downloaded employer document #{$document->document_id} (bir_certificate) for employer #{$employer->employer_id}. Reason: {$reason}",
        ]);
    }

    private function createEmployer(): Employer
    {
        return Employer::create([
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'company_type' => 'sole_proprietorship',
            'company_name' => 'Test Employer',
            'verification_status' => 'pending',
            'email_verified_at' => now(),
        ]);
    }

    private function createAdmin(string $email): Administrator
    {
        return Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => $email,
            'password' => 'password123',
            'role' => 'administrator',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function createSeeker(array $attributes = []): JobSeeker
    {
        return JobSeeker::create([
            'first_name' => 'Juan',
            'last_name' => fake()->unique()->lastName(),
            'mobile_number' => '09123456789',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            ...$attributes,
        ]);
    }

    private function uploadRequiredDocuments(Employer $employer, string $status = 'approved'): void
    {
        foreach ($employer->getRequiredDocuments() as $documentType) {
            EmployerDocument::create([
                'employer_id' => $employer->employer_id,
                'document_type' => $documentType,
                'document_path' => "employer_documents/{$documentType}.pdf",
                'original_filename' => "{$documentType}.pdf",
                'file_size' => 1024,
                'mime_type' => 'application/pdf',
                'uploaded_at' => now(),
                'verification_status' => $status,
            ]);
        }
    }

    private function vacancyPayload(): array
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

        return [
            'occupation_id' => $occupation->id,
            'job_title' => $occupation->title,
            'employment_type' => 'Permanent/Regular',
            'work_setup' => 'Hybrid',
            'region' => 'Region I - Ilocos Region',
            'province' => 'Pangasinan',
            'city_municipality' => 'Urdaneta City',
            'barangay' => 'Poblacion',
            'specific_address' => 'PESO Employment Center',
            'job_description' => 'Build and maintain employment services.',
            'vacancies_count' => 2,
            'minimum_education' => 'College Graduate',
            'target_courses' => ['BS Information Technology', 'BS Computer Science'],
            'experience_level' => '1-3 Years',
            'salary_min' => 20000,
            'salary_max' => 30000,
            'salary_type' => 'Monthly',
            'hide_salary' => false,
            'benefits' => ['HMO', '13th Month Pay'],
            'required_skills' => ['PHP', 'Laravel'],
            'soft_skills' => ['Communication'],
            'required_certifications' => [],
            'application_deadline' => now()->addMonth()->toDateString(),
            'preferred_gender' => 'Any',
            'minimum_age' => 21,
            'maximum_age' => 55,
            'open_to_pwds' => true,
            'open_to_senior_citizens' => false,
            'spes_tupad_eligible' => false,
            'status' => 'active',
        ];
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

        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('mobile_number');
                $table->string('email')->unique();
                $table->string('password');
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
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
                $table->string('representative_name')->nullable();
                $table->string('representative_first_name')->nullable();
                $table->string('representative_middle_name')->nullable();
                $table->string('representative_last_name')->nullable();
                $table->string('representative_designation')->nullable();
                $table->string('representative_contact_number')->nullable();
                $table->string('mobile_number')->nullable();
                $table->boolean('representative_is_owner')->default(false);
                $table->string('verification_status')->default('pending');
                $table->timestamp('verified_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->unsignedBigInteger('verified_by_admin_id')->nullable();
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('employer_documents')) {
            Schema::create('employer_documents', function (Blueprint $table) {
                $table->id('document_id');
                $table->unsignedBigInteger('employer_id');
                $table->string('document_type');
                $table->string('document_path');
                $table->string('original_filename');
                $table->integer('file_size');
                $table->string('mime_type');
                $table->timestamp('uploaded_at');
                $table->string('verification_status')->default('pending');
                $table->text('admin_notes')->nullable();
                $table->timestamp('viewed_at')->nullable();
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
                $table->string('location');
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
                $table->decimal('salary_min', 10, 2)->nullable();
                $table->decimal('salary_max', 10, 2)->nullable();
                $table->string('salary_type')->nullable();
                $table->boolean('hide_salary')->default(false);
                $table->json('benefits')->nullable();
                $table->json('required_skills')->nullable();
                $table->json('soft_skills')->nullable();
                $table->json('required_certifications')->nullable();
                $table->date('application_deadline')->nullable();
                $table->string('preferred_gender')->nullable();
                $table->unsignedTinyInteger('minimum_age')->nullable();
                $table->unsignedTinyInteger('maximum_age')->nullable();
                $table->boolean('open_to_pwds')->default(false);
                $table->boolean('open_to_senior_citizens')->default(false);
                $table->boolean('spes_tupad_eligible')->default(false);
                $table->string('status')->default('active');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('applications')) {
            Schema::create('applications', function (Blueprint $table) {
                $table->id('apply_id');
                $table->unsignedBigInteger('post_id');
                $table->unsignedBigInteger('seeker_id');
                $table->string('status')->default('pending');
                $table->timestamp('status_changed_at')->nullable();
                $table->unsignedBigInteger('status_changed_by')->nullable();
                $table->text('employer_remarks')->nullable();
                $table->string('employer_mismatch_reason_code')->nullable();
                $table->string('seeker_mismatch_reason_code')->nullable();
                $table->text('mismatch_reason_details')->nullable();
                $table->date('placement_start_date')->nullable();
                $table->decimal('placement_salary', 10, 2)->nullable();
                $table->string('placement_employment_type')->nullable();
                $table->timestamp('placement_captured_at')->nullable();
                $table->timestamps();
                $table->unique(['post_id', 'seeker_id']);
            });
        }

        if (! Schema::hasTable('seeker_skills')) {
            Schema::create('seeker_skills', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->string('skill_name')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_educations')) {
            Schema::create('seeker_educations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_work_experiences')) {
            Schema::create('seeker_work_experiences', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_occupations')) {
            Schema::create('seeker_occupations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedInteger('preference_order')->default(0);
                $table->timestamps();
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
                $table->timestamp('interview_reminder_24h_sent_at')->nullable();
                $table->timestamp('interview_reminder_1h_sent_at')->nullable();
                $table->timestamp('interview_reminder_15m_sent_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('skill_catalog_entries')) {
            Schema::create('skill_catalog_entries', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('normalized_name');
                $table->text('search_terms')->nullable();
                $table->string('category', 20);
                $table->string('source', 30);
                $table->string('element_id')->nullable();
                $table->unsignedInteger('occupation_count')->default(0);
                $table->boolean('is_hot')->default(false);
                $table->boolean('is_in_demand')->default(false);
                $table->string('version', 20)->nullable();
                $table->timestamps();
                $table->unique(['category', 'normalized_name']);
            });
        }

        if (! Schema::hasTable('skill_aliases')) {
            Schema::create('skill_aliases', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('skill_id');
                $table->string('alias');
                $table->string('normalized_alias');
                $table->string('source')->default('local_reviewed');
                $table->decimal('confidence', 4, 3)->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_vacancy_skills')) {
            Schema::create('job_vacancy_skills', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('post_id');
                $table->unsignedBigInteger('skill_id');
                $table->string('skill_type');
                $table->string('original_name');
                $table->decimal('weight', 5, 2)->default(1);
                $table->timestamps();
                $table->unique(['post_id', 'skill_id', 'skill_type']);
            });
        }

        if (! Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id('log_id');
                $table->string('user_type');
                $table->unsignedBigInteger('user_id');
                $table->string('action', 100);
                $table->text('description')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();
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
    }
}
