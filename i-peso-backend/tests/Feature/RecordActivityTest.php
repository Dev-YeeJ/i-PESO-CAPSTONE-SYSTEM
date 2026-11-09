<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Services\ActivityLogger;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class RecordActivityTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();

        if (! Schema::hasColumn('job_seekers', 'first_name')) {
            Schema::table('job_seekers', function (Blueprint $table) {
                $table->string('first_name')->nullable();
                $table->string('last_name')->nullable();
                $table->string('mobile_number')->nullable();
                $table->timestamp('email_verified_at')->nullable();
            });
        }

        // Stand-ins shaped like real routes, so the recorder is tested
        // without the tables behind every real controller.
        Route::middleware(['api', 'auth:sanctum'])->prefix('api')->group(function () {
            Route::post('/admin/job-fairs/{jobFair}/publish', fn () => ['ok' => true]);
            Route::put('/admin/citizen-charter/{citizenCharter}', fn () => ['ok' => true]);
            Route::delete('/admin/job-fairs/{id}', fn () => ['ok' => true]);
            Route::post('/admin/job-fairs', fn () => response()->json(['ok' => true], 201));
            Route::patch('/employer/applications/{application}/status', fn () => ['ok' => true]);
            Route::patch('/seeker/notifications/{notification}/read', fn () => ['ok' => true]);
            Route::post('/seeker/ai-profile-suggestions', fn () => ['ok' => true]);
            Route::post('/admin/failing/{thing}', fn () => response()->json(['message' => 'Nope'], 422));
            Route::get('/admin/job-fairs', fn () => ['data' => []]);
            Route::get('/admin/seekers/{id}', fn () => ['seeker' => []]);
            Route::post('/admin/explained/{thing}', function () {
                ActivityLogger::log('approved_thing', 'Approved the thing with a specific message.');

                return ['ok' => true];
            });
        });
        Route::middleware('api')->prefix('api')->post('/public/form', fn () => ['ok' => true]);
    }

    public function test_changes_by_staff_are_recorded_in_plain_words(): void
    {
        Sanctum::actingAs($admin = $this->admin());

        $this->postJson('/api/admin/job-fairs/12/publish')->assertOk();
        $this->putJson('/api/admin/citizen-charter/3')->assertOk();
        $this->deleteJson('/api/admin/job-fairs/7')->assertOk();
        $this->postJson('/api/admin/job-fairs')->assertCreated();

        $this->assertSame([
            ['published_job_fair', 'Published job fair #12.'],
            ['updated_citizen_charter', 'Updated citizen charter #3.'],
            ['deleted_job_fair', 'Deleted job fair #7.'],
            ['created_job_fair', 'Created a new job fair.'],
        ], ActivityLog::orderBy('log_id')->get()->map(fn ($log) => [$log->action, $log->description])->all());

        $this->assertSame(Administrator::class, ActivityLog::first()->user_type);
        $this->assertSame($admin->admin_id, ActivityLog::first()->user_id);
    }

    public function test_hand_written_wording_includes_the_new_status(): void
    {
        Sanctum::actingAs($this->seeker());

        $this->patchJson('/api/employer/applications/45/status', ['status' => 'interview'])->assertOk();

        $this->assertSame('Moved application #45 to Interview.', ActivityLog::value('description'));
        $this->assertSame('updated_application_status', ActivityLog::value('action'));
    }

    public function test_background_noise_failures_reads_and_guests_are_not_recorded(): void
    {
        Sanctum::actingAs($this->seeker());

        $this->patchJson('/api/seeker/notifications/abc/read')->assertOk();
        $this->postJson('/api/seeker/ai-profile-suggestions')->assertOk();
        $this->postJson('/api/admin/failing/1')->assertStatus(422);
        $this->getJson('/api/admin/job-fairs')->assertOk();

        $this->app['auth']->forgetGuards(); // now a signed-out visitor
        $this->postJson('/api/public/form')->assertOk();

        $this->assertSame(0, ActivityLog::count());
    }

    public function test_a_controller_entry_is_not_duplicated(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/explained/1')->assertOk();

        $this->assertSame(1, ActivityLog::count());
        $this->assertSame('approved_thing', ActivityLog::value('action'));
    }

    public function test_opening_personal_data_is_recorded_once_per_ten_minutes(): void
    {
        Sanctum::actingAs($this->admin());

        $this->getJson('/api/admin/seekers/88')->assertOk();
        $this->getJson('/api/admin/seekers/88')->assertOk(); // e.g. the tab regained focus
        $this->getJson('/api/admin/seekers/89')->assertOk();

        $this->assertSame(
            ["Opened job seeker #88's profile.", "Opened job seeker #89's profile."],
            ActivityLog::orderBy('log_id')->pluck('description')->all()
        );
        $this->assertSame('security', ActivityLog::first()->severity);
    }

    public function test_the_log_can_be_narrowed_to_one_person_and_shows_their_position(): void
    {
        $sleo = $this->admin();
        $aide = $this->admin('aide@peso.test', 'administrative_aide');
        ActivityLogger::logAs($aide, 'created_job_fair', 'Created a new job fair.');
        ActivityLogger::logAs($sleo, 'created_staff', 'Created staff account.');
        Sanctum::actingAs($sleo);

        $this->getJson("/api/admin/activity-logs?user_type=administrator&user_id={$aide->admin_id}")
            ->assertOk()
            ->assertJsonCount(1, 'logs.data')
            ->assertJsonPath('logs.data.0.actor_role', 'Administrative Aide')
            ->assertJsonPath('actor.name', 'Test Staff')
            ->assertJsonPath('actor.role', 'Administrative Aide');
    }

    public function test_the_whole_filtered_log_exports_as_csv_and_the_export_is_logged(): void
    {
        $sleo = $this->admin();
        ActivityLogger::logAs($sleo, 'created_job_fair', 'Created a new job fair, "Urdaneta Jobs Fair".');
        Sanctum::actingAs($sleo);

        $response = $this->get('/api/admin/activity-logs/export');
        $response->assertOk();
        $csv = $response->streamedContent();

        $this->assertStringContainsString('"Date and time (PH)","User type",Name,"Position / role",Action,Description,"IP address"', $csv);
        $this->assertStringContainsString('"Created a new job fair, ""Urdaneta Jobs Fair""."', $csv);
        $this->assertStringContainsString('Special Law Enforcement Officer', $csv);
        $this->assertDatabaseHas('activity_logs', ['action' => 'exported_activity_log']);
    }

    public function test_staff_without_activity_log_access_cannot_export(): void
    {
        $role = AdminRole::create(['name' => 'Aide', 'slug' => 'administrative-aide', 'permissions' => ['employment_hub' => 'manage'], 'is_system' => true]);
        $aide = $this->admin('aide@peso.test', 'administrative_aide');
        $aide->forceFill(['role' => 'administrative-aide', 'admin_role_id' => $role->id])->save();
        Sanctum::actingAs($aide);

        $this->get('/api/admin/activity-logs/export')->assertForbidden();
    }

    private function admin(string $email = 'sleo@peso.test', string $position = 'special_law_enforcement_officer'): Administrator
    {
        return Administrator::forceCreate([
            'first_name' => 'Test', 'last_name' => 'Staff', 'email' => $email, 'mobile_number' => '09171234567',
            'password' => 'password123', 'position' => $position, 'role' => 'administrator',
            'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function seeker(): JobSeeker
    {
        return JobSeeker::forceCreate([
            'first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'email' => 'juan@example.test',
            'password' => 'password123', 'mobile_number' => '09181234567', 'email_verified_at' => now(),
        ]);
    }
}
