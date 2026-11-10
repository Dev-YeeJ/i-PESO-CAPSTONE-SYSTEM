<?php

namespace Tests\Feature;

use App\Models\Employer;
use App\Models\EmployerReview;
use App\Models\EmployerReviewFlag;
use App\Models\JobSeeker;
use App\Models\WorkerFeedback;
use App\Notifications\NewEmployerReviewNotification;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesFeedbackTables;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class EmployerFeedbackTest extends TestCase
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
        (require database_path('migrations/2026_11_12_000001_create_employer_feedback_tables.php'))->up();

        $this->employerId = $this->employer('Urdaneta Rice Mill Corp.');
    }

    // ── Reviews of the company ──────────────────────────────────────────────

    public function test_employers_see_their_published_reviews_anonymously_and_are_notified(): void
    {
        $published = $this->review('Fair and organized.');
        $this->review('Call 0917 123 4567', 'held');
        $otherEmployer = $this->employer('Pangasinan Bakeshop');
        $this->review('Elsewhere.', 'published', $otherEmployer);

        Sanctum::actingAs($this->employerModel());
        $response = $this->getJson('/api/employer/reviews')->assertOk();

        $this->assertSame([$published], collect($response->json('reviews.data'))->pluck('id')->all());
        $review = $response->json('reviews.data.0');
        $this->assertSame('Verified applicant', $review['reviewer']);
        $this->assertArrayNotHasKey('seeker_id', $review);
        $this->assertArrayNotHasKey('job_title', $review);
        $this->assertFalse($response->json('summary.recruitment.enough'));
    }

    public function test_a_new_published_review_notifies_the_employer_but_a_held_one_does_not(): void
    {
        $seeker = $this->seeker('ana@example.test');
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/reviews', $this->payload($this->application($seeker, 'reviewed'), 'Respectful interviewer.'))->assertCreated();
        $this->postJson('/api/seeker/reviews', $this->payload($this->application($seeker, 'reviewed'), 'Email me at ana@gmail.com'))->assertCreated();

        $notes = DB::table('notifications')->where('type', NewEmployerReviewNotification::class)->get();
        $this->assertCount(1, $notes);
        $this->assertSame(Employer::class, $notes[0]->notifiable_type);
        $this->assertStringNotContainsString('ana', $notes[0]->data, 'The employer is never told who wrote it.');
    }

    public function test_unverified_employers_cannot_open_reviews(): void
    {
        Sanctum::actingAs(Employer::find($this->employer('Not Yet Verified', 'pending')));

        $this->getJson('/api/employer/reviews')->assertForbidden();
    }

    // ── Reply ───────────────────────────────────────────────────────────────

    public function test_one_reply_per_review_which_can_be_edited_and_removed(): void
    {
        $id = $this->review('The interview started late.');
        Sanctum::actingAs($this->employerModel());

        $this->postJson("/api/employer/reviews/{$id}/reply", ['body' => 'Thank you, we have adjusted our schedule.'])
            ->assertOk()
            ->assertJsonPath('review.own_reply.body', 'Thank you, we have adjusted our schedule.');

        $this->postJson("/api/employer/reviews/{$id}/reply", ['body' => 'Thank you. Interviews now start on time.'])
            ->assertOk()
            ->assertJsonPath('review.own_reply.edited', true);
        $this->assertSame(1, DB::table('employer_review_replies')->count());

        // Seekers see it under the review.
        Sanctum::actingAs($this->seeker('viewer@example.test'));
        $this->getJson("/api/seeker/employers/{$this->employerId}/reviews")
            ->assertJsonPath('reviews.data.0.reply.body', 'Thank you. Interviews now start on time.');

        Sanctum::actingAs($this->employerModel());
        $this->deleteJson("/api/employer/reviews/{$id}/reply")->assertOk()->assertJsonPath('review.own_reply', null);
    }

    public function test_replies_are_checked_and_only_for_the_employers_own_reviews(): void
    {
        $id = $this->review('Okay.');
        $elsewhere = $this->review('Elsewhere.', 'published', $this->employer('Pangasinan Bakeshop'));
        Sanctum::actingAs($this->employerModel());

        $this->postJson("/api/employer/reviews/{$id}/reply", ['body' => 'Call our HR at 0917 765 4321 please.'])
            ->assertStatus(422)
            ->assertJsonPath('errors.body.0', 'Please remove this from your text: contains a phone number or email address.');

        $this->postJson("/api/employer/reviews/{$elsewhere}/reply", ['body' => 'This is not our review at all.'])->assertNotFound();
    }

    // ── Dispute ─────────────────────────────────────────────────────────────

    public function test_disputing_sends_it_to_peso_and_the_review_stays_up(): void
    {
        $id = $this->review('They asked for a placement fee.');
        Sanctum::actingAs($this->employerModel());

        $this->postJson("/api/employer/reviews/{$id}/dispute", ['reason' => 'false_information', 'details' => 'Too short'])
            ->assertStatus(422)->assertJsonValidationErrors('details');

        $this->postJson("/api/employer/reviews/{$id}/dispute", [
            'reason' => 'false_information', 'details' => 'We never charge applicants any fee; our records show no such request.',
        ])
            ->assertOk()
            ->assertJsonPath('review.dispute.status', 'open')
            ->assertJsonPath('review.dispute.reason', 'False or misleading');

        $this->postJson("/api/employer/reviews/{$id}/dispute", ['reason' => 'other', 'details' => 'Another try at disputing this same review.'])
            ->assertStatus(422)->assertJsonPath('message', 'You already disputed this review. PESO is looking into it.');

        $this->assertSame('published', EmployerReview::find($id)->status);
        $this->assertSame(1, EmployerReviewFlag::where('reporter_type', 'employer')->count());
        $this->assertDatabaseHas('activity_logs', ['action' => 'disputed_review']);
    }

    // ── Private feedback about hires ────────────────────────────────────────

    public function test_employers_list_their_hires_and_give_private_feedback_from_the_start_date(): void
    {
        $worker = $this->seeker('worker@example.test');
        $started = $this->application($worker, 'hired', ['placement_start_date' => now()->subWeek()->toDateString()]);
        $later = $this->application($this->seeker('later@example.test'), 'hired', ['placement_start_date' => now()->addWeek()->toDateString()]);
        $this->application($this->seeker('rejected@example.test'), 'rejected');
        $placed = $this->placement($this->seeker('placed@example.test'), $this->employerId, 'approved');
        Sanctum::actingAs($this->employerModel());

        $hires = collect($this->getJson('/api/employer/hires')->assertOk()->json('hires'));
        $this->assertCount(3, $hires);
        $find = fn (string $source, int $id) => $hires->first(fn ($hire) => $hire['source'] === $source && $hire['source_id'] === $id);
        $this->assertTrue($find('application', $started)['can_give_feedback']);
        $this->assertFalse($find('application', $later)['can_give_feedback']);
        $this->assertNotNull($find('placement', $placed));

        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $later]))
            ->assertStatus(422)->assertJsonPath('errors.application_id.0', 'You can give feedback from their start date.');

        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $started]))
            ->assertCreated()
            ->assertJsonPath('feedback.would_rehire', 'yes');

        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $started, 'would_rehire' => 'maybe']))
            ->assertOk()
            ->assertJsonPath('feedback.would_rehire', 'maybe');
        $this->assertSame(1, WorkerFeedback::count());

        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['placement_record_id' => $placed]))->assertCreated();
    }

    public function test_worker_feedback_is_checked_and_limited_to_the_employers_own_hires(): void
    {
        $worker = $this->seeker('worker@example.test');
        $hire = $this->application($worker, 'hired', ['placement_start_date' => now()->subWeek()->toDateString()]);
        Sanctum::actingAs($this->employerModel());

        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $hire, 'comment' => 'Reach him at worker@gmail.com']))
            ->assertStatus(422)->assertJsonValidationErrors('comment');

        $payload = $this->workerPayload(['application_id' => $hire]);
        unset($payload['ratings']['reliability']);
        $this->postJson('/api/employer/worker-feedback', $payload)->assertStatus(422)->assertJsonValidationErrors('ratings.reliability');

        Sanctum::actingAs(Employer::find($this->employer('Pangasinan Bakeshop')));
        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $hire]))->assertNotFound();
    }

    // ── The worker's view (mutual reveal) ──────────────────────────────────

    public function test_the_worker_sees_employer_feedback_after_reviewing_or_after_fourteen_days(): void
    {
        $worker = $this->seeker('worker@example.test');
        $hire = $this->application($worker, 'hired', ['placement_start_date' => now()->subWeek()->toDateString()]);
        Sanctum::actingAs($this->employerModel());
        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $hire]))->assertCreated();
        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $hire, 'would_rehire' => 'maybe']))->assertOk();

        $notes = DB::table('notifications')->where('type', \App\Notifications\WorkerFeedbackReceivedNotification::class)->get();
        $this->assertCount(1, $notes, 'Told once, not on every edit.');
        $this->assertStringContainsString('Urdaneta Rice Mill Corp. left feedback about you', $notes[0]->data);

        // Locked: no ratings or comment until they review the workplace.
        Sanctum::actingAs($worker);
        $locked = $this->getJson('/api/seeker/reviews')->assertOk()->json('employer_feedback.0');
        $this->assertTrue($locked['locked']);
        $this->assertArrayNotHasKey('comment', $locked);
        $this->assertSame(now()->addDays(14)->toDateString(), $locked['visible_from']);

        // Writing their own Employment review unlocks it.
        $this->postJson('/api/seeker/reviews', [
            'type' => 'employment', 'application_id' => $hire, 'recommend' => true, 'agree_guidelines' => true, 'confirm_started' => true,
            'ratings' => ['work_environment' => 4, 'management' => 4, 'job_accuracy' => 4, 'overall' => 4],
        ])->assertCreated();
        $open = $this->getJson('/api/seeker/reviews')->json('employer_feedback.0');
        $this->assertFalse($open['locked']);
        $this->assertSame('Maybe', $open['would_rehire']);
        $this->assertSame('Always on time and quick to learn.', $open['comment']);
    }

    public function test_feedback_opens_by_itself_after_fourteen_days_and_hidden_feedback_never_shows(): void
    {
        $worker = $this->seeker('worker@example.test');
        $old = WorkerFeedback::create([
            'employer_id' => $this->employerId, 'seeker_id' => $worker->seeker_id,
            'ratings' => ['professionalism' => 4, 'communication' => 4, 'reliability' => 4, 'job_performance' => 4],
            'would_rehire' => 'yes', 'comment' => 'Good work.',
        ]);
        DB::table('worker_feedback')->where('id', $old->id)->update(['created_at' => now()->subDays(15)]);
        WorkerFeedback::create([
            'employer_id' => $this->employer('Pangasinan Bakeshop'), 'seeker_id' => $worker->seeker_id,
            'ratings' => ['professionalism' => 1, 'communication' => 1, 'reliability' => 1, 'job_performance' => 1],
            'would_rehire' => 'no', 'comment' => 'Not job-related remark.', 'status' => 'hidden',
        ]);
        Sanctum::actingAs($worker);

        $items = $this->getJson('/api/seeker/reviews')->json('employer_feedback');
        $this->assertCount(1, $items);
        $this->assertFalse($items[0]['locked']);
        $this->assertSame('Good work.', $items[0]['comment']);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function employerModel(): Employer
    {
        return Employer::find($this->employerId);
    }

    private function review(string $comment, string $status = 'published', ?int $employerId = null): int
    {
        $seeker = JobSeeker::forceCreate([
            'first_name' => 'R', 'last_name' => 'S', 'email' => uniqid('r').'@example.test', 'password' => 'x',
        ]);

        return EmployerReview::create([
            'employer_id' => $employerId ?? $this->employerId,
            'seeker_id' => $seeker->seeker_id,
            'type' => 'recruitment',
            'ratings' => ['communication' => 4, 'process' => 4, 'professionalism' => 4, 'posting_accuracy' => 4],
            'recommend' => true,
            'comment' => $comment,
            'status' => $status,
        ])->id;
    }

    private function payload(int $applicationId, ?string $comment = null): array
    {
        return [
            'type' => 'recruitment', 'application_id' => $applicationId, 'recommend' => true, 'agree_guidelines' => true, 'comment' => $comment,
            'ratings' => ['communication' => 5, 'process' => 5, 'professionalism' => 5, 'posting_accuracy' => 5],
        ];
    }

    private function workerPayload(array $overrides): array
    {
        return array_merge([
            'ratings' => ['professionalism' => 5, 'communication' => 4, 'reliability' => 5, 'job_performance' => 4],
            'would_rehire' => 'yes',
            'comment' => 'Always on time and quick to learn.',
        ], $overrides);
    }
}
