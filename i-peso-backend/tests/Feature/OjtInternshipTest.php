<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\OjtTimeLog;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class OjtInternshipTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    /** @var array<string, AdminRole> */
    private array $roles = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();

        foreach ([
            'administrator' => [],
            'office-manager' => ['configuration' => 'view', 'activity_logs' => 'view'],
            'ojt-intern' => ['employment_hub' => 'view'],
        ] as $slug => $permissions) {
            $this->roles[$slug] = AdminRole::create(['name' => ucfirst($slug), 'slug' => $slug, 'permissions' => $permissions, 'is_system' => true]);
        }

        // 9:00 AM on Tuesday, Nov 10, 2026 in the Philippines. Given as UTC like
        // production's clock: a test clock in another timezone makes Carbon read
        // stored timestamps in that timezone too.
        Carbon::setTestNow(Carbon::parse('2026-11-10 09:00:00', 'Asia/Manila')->utc());
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    // ── Adding an intern ────────────────────────────────────────────────────

    public function test_adding_an_intern_requires_school_hours_and_dates(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->account('sleo@peso.test', 'special_law_enforcement_officer', 'administrator'));

        $base = ['first_name' => 'Ana', 'last_name' => 'Reyes', 'email' => 'ana@school.test', 'mobile_number' => '09171234567', 'position' => 'ojt_intern'];

        $this->postJson('/api/admin/staff', $base)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ojt_school', 'ojt_required_hours', 'ojt_start_date', 'ojt_end_date']);

        $this->postJson('/api/admin/staff', $base + [
            'ojt_school' => 'Pangasinan State University', 'ojt_course' => 'BS Information Technology',
            'ojt_required_hours' => 486, 'ojt_start_date' => '2026-11-03', 'ojt_end_date' => '2026-11-02',
        ])->assertStatus(422)->assertJsonPath('errors.ojt_end_date.0', 'The end date must be on or after the start date.');

        $this->postJson('/api/admin/staff', $base + [
            'ojt_school' => 'Pangasinan State University', 'ojt_course' => 'BS Information Technology',
            'ojt_required_hours' => 486, 'ojt_start_date' => '2026-11-03', 'ojt_end_date' => '2027-01-29',
        ])
            ->assertCreated()
            ->assertJsonPath('staff.internship.required_hours', 486)
            ->assertJsonPath('staff.internship.end_date', '2027-01-29')
            ->assertJsonPath('staff.role.slug', 'ojt-intern');
    }

    // ── Time in / time out ──────────────────────────────────────────────────

    public function test_an_intern_times_in_and_out_and_the_hours_wait_for_approval(): void
    {
        $intern = $this->intern();
        Sanctum::actingAs($intern);

        $this->postJson('/api/admin/ojt/me/time-in')
            ->assertOk()
            ->assertJsonPath('message', 'Timed in at 9:00 AM.')
            ->assertJsonPath('today.status', 'open');

        $this->postJson('/api/admin/ojt/me/time-in')->assertStatus(422)->assertJsonPath('message', 'You already timed in today.');

        Carbon::setTestNow(Carbon::parse('2026-11-10 17:00:00', 'Asia/Manila')->utc());

        $this->postJson('/api/admin/ojt/me/time-out')
            ->assertOk()
            ->assertJsonPath('message', 'Timed out at 5:00 PM. 8 hours sent for approval.')
            ->assertJsonPath('today.status', 'pending')
            ->assertJsonPath('today.minutes', 480)
            ->assertJsonPath('progress.pending_hours', 8)
            ->assertJsonPath('progress.approved_hours', 0);

        $this->postJson('/api/admin/ojt/me/time-out')->assertStatus(422);
        $this->postJson('/api/admin/ojt/me/time-in')->assertStatus(422)->assertJsonPath('message', 'You already timed in and out today.');

        $this->assertSame('2026-11-10', OjtTimeLog::first()->work_date->toDateString());
        $this->assertDatabaseHas('activity_logs', ['action' => 'timed_in']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'timed_out']);
    }

    public function test_the_work_date_follows_philippine_time_not_utc(): void
    {
        // 7:30 AM Nov 11 in Manila is still Nov 10 in UTC.
        Carbon::setTestNow(Carbon::parse('2026-11-11 07:30:00', 'Asia/Manila')->utc());
        Sanctum::actingAs($this->intern());

        $this->postJson('/api/admin/ojt/me/time-in')->assertOk()->assertJsonPath('today.work_date', '2026-11-11');
    }

    public function test_an_intern_cannot_time_in_before_the_internship_starts(): void
    {
        Sanctum::actingAs($this->intern(['ojt_start_date' => '2026-11-16']));

        $this->postJson('/api/admin/ojt/me/time-in')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Your internship starts on November 16, 2026. You can time in from then.');
    }

    public function test_only_interns_have_a_time_record(): void
    {
        Sanctum::actingAs($this->account('manager@peso.test', 'peso_office_manager', 'office-manager'));

        $this->getJson('/api/admin/ojt/me')->assertForbidden();
        $this->postJson('/api/admin/ojt/me/time-in')->assertForbidden();
    }

    public function test_a_forgotten_time_out_shows_as_incomplete_and_does_not_block_today(): void
    {
        $intern = $this->intern();
        $intern->ojtTimeLogs()->create([
            'work_date' => '2026-11-09', 'time_in' => Carbon::parse('2026-11-09 08:00', 'Asia/Manila')->utc(), 'status' => 'open',
        ]);
        Sanctum::actingAs($intern);

        $me = $this->getJson('/api/admin/ojt/me')->assertOk();
        $this->assertSame('incomplete', $me->json('logs.0.status'));
        $this->assertSame(1, $me->json('progress.incomplete_entries'));

        $this->postJson('/api/admin/ojt/me/time-in')->assertOk();
    }

    // ── Reviewing hours ─────────────────────────────────────────────────────

    public function test_the_system_administrator_approves_rejects_and_approves_in_bulk(): void
    {
        $intern = $this->intern(['ojt_required_hours' => 16]);
        $day1 = $this->entry($intern, '2026-11-05', '08:00', '17:00'); // 9 h
        $day2 = $this->entry($intern, '2026-11-06', '08:00', '12:00'); // 4 h
        $day3 = $this->entry($intern, '2026-11-09', '08:00', '11:00'); // 3 h
        Sanctum::actingAs($this->account('sleo@peso.test', 'special_law_enforcement_officer', 'administrator'));

        $this->postJson("/api/admin/ojt/logs/{$day1->id}/approve")
            ->assertOk()
            ->assertJsonPath('log.status', 'approved')
            ->assertJsonPath('intern.progress.approved_hours', 9);

        $this->postJson("/api/admin/ojt/logs/{$day2->id}/reject")->assertStatus(422)->assertJsonValidationErrors('note');
        $this->postJson("/api/admin/ojt/logs/{$day2->id}/reject", ['note' => 'You left at 10 AM per the logbook.'])
            ->assertOk()
            ->assertJsonPath('log.status', 'rejected');

        $this->postJson("/api/admin/ojt/interns/{$intern->admin_id}/approve-pending")
            ->assertOk()
            ->assertJsonPath('message', 'Approved 1 entry.')
            ->assertJsonPath('intern.progress.approved_hours', 12)
            ->assertJsonPath('intern.progress.remaining_hours', 4)
            ->assertJsonPath('intern.progress.percent', 75)
            ->assertJsonPath('intern.progress.hours_completed', false);

        $this->assertSame('rejected', $day2->fresh()->status);
        $this->assertSame('approved', $day3->fresh()->status);
        $this->assertStringContainsString('left at 10 AM', ActivityLog::where('action', 'rejected_ojt_hours')->value('description'));
    }

    public function test_correcting_an_entry_fixes_the_hours_and_approves_it(): void
    {
        $intern = $this->intern();
        $log = $intern->ojtTimeLogs()->create([
            'work_date' => '2026-11-09', 'time_in' => Carbon::parse('2026-11-09 08:00', 'Asia/Manila')->utc(), 'status' => 'open',
        ]);
        Sanctum::actingAs($this->account('sleo@peso.test', 'special_law_enforcement_officer', 'administrator'));

        $this->postJson("/api/admin/ojt/logs/{$log->id}/approve")->assertStatus(422);

        $this->putJson("/api/admin/ojt/logs/{$log->id}", ['time_in' => '08:00', 'time_out' => '07:00', 'note' => 'x'])
            ->assertStatus(422)->assertJsonPath('errors.time_out.0', 'Time out must be later than time in.');

        $this->putJson("/api/admin/ojt/logs/{$log->id}", ['time_in' => '08:00', 'time_out' => '17:00', 'note' => 'Forgot to time out; confirmed with the logbook.'])
            ->assertOk()
            ->assertJsonPath('log.status', 'approved')
            ->assertJsonPath('log.minutes', 540)
            ->assertJsonPath('log.corrected', true);

        $this->assertStringContainsString('8:00 AM–no time out to 8:00 AM–5:00 PM', ActivityLog::where('action', 'corrected_ojt_time')->value('description'));
    }

    public function test_adding_a_missed_day(): void
    {
        $intern = $this->intern();
        $this->entry($intern, '2026-11-05', '08:00', '17:00');
        Sanctum::actingAs($this->account('sleo@peso.test', 'special_law_enforcement_officer', 'administrator'));
        $payload = ['time_in' => '08:00', 'time_out' => '16:00', 'note' => 'The system was down; signed the paper logbook.'];

        $this->postJson("/api/admin/ojt/interns/{$intern->admin_id}/logs", $payload + ['work_date' => '2026-11-06'])
            ->assertCreated()
            ->assertJsonPath('log.hours', 8)
            ->assertJsonPath('log.status', 'approved');

        $this->postJson("/api/admin/ojt/interns/{$intern->admin_id}/logs", $payload + ['work_date' => '2026-11-05'])
            ->assertStatus(422)->assertJsonValidationErrors('work_date');

        $this->postJson("/api/admin/ojt/interns/{$intern->admin_id}/logs", $payload + ['work_date' => '2026-11-11'])
            ->assertStatus(422)->assertJsonPath('errors.work_date.0', "You can't add hours for a future date.");
    }

    public function test_the_office_manager_can_see_interns_but_not_review_hours(): void
    {
        $intern = $this->intern();
        $log = $this->entry($intern, '2026-11-05', '08:00', '17:00');
        Sanctum::actingAs($this->account('manager@peso.test', 'peso_office_manager', 'office-manager'));

        $this->getJson('/api/admin/ojt/interns')
            ->assertOk()
            ->assertJsonPath('data.0.progress.pending_hours', 9)
            ->assertJsonPath('summary.pending_entries', 1);
        $this->getJson("/api/admin/ojt/interns/{$intern->admin_id}/logs")->assertOk()->assertJsonCount(1, 'logs');

        $this->postJson("/api/admin/ojt/logs/{$log->id}/approve")->assertForbidden();
    }

    public function test_finishing_the_required_hours_is_flagged(): void
    {
        $intern = $this->intern(['ojt_required_hours' => 8]);
        $this->entry($intern, '2026-11-05', '08:00', '17:00', 'approved');
        Sanctum::actingAs($intern);

        $this->getJson('/api/admin/ojt/me')
            ->assertJsonPath('progress.hours_completed', true)
            ->assertJsonPath('progress.percent', 100)
            ->assertJsonPath('progress.remaining_hours', 0);
    }

    // ── End of the internship ───────────────────────────────────────────────

    public function test_the_account_closes_after_the_end_date_and_can_be_extended(): void
    {
        $finished = $this->intern(['ojt_end_date' => '2026-11-09'], 'done@school.test');
        $finished->createToken('web');
        $lastDay = $this->intern(['ojt_end_date' => '2026-11-10'], 'today@school.test');

        Artisan::call('ojt:end-internships');

        $this->assertSame('inactive', $finished->fresh()->status);
        $this->assertSame('internship_ended', $finished->fresh()->deactivated_reason);
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $finished->admin_id)->count());
        $this->assertSame('active', $lastDay->fresh()->status, 'Their last day is still a working day.');
        $this->assertDatabaseHas('activity_logs', ['action' => 'internship_ended']);

        $this->postJson('/api/auth/login', ['email' => 'done@school.test', 'password' => 'password123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Your internship ended on November 9, 2026, so this account is now closed. Thank you for your service to PESO Urdaneta.');

        $admin = $this->account('sleo@peso.test', 'special_law_enforcement_officer', 'administrator');
        Sanctum::actingAs($admin);

        $staff = collect($this->getJson('/api/admin/staff')->json('data'))->firstWhere('email', 'done@school.test');
        $this->assertSame('internship_ended', $staff['account_status']);

        $this->postJson("/api/admin/staff/{$finished->admin_id}/reactivate")
            ->assertStatus(422)
            ->assertJsonPath('message', 'This internship has already ended. Edit the internship end date first, then reactivate.');

        $this->putJson("/api/admin/staff/{$finished->admin_id}", ['ojt_end_date' => '2026-11-20'])->assertOk();
        $this->postJson("/api/admin/staff/{$finished->admin_id}/reactivate")->assertOk()->assertJsonPath('staff.account_status', 'active');
        $this->assertNull($finished->fresh()->deactivated_reason);
    }

    public function test_moving_someone_into_the_intern_position_needs_internship_details(): void
    {
        $aide = $this->account('aide@peso.test', 'administrative_aide', 'office-manager');
        Sanctum::actingAs($this->account('sleo@peso.test', 'special_law_enforcement_officer', 'administrator'));

        $this->putJson("/api/admin/staff/{$aide->admin_id}", ['position' => 'ojt_intern'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ojt_school', 'ojt_required_hours', 'ojt_start_date', 'ojt_end_date']);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function intern(array $overrides = [], string $email = 'intern@school.test'): Administrator
    {
        return $this->account($email, 'ojt_intern', 'ojt-intern', array_merge([
            'ojt_school' => 'Pangasinan State University',
            'ojt_required_hours' => 486,
            'ojt_start_date' => '2026-11-03',
            'ojt_end_date' => '2027-01-29',
        ], $overrides));
    }

    private function account(string $email, string $position, string $roleSlug, array $extra = []): Administrator
    {
        return Administrator::forceCreate(array_merge([
            'first_name' => 'Test', 'last_name' => 'Person', 'email' => $email,
            'mobile_number' => '09171234567', 'password' => 'password123',
            'position' => $position, 'role' => $roleSlug, 'admin_role_id' => $this->roles[$roleSlug]->id,
            'status' => 'active', 'email_verified_at' => now(),
        ], $extra));
    }

    private function entry(Administrator $intern, string $date, string $in, string $out, string $status = 'pending'): OjtTimeLog
    {
        $timeIn = Carbon::parse("{$date} {$in}", 'Asia/Manila')->utc();
        $timeOut = Carbon::parse("{$date} {$out}", 'Asia/Manila')->utc();

        return $intern->ojtTimeLogs()->create([
            'work_date' => $date, 'time_in' => $timeIn, 'time_out' => $timeOut,
            'minutes' => OjtTimeLog::minutesBetween($timeIn, $timeOut), 'status' => $status,
        ]);
    }
}
