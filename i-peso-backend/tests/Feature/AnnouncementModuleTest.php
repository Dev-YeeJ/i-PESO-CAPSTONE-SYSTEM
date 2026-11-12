<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\Announcement;
use App\Models\Employer;
use App\Models\JobSeeker;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class AnnouncementModuleTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createStaffTables();
        $this->createAnnouncementTables();
        Http::fake();
    }

    public function test_a_draft_is_invisible_until_published_and_then_only_reaches_its_audience(): void
    {
        $admin = $this->admin();
        $seeker = $this->seeker();
        $employer = $this->employer();

        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/admin/announcements', $this->payload(['audience' => 'seekers']))
            ->assertCreated()
            ->assertJsonPath('announcement.state', 'draft')
            ->assertJsonPath('message', 'Draft saved.')
            ->json('announcement.id');

        Sanctum::actingAs($seeker);
        $this->getJson('/api/announcements')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/announcements/{$id}")->assertNotFound();

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/announcements/{$id}/publish")
            ->assertOk()
            ->assertJsonPath('announcement.state', 'live');

        Sanctum::actingAs($seeker);
        $this->getJson('/api/announcements')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('unread_count', 1);

        // Addressed to job seekers only: employers and visitors never see it, by any route.
        Sanctum::actingAs($employer);
        $this->getJson('/api/announcements')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/announcements/{$id}")->assertNotFound();
        $this->getJson('/api/public/announcements')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_public_announcements_reach_the_landing_page_and_both_roles_with_their_attachment(): void
    {
        Storage::fake('local');
        $admin = $this->admin();

        Sanctum::actingAs($admin);
        $id = $this->post('/api/admin/announcements', $this->payload([
            'audience' => 'public',
            'intent' => 'publish',
            'attachment' => UploadedFile::fake()->image('poster.png'),
        ]), ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('announcement.has_attachment', true)
            ->json('announcement.id');

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/public/announcements')->assertOk()->assertJsonPath('data.0.id', $id);
        $this->get("/api/public/announcements/{$id}/attachment")->assertOk()->assertHeader('content-type', 'image/png');

        foreach ([$this->seeker(), $this->employer()] as $reader) {
            Sanctum::actingAs($reader);
            $this->getJson('/api/announcements')->assertOk()->assertJsonPath('data.0.id', $id);
            $this->get("/api/announcements/{$id}/attachment")->assertOk();
        }
    }

    public function test_opening_marks_read_and_dismissing_only_hides_the_banner(): void
    {
        $seeker = $this->seeker();
        $announcement = $this->published(['priority' => 'important', 'audience' => 'all']);

        Sanctum::actingAs($seeker);
        $this->getJson('/api/announcements/banner')->assertOk()->assertJsonPath('data.0.id', $announcement->id)->assertJsonPath('unread_count', 1);

        $this->getJson("/api/announcements/{$announcement->id}")->assertOk()->assertJsonPath('announcement.is_read', true)->assertJsonPath('unread_count', 0);
        // Read but not dismissed — still in the banner until closed.
        $this->getJson('/api/announcements/banner')->assertOk()->assertJsonCount(1, 'data');

        $this->postJson("/api/announcements/{$announcement->id}/dismiss")->assertOk();
        $this->getJson('/api/announcements/banner')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/announcements')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.is_dismissed', true);
    }

    public function test_normal_priority_never_appears_in_the_banner_and_urgent_comes_first(): void
    {
        $seeker = $this->seeker();
        $this->published(['priority' => 'normal', 'title' => 'Routine']);
        $important = $this->published(['priority' => 'important', 'title' => 'Important']);
        $urgent = $this->published(['priority' => 'urgent', 'title' => 'Urgent']);

        Sanctum::actingAs($seeker);
        $this->getJson('/api/announcements/banner')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $urgent->id)
            ->assertJsonPath('data.1.id', $important->id);
    }

    public function test_publishing_with_notify_sends_once_to_the_audience_after_the_response(): void
    {
        $this->withoutDefer();
        $admin = $this->admin();
        $seekers = [$this->seeker(), $this->seeker()];
        $employer = $this->employer();

        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/admin/announcements', $this->payload(['audience' => 'seekers', 'notify_users' => true, 'intent' => 'publish']))
            ->assertCreated()
            ->json('announcement.id');

        foreach ($seekers as $seeker) {
            $this->assertSame(1, $seeker->notifications()->count());
            $data = $seeker->notifications()->first()->data;
            $this->assertSame('announcement', $data['type']);
            $this->assertSame("/seeker/announcements?open={$id}", $data['action_url']);
        }
        $this->assertSame(0, $employer->notifications()->count());
        $this->assertSame(2, Announcement::find($id)->notified_count);

        // Neither the scheduler nor a later edit can send it a second time.
        Artisan::call('announcements:deliver-due');
        $this->putJson("/api/admin/announcements/{$id}", $this->payload(['audience' => 'seekers', 'notify_users' => true, 'title' => 'Edited title']))->assertOk();
        $this->assertSame(1, $seekers[0]->notifications()->count());
    }

    public function test_a_scheduled_announcement_goes_live_on_time_and_the_scheduler_delivers_it(): void
    {
        $admin = $this->admin();
        $employer = $this->employer();
        $when = now()->addHours(2)->startOfMinute();

        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/admin/announcements', $this->payload([
            'audience' => 'employers', 'notify_users' => true, 'intent' => 'publish', 'publish_at' => $when->toISOString(),
        ]))
            ->assertCreated()
            ->assertJsonPath('announcement.state', 'scheduled')
            ->json('announcement.id');

        Artisan::call('announcements:deliver-due');
        $this->assertSame(0, $employer->notifications()->count());

        Sanctum::actingAs($employer);
        $this->getJson('/api/announcements')->assertJsonCount(0, 'data');

        $this->travelTo($when->copy()->addMinute());
        $this->getJson('/api/announcements')->assertJsonCount(1, 'data');

        Artisan::call('announcements:deliver-due');
        Artisan::call('announcements:deliver-due');
        $this->assertSame(1, $employer->notifications()->count());
        $this->assertSame("/employer/announcements?open={$id}", $employer->notifications()->first()->data['action_url']);
    }

    public function test_expired_unpublished_and_archived_announcements_disappear_for_readers(): void
    {
        $seeker = $this->seeker();
        $expiring = $this->published(['expires_at' => now()->addHour()]);
        $toUnpublish = $this->published();
        $toArchive = $this->published();

        Sanctum::actingAs($this->admin());
        $this->postJson("/api/admin/announcements/{$toUnpublish->id}/unpublish")->assertOk()->assertJsonPath('announcement.state', 'draft');
        $this->postJson("/api/admin/announcements/{$toArchive->id}/archive")->assertOk()->assertJsonPath('announcement.state', 'archived');

        Sanctum::actingAs($seeker);
        $this->getJson('/api/announcements')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $expiring->id);

        $this->travel(2)->hours();
        $this->getJson('/api/announcements')->assertJsonCount(0, 'data');

        Sanctum::actingAs($this->admin('second-admin@example.test'));
        $this->getJson('/api/admin/announcements?state=expired')->assertOk()->assertJsonPath('data.0.id', $expiring->id)->assertJsonPath('summary.expired', 1);
    }

    public function test_published_announcements_stay_on_record_but_never_published_drafts_can_be_deleted(): void
    {
        Sanctum::actingAs($this->admin());
        $published = $this->published();
        $this->deleteJson("/api/admin/announcements/{$published->id}")->assertStatus(422);

        // Unpublishing doesn't make it deletable — readers may have seen it.
        $this->postJson("/api/admin/announcements/{$published->id}/unpublish")->assertOk()->assertJsonPath('announcement.can_delete', false);

        $draftId = $this->postJson('/api/admin/announcements', $this->payload())->json('announcement.id');
        $this->deleteJson("/api/admin/announcements/{$draftId}")->assertOk();
        $this->assertDatabaseMissing('announcements', ['id' => $draftId]);
    }

    public function test_view_only_staff_can_read_but_not_change_and_staff_without_configuration_are_refused(): void
    {
        $announcement = $this->published();
        $viewer = $this->staffWith(['configuration' => 'view'], 'viewer@example.test');
        $outsider = $this->staffWith(['employment_hub' => 'manage'], 'outsider@example.test');

        Sanctum::actingAs($viewer);
        $this->getJson('/api/admin/announcements')->assertOk();
        $this->getJson("/api/admin/announcements/{$announcement->id}")->assertOk();
        $this->postJson('/api/admin/announcements', $this->payload())->assertForbidden();
        $this->postJson("/api/admin/announcements/{$announcement->id}/archive")->assertForbidden();

        Sanctum::actingAs($outsider);
        $this->getJson('/api/admin/announcements')->assertForbidden();
    }

    public function test_unsafe_links_and_an_end_date_before_the_start_are_rejected(): void
    {
        Sanctum::actingAs($this->admin());

        foreach (['javascript:alert(1)', 'http://example.com', '//evil.example'] as $badLink) {
            $this->postJson('/api/admin/announcements', $this->payload(['link_label' => 'Open', 'link_url' => $badLink]))
                ->assertStatus(422)->assertJsonValidationErrors('link_url');
        }

        $this->postJson('/api/admin/announcements', $this->payload(['link_label' => 'View job fairs', 'link_url' => '/seeker/job-fairs']))->assertCreated();

        $this->postJson('/api/admin/announcements', $this->payload([
            'publish_at' => now()->addDays(2)->toISOString(),
            'expires_at' => now()->addDay()->toISOString(),
        ]))->assertStatus(422)->assertJsonValidationErrors('expires_at');
    }

    public function test_admin_detail_reports_reach_and_every_change_is_audited(): void
    {
        $admin = $this->admin();
        $announcement = $this->published(['audience' => 'seekers']);
        [$first, $second] = [$this->seeker(), $this->seeker()];

        Sanctum::actingAs($first);
        $this->getJson("/api/announcements/{$announcement->id}")->assertOk();

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/announcements/{$announcement->id}")
            ->assertOk()
            ->assertJsonPath('announcement.reach.targeted', 2)
            ->assertJsonPath('announcement.reach.seen', 1)
            ->assertJsonPath('announcement.reach.rate', 50);

        $this->postJson("/api/admin/announcements/{$announcement->id}/archive")->assertOk();
        $this->assertDatabaseHas('activity_logs', ['user_id' => $admin->admin_id, 'action' => 'announcement_archived']);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'PESO office schedule this week',
            'body' => "The PESO office will be closed on Friday for the city holiday.\nRegular hours resume Monday.",
            'category' => 'advisory',
            'priority' => 'normal',
            'audience' => 'all',
        ], $overrides);
    }

    private function published(array $attributes = []): Announcement
    {
        return Announcement::create(array_merge([
            'title' => 'Published announcement',
            'body' => 'Body',
            'category' => 'general',
            'priority' => 'normal',
            'audience' => 'all',
            'status' => Announcement::STATUS_PUBLISHED,
            'publish_at' => now()->subMinute(),
            'first_published_at' => now()->subMinute(),
        ], $attributes));
    }

    private function admin(string $email = 'announcements-admin@example.test'): Administrator
    {
        return Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Manager', 'email' => $email,
            'password' => 'password123', 'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function staffWith(array $permissions, string $email): Administrator
    {
        $role = AdminRole::create(['name' => 'Role '.$email, 'slug' => 'role-'.md5($email), 'permissions' => $permissions]);

        return Administrator::create([
            'first_name' => 'Staff', 'last_name' => 'Member', 'email' => $email, 'password' => 'password123',
            'role' => 'staff', 'admin_role_id' => $role->id, 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function seeker(): JobSeeker
    {
        $id = DB::table('job_seekers')->insertGetId(['email' => fake()->unique()->safeEmail(), 'created_at' => now(), 'updated_at' => now()]);

        return JobSeeker::findOrFail($id);
    }

    private function employer(): Employer
    {
        $id = DB::table('employers')->insertGetId(['email' => fake()->unique()->safeEmail(), 'created_at' => now(), 'updated_at' => now()]);

        return Employer::findOrFail($id);
    }

    private function createAnnouncementTables(): void
    {
        if (! Schema::hasTable('announcements')) {
            Schema::create('announcements', function (Blueprint $table) {
                $table->id();
                $table->string('title', 150);
                $table->text('body');
                $table->string('category', 30)->default('general');
                $table->string('priority', 20)->default('normal');
                $table->string('audience', 20)->default('all');
                $table->string('status', 20)->default('draft');
                $table->boolean('is_pinned')->default(false);
                $table->timestamp('publish_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('first_published_at')->nullable();
                $table->string('link_label', 60)->nullable();
                $table->string('link_url', 500)->nullable();
                $table->string('attachment_path')->nullable();
                $table->string('attachment_name')->nullable();
                $table->string('attachment_mime', 100)->nullable();
                $table->boolean('notify_users')->default(false);
                $table->timestamp('notified_at')->nullable();
                $table->unsignedInteger('notified_count')->default(0);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->unsignedBigInteger('published_by')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('announcement_reads')) {
            Schema::create('announcement_reads', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('announcement_id');
                $table->string('reader_type');
                $table->unsignedBigInteger('reader_id');
                $table->timestamp('read_at')->nullable();
                $table->timestamp('dismissed_at')->nullable();
                $table->timestamps();
                $table->unique(['announcement_id', 'reader_type', 'reader_id']);
            });
        }

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('push_tokens')) {
            Schema::create('push_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('token')->unique();
                $table->string('platform')->nullable();
                $table->string('device_name')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamps();
            });
        }
    }
}
