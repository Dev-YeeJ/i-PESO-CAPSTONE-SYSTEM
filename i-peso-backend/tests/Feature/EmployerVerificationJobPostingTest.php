<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Employer;
use App\Models\EmployerDocument;
use App\Models\JobVacancy;
use App\Models\Occupation;
use App\Notifications\EmployerVerificationProgressUpdated;
use App\Notifications\EmployerVerificationStatusChanged;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
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
            'role' => 'admin',
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
            'role' => 'admin',
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
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
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
                $table->boolean('open_to_pwds')->default(false);
                $table->boolean('open_to_senior_citizens')->default(false);
                $table->boolean('spes_tupad_eligible')->default(false);
                $table->string('status')->default('active');
                $table->timestamps();
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
