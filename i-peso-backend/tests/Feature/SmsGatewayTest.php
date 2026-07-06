<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Application;
use App\Models\Employer;
use App\Models\InterviewSchedule;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Notifications\ApplicationStatusNotification;
use App\Notifications\Channels\SmsChannel;
use App\Notifications\EmployerVerificationStatusChanged;
use App\Notifications\InterviewCancelledNotification;
use App\Notifications\InterviewReminderNotification;
use App\Notifications\InterviewScheduledNotification;
use App\Notifications\InterviewUpdatedNotification;
use App\Services\Sms\PhoneNumberNormalizer;
use App\Services\Sms\SmsMessageTemplates;
use App\Services\Sms\SmsService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SmsGatewayTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        $this->createSchema();
        config([
            'services.sms.driver' => 'log_only',
            'services.sms.provider' => 'unisms',
            'services.sms.log_only' => true,
            'services.sms.base_url' => 'https://unismsapi.com/api',
            'services.sms.secret_key' => null,
            'services.sms.sender_id' => null,
        ]);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('sms_notifications');
        Schema::dropIfExists('administrators');
        parent::tearDown();
    }

    public function test_philippine_numbers_are_normalized_to_e164(): void
    {
        $normalizer = app(PhoneNumberNormalizer::class);

        $this->assertSame('+639171234567', $normalizer->normalize('09171234567'));
        $this->assertSame('+639171234567', $normalizer->normalize('639171234567'));
        $this->assertSame('+639171234567', $normalizer->normalize('+63 917 123 4567'));
        $this->assertNull($normalizer->normalize('12345'));
        $this->assertSame('+639******567', $normalizer->mask('09171234567'));
    }

    public function test_log_only_records_without_sending_real_sms(): void
    {
        $admin = $this->admin();
        $result = app(SmsService::class)->send(
            $admin,
            '09171234567',
            SmsMessageTemplates::employerVerification('verified'),
            'employer_verification',
        );

        $this->assertSame('log_only', $result->status);
        $this->assertDatabaseHas('sms_notifications', [
            'normalized_phone_number' => '+639171234567',
            'purpose' => 'employer_verification',
            'gateway_status' => 'log_only',
            'provider' => 'log_only',
        ]);
        Http::assertNothingSent();
    }

    public function test_missing_and_invalid_phone_numbers_are_skipped_safely(): void
    {
        $admin = $this->admin();
        $service = app(SmsService::class);

        $missing = $service->send($admin, null, 'Safe message', 'application_status');
        $invalid = $service->send($admin, 'not-a-phone', 'Safe message', 'application_status');

        $this->assertSame('skipped', $missing->status);
        $this->assertSame('skipped', $invalid->status);
        $this->assertDatabaseCount('sms_notifications', 2);
        $this->assertSame(2, DB::table('sms_notifications')->where('gateway_status', 'skipped')->count());
        Http::assertNothingSent();
    }

    public function test_unisms_uses_basic_auth_and_records_reference_without_exposing_secret(): void
    {
        config([
            'services.sms.driver' => 'unisms',
            'services.sms.log_only' => false,
            'services.sms.secret_key' => 'test-secret-not-real',
            'services.sms.sender_id' => 'IPESO-TEST',
        ]);
        Http::fake([
            'https://unismsapi.com/api/sms' => Http::response([
                'message' => [
                    'status' => 'sent',
                    'reference_id' => 'msg_test_reference',
                    'recipient' => '+639171234567',
                    'fail_reason' => null,
                ],
            ], 201),
        ]);

        $result = app(SmsService::class)->send($this->admin(), '09171234567', 'i-PESO: Controlled test message.', 'application_status');

        $this->assertSame('sent', $result->status);
        $this->assertSame('msg_test_reference', $result->referenceId);
        $this->assertDatabaseHas('sms_notifications', [
            'gateway_status' => 'sent',
            'provider' => 'unisms',
            'provider_reference_id' => 'msg_test_reference',
        ]);
        Http::assertSent(function ($request) {
            return $request->url() === 'https://unismsapi.com/api/sms'
                && $request->hasHeader('Authorization', 'Basic '.base64_encode('test-secret-not-real:'))
                && $request['recipient'] === '+639171234567'
                && $request['sender_id'] === 'IPESO-TEST'
                && mb_strlen($request['content']) <= 160;
        });
    }

    public function test_unisms_failure_returns_failed_result_without_throwing(): void
    {
        config([
            'services.sms.driver' => 'unisms',
            'services.sms.log_only' => false,
            'services.sms.secret_key' => 'test-secret-not-real',
            'services.sms.sender_id' => 'IPESO-TEST',
        ]);
        Http::fake(['https://unismsapi.com/api/sms' => Http::response([], 500)]);

        $result = app(SmsService::class)->send($this->admin(), '09171234567', 'Safe message', 'application_status');

        $this->assertSame('failed', $result->status);
        $this->assertDatabaseHas('sms_notifications', ['gateway_status' => 'failed']);
    }

    public function test_unisms_without_credentials_falls_back_to_log_only(): void
    {
        config([
            'services.sms.driver' => 'unisms',
            'services.sms.log_only' => false,
            'services.sms.secret_key' => null,
            'services.sms.sender_id' => null,
        ]);

        $result = app(SmsService::class)->send($this->admin(), '09171234567', 'Safe message', 'application_status');

        $this->assertSame('log_only', $result->status);
        $this->assertSame('log_only', $result->provider);
        Http::assertNothingSent();
    }

    public function test_non_unisms_provider_selection_cannot_be_reported_as_live(): void
    {
        config([
            'services.sms.driver' => 'unisms',
            'services.sms.provider' => 'unsupported-provider',
            'services.sms.log_only' => false,
            'services.sms.secret_key' => 'test-secret-not-real',
            'services.sms.sender_id' => 'IPESO-TEST',
        ]);
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/sms-notifications')
            ->assertOk()
            ->assertJsonPath('gateway.effective_mode', 'log_only')
            ->assertJsonPath('gateway.log_only', true);

        Http::assertNothingSent();
    }

    public function test_dynamic_templates_remain_within_one_sms_segment(): void
    {
        $message = SmsMessageTemplates::interviewScheduled(
            str_repeat('Very Long Position Title ', 10),
            str_repeat('Very Long Company Name ', 10),
            now(),
        );

        $this->assertLessThanOrEqual(160, mb_strlen($message));
        $this->assertStringNotContainsString('http', $message);
    }

    public function test_admin_log_endpoint_masks_phone_numbers_and_never_returns_credentials(): void
    {
        $admin = $this->admin();
        app(SmsService::class)->send($admin, '09171234567', 'Safe message', 'application_status');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/sms-notifications')
            ->assertOk()
            ->assertJsonPath('gateway.effective_mode', 'log_only')
            ->assertJsonPath('summary.log_only', 1)
            ->assertJsonPath('operations.queue_command', 'php artisan queue:work')
            ->assertJsonPath('operations.scheduler_command', 'php artisan schedule:run')
            ->assertJsonPath('logs.data.0.phone_number', '+639******567')
            ->assertJsonMissingPath('gateway.secret_key');

        $this->assertStringNotContainsString('+639171234567', $response->getContent());
        $this->assertStringNotContainsString('test-secret', $response->getContent());
    }

    public function test_admin_log_filters_and_pagination_contract_apply_cleanly(): void
    {
        $admin = $this->admin();
        $service = app(SmsService::class);
        $service->send($admin, '09171234567', 'Application update', 'application_status');
        $service->send($admin, 'invalid', 'Verification update', 'employer_verification');
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/sms-notifications?status=skipped&per_page=5&page=1')
            ->assertOk()
            ->assertJsonPath('logs.total', 1)
            ->assertJsonPath('logs.current_page', 1)
            ->assertJsonPath('logs.data.0.status', 'skipped');

        $this->getJson('/api/admin/sms-notifications?purpose=application_status')
            ->assertOk()
            ->assertJsonPath('logs.total', 1)
            ->assertJsonPath('logs.data.0.purpose', 'application_status');
    }

    public function test_existing_notification_flows_add_sms_without_duplicate_interview_status_sms(): void
    {
        $seeker = new JobSeeker(['mobile_number' => '09171234567']);
        $employer = new Employer(['company_name' => 'Safe Employer', 'mobile_number' => '09181234567']);
        $vacancy = new JobVacancy(['job_title' => 'Welder']);
        $vacancy->setRelation('employer', $employer);
        $interview = new InterviewSchedule(['schedule' => now()->addDay()]);
        $application = new Application(['status' => 'hired']);
        $application->setRelation('jobVacancy', $vacancy);
        $application->setRelation('interviewSchedule', $interview);

        $applicationNotification = new ApplicationStatusNotification($application);
        $this->assertContains(SmsChannel::class, $applicationNotification->via($seeker));
        $this->assertSame('application_status', $applicationNotification->toSms($seeker)['purpose']);

        $application->status = 'interview';
        $this->assertNotContains(SmsChannel::class, $applicationNotification->via($seeker));

        $application->status = 'rejected';
        $interview->status = 'cancelled';
        $this->assertNotContains(SmsChannel::class, $applicationNotification->via($seeker));
        $interview->status = 'scheduled';

        $interviewNotification = new InterviewScheduledNotification($application);
        $this->assertContains(SmsChannel::class, $interviewNotification->via($seeker));
        $this->assertNotContains(SmsChannel::class, $interviewNotification->via($employer));
        $this->assertSame('interview_scheduled', $interviewNotification->toSms($seeker)['purpose']);
        $this->assertSame('interview_rescheduled', (new InterviewUpdatedNotification($application))->toSms($seeker)['purpose']);
        $this->assertSame('interview_cancelled', (new InterviewCancelledNotification($application))->toSms($seeker)['purpose']);
        $this->assertSame('interview_reminder', (new InterviewReminderNotification($application, '1h'))->toSms($seeker)['purpose']);

        $verification = new EmployerVerificationStatusChanged('verified');
        $this->assertContains(SmsChannel::class, $verification->via($employer));
        $this->assertSame('employer_verification', $verification->toSms($employer)['purpose']);
    }

    public function test_log_only_channel_records_each_integrated_sms_purpose_without_http_requests(): void
    {
        $seeker = new JobSeeker(['mobile_number' => '09171234567']);
        $seeker->setAttribute('seeker_id', 10);
        $employer = new Employer([
            'company_name' => 'Safe Employer',
            'mobile_number' => '09181234567',
            'representative_contact_number' => '09181234567',
        ]);
        $employer->setAttribute('employer_id', 20);
        $vacancy = new JobVacancy(['job_title' => 'Welder']);
        $vacancy->setRelation('employer', $employer);
        $interview = new InterviewSchedule(['schedule' => now()->addDay(), 'status' => 'scheduled']);
        $application = new Application(['status' => 'hired']);
        $application->setRelation('jobVacancy', $vacancy);
        $application->setRelation('interviewSchedule', $interview);
        $channel = app(SmsChannel::class);

        $channel->send($seeker, new ApplicationStatusNotification($application));
        $channel->send($seeker, new InterviewScheduledNotification($application));
        $channel->send($seeker, new InterviewUpdatedNotification($application));
        $channel->send($seeker, new InterviewCancelledNotification($application));
        $channel->send($seeker, new InterviewReminderNotification($application, '1h'));
        $channel->send($employer, new EmployerVerificationStatusChanged('verified'));

        $this->assertDatabaseCount('sms_notifications', 6);
        foreach ([
            'application_status', 'interview_scheduled', 'interview_rescheduled',
            'interview_cancelled', 'interview_reminder', 'employer_verification',
        ] as $purpose) {
            $this->assertDatabaseHas('sms_notifications', [
                'purpose' => $purpose,
                'gateway_status' => 'log_only',
            ]);
        }
        Http::assertNothingSent();
    }

    private function admin(): Administrator
    {
        return Administrator::firstOrCreate(['email' => 'sms-admin@example.com'], [
            'first_name' => 'SMS', 'last_name' => 'Administrator', 'password' => 'password',
            'role' => 'admin', 'status' => 'active', 'mobile_number' => '09171234567',
        ]);
    }

    private function createSchema(): void
    {
        Schema::create('administrators', function (Blueprint $table) {
            $table->id('admin_id'); $table->string('first_name'); $table->string('last_name');
            $table->string('email')->unique(); $table->string('password'); $table->string('role');
            $table->string('status'); $table->string('mobile_number')->nullable(); $table->timestamps();
        });
        Schema::create('sms_notifications', function (Blueprint $table) {
            $table->id('notification_id'); $table->string('recipient_type'); $table->unsignedBigInteger('recipient_id');
            $table->string('phone_number')->default(''); $table->string('normalized_phone_number')->nullable();
            $table->string('message_type'); $table->string('purpose')->nullable(); $table->text('content');
            $table->string('status')->default('pending'); $table->string('gateway_status')->nullable();
            $table->string('provider')->nullable(); $table->string('provider_message_id')->nullable();
            $table->string('provider_reference_id')->nullable(); $table->text('provider_error')->nullable();
            $table->text('error_message')->nullable(); $table->json('metadata')->nullable();
            $table->timestamp('sent_at')->nullable(); $table->timestamps();
        });
    }
}
