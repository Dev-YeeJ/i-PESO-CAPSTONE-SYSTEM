<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\EmployerReview;
use App\Models\EmployerReviewFlag;
use App\Models\JobSeeker;
use App\Models\WorkerFeedback;
use App\Notifications\NewEmployerReviewNotification;
use App\Notifications\ReviewModeratedNotification;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesFeedbackTables;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class AdminReviewModerationTest extends TestCase
{
    use CreatesFeedbackTables, CreatesStaffTables, DatabaseTransactions;

    private int $employerId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();
        $this->createHiringTables();
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
        if (! Schema::hasTable('employer_reports')) {
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
        (require database_path('migrations/2026_11_12_000001_create_employer_feedback_tables.php'))->up();

        $this->employerId = $this->employer('Urdaneta Rice Mill Corp.');
    }

    public function test_the_queue_shows_held_and_flagged_reviews_with_the_reviewer_known_to_peso(): void
    {
        $held = $this->review('Call 0917 123 4567', 'held');
        $disputed = $this->review('Fair process.');
        $this->flag($disputed, 'employer');
        $quiet = $this->review('Nothing wrong here.');
        Sanctum::actingAs($this->staff());

        $this->getJson('/api/admin/reviews/summary')
            ->assertOk()
            ->assertJsonPath('attention', 2)
            ->assertJsonPath('held', 1)
            ->assertJsonPath('disputed', 1);

        $ids = collect($this->getJson('/api/admin/reviews')->json('reviews.data'))->pluck('id');
        $this->assertEqualsCanonicalizing([$held, $disputed], $ids->all());
        $this->assertNotContains($quiet, $ids);

        $detail = $this->getJson("/api/admin/reviews/{$disputed}")->assertOk()->json('review');
        $this->assertSame('Test Seeker', $detail['reviewer']['name']);
        $this->assertSame('Employer (dispute)', $detail['flags'][0]['from']);
        $this->assertTrue($detail['disputed']);
    }

    public function test_publishing_a_held_review_tells_the_reviewer_and_the_employer(): void
    {
        $id = $this->review('Mentions a phone', 'held');
        $this->flag($id, 'system');
        Sanctum::actingAs($this->staff());

        $this->postJson("/api/admin/reviews/{$id}/publish", ['note' => 'The number was the office hotline; fine.'])
            ->assertOk()
            ->assertJsonPath('review.status', 'published');

        $this->assertSame('dismissed', EmployerReviewFlag::first()->status);
        $this->assertSame(1, DB::table('notifications')->where('type', ReviewModeratedNotification::class)->count());
        $this->assertSame(1, DB::table('notifications')->where('type', NewEmployerReviewNotification::class)->count());
        $this->assertDatabaseHas('activity_logs', ['action' => 'published_employer_review']);
    }

    public function test_hiding_needs_a_reason_the_reviewer_sees(): void
    {
        $id = $this->review('An accusation with a full name.');
        $this->flag($id, 'seeker');
        Sanctum::actingAs($this->staff());

        $this->postJson("/api/admin/reviews/{$id}/hide", [])->assertStatus(422)->assertJsonValidationErrors('note');
        $this->postJson("/api/admin/reviews/{$id}/hide", ['note' => 'Names a private person; please remove the name.'])
            ->assertOk()
            ->assertJsonPath('review.status', 'hidden');

        $this->assertSame('upheld', EmployerReviewFlag::first()->status);
        $this->assertStringContainsString('Names a private person', DB::table('notifications')->where('type', ReviewModeratedNotification::class)->value('data'));

        // Hidden reviews disappear from the company profile.
        Sanctum::actingAs($this->seeker('viewer@example.test'));
        $this->getJson("/api/seeker/employers/{$this->employerId}/reviews")->assertJsonCount(0, 'reviews.data');
    }

    public function test_a_review_can_become_an_employer_report_and_replies_can_be_hidden(): void
    {
        $id = $this->review('They asked for a 2,000 peso processing fee.');
        DB::table('employer_review_replies')->insert(['review_id' => $id, 'employer_id' => $this->employerId, 'body' => 'You are lying.', 'status' => 'published', 'created_at' => now(), 'updated_at' => now()]);
        Sanctum::actingAs($this->staff());

        $this->postJson("/api/admin/reviews/{$id}/escalate", ['reason' => 'illegal_fees', 'note' => 'Check with the applicant.'])
            ->assertOk()
            ->assertJsonPath('message', fn ($message) => str_starts_with($message, 'Employer report #'));
        $report = DB::table('employer_reports')->first();
        $this->assertSame('investigating', $report->status);
        $this->assertStringContainsString('2,000 peso processing fee', $report->description);

        $this->postJson("/api/admin/reviews/{$id}/reply-visibility", ['visible' => false])->assertOk()->assertJsonPath('review.reply.status', 'hidden');
        Sanctum::actingAs($this->seeker('viewer@example.test'));
        $this->getJson("/api/seeker/employers/{$this->employerId}/reviews")->assertJsonPath('reviews.data.0.reply', null);
    }

    public function test_view_only_staff_can_look_but_not_act(): void
    {
        $id = $this->review('Held one', 'held');
        Sanctum::actingAs($this->staff('intern@peso.test', ['constituent_crm' => 'view']));

        $this->getJson('/api/admin/reviews')->assertOk();
        $this->postJson("/api/admin/reviews/{$id}/publish")->assertForbidden();
        $this->postJson("/api/admin/reviews/{$id}/hide", ['note' => 'Trying to hide this one.'])->assertForbidden();

        Sanctum::actingAs($this->staff('none@peso.test', ['employment_hub' => 'manage']));
        $this->getJson('/api/admin/reviews')->assertForbidden();
    }

    public function test_worker_feedback_shows_on_the_seeker_profile_and_can_be_hidden(): void
    {
        $worker = $this->seeker('worker@example.test');
        $feedback = WorkerFeedback::create([
            'employer_id' => $this->employerId, 'seeker_id' => $worker->seeker_id,
            'ratings' => ['professionalism' => 2, 'communication' => 3, 'reliability' => 2, 'job_performance' => 3],
            'would_rehire' => 'no', 'comment' => 'Often late in the first month.',
        ]);
        Sanctum::actingAs($this->staff());

        $this->getJson("/api/admin/seekers/{$worker->seeker_id}/worker-feedback")
            ->assertOk()
            ->assertJsonPath('feedback.0.employer', 'Urdaneta Rice Mill Corp.')
            ->assertJsonPath('feedback.0.would_rehire', 'No');
        $this->assertDatabaseHas('activity_logs', ['action' => 'viewed_worker_feedback']);

        $this->postJson("/api/admin/worker-feedback/{$feedback->id}/visibility", ['visible' => false])->assertStatus(422);
        $this->postJson("/api/admin/worker-feedback/{$feedback->id}/visibility", ['visible' => false, 'note' => 'Not job-related.'])->assertOk();
        $this->assertSame('hidden', $feedback->fresh()->status);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function staff(string $email = 'aide@peso.test', array $permissions = ['constituent_crm' => 'manage']): Administrator
    {
        $role = AdminRole::create(['name' => 'Role '.$email, 'slug' => 'role-'.md5($email), 'permissions' => $permissions, 'is_system' => false]);

        return Administrator::forceCreate([
            'first_name' => 'Staff', 'last_name' => 'Member', 'email' => $email, 'password' => 'password123',
            'role' => $role->slug, 'admin_role_id' => $role->id, 'position' => 'administrative_aide',
            'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function review(string $comment, string $status = 'published'): int
    {
        $seeker = JobSeeker::forceCreate([
            'first_name' => 'Test', 'last_name' => 'Seeker', 'email' => uniqid('s').'@example.test', 'password' => 'x',
        ]);

        return EmployerReview::create([
            'employer_id' => $this->employerId, 'seeker_id' => $seeker->seeker_id, 'type' => 'recruitment',
            'ratings' => ['communication' => 3, 'process' => 3, 'professionalism' => 3, 'posting_accuracy' => 3],
            'recommend' => false, 'comment' => $comment, 'status' => $status, 'submitted_ip' => '10.0.0.1',
        ])->id;
    }

    private function flag(int $reviewId, string $by): void
    {
        EmployerReviewFlag::create([
            'review_id' => $reviewId, 'reporter_type' => $by, 'reporter_id' => 1,
            'reason' => 'false_information', 'details' => 'Check this.',
        ]);
    }
}
