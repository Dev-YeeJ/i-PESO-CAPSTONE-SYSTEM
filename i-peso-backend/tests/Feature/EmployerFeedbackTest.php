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
use Illuminate\Support\Facades\Storage;
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
        (require database_path('migrations/2026_11_25_000001_make_worker_feedback_would_rehire_optional.php'))->up();

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

    public function test_reviews_are_one_list_that_can_be_filtered_to_those_needing_a_reply(): void
    {
        $replied = $this->review('Quick and fair.');
        $waiting = $this->review('Slow to answer.');
        // Written about working there before reviews were unified: same list, same counts.
        $older = $this->review('Good place to work.');
        EmployerReview::whereKey($older)->update(['type' => 'employment', 'ratings' => json_encode(['work_environment' => 4, 'management' => 4, 'job_accuracy' => 4, 'overall' => 4])]);
        Sanctum::actingAs($this->employerModel());

        $this->postJson("/api/employer/reviews/{$replied}/reply", ['body' => 'Thank you for applying with us.'])->assertOk();

        $ids = fn (string $query) => collect($this->getJson("/api/employer/reviews{$query}")->assertOk()->json('reviews.data'))->pluck('id')->sort()->values()->all();

        $this->assertSame(collect([$waiting, $older])->sort()->values()->all(), $ids('?filter=needs_reply'));
        $this->assertCount(3, $ids(''));
        // A type from an older client no longer splits the list.
        $this->assertCount(3, $ids('?type=recruitment'));

        $this->getJson('/api/employer/reviews')
            ->assertJsonPath('counts', ['all' => 3, 'needs_reply' => 2])
            ->assertJsonMissingPath('dispute_reasons')
            ->assertJsonMissingPath('reviews.data.0.dispute');
        $this->getJson('/api/employer/reviews?filter=disputed')->assertStatus(422);
    }

    public function test_the_summary_includes_how_many_people_gave_each_star_rating(): void
    {
        $this->review('Fine.');
        $this->review('Fine.');
        $this->review('Fine.');
        Sanctum::actingAs($this->employerModel());

        $this->getJson('/api/employer/reviews')
            ->assertJsonPath('summary.recruitment.enough', true)
            ->assertJsonPath('summary.recruitment.distribution', [
                ['stars' => 5, 'count' => 0], ['stars' => 4, 'count' => 3], ['stars' => 3, 'count' => 0],
                ['stars' => 2, 'count' => 0], ['stars' => 1, 'count' => 0],
            ]);
    }

    // ── Dispute ─────────────────────────────────────────────────────────────

    public function test_employers_can_no_longer_dispute_a_review(): void
    {
        $id = $this->review('They asked for a placement fee.');
        Sanctum::actingAs($this->employerModel());

        $this->postJson("/api/employer/reviews/{$id}/dispute", [
            'reason' => 'false_information', 'details' => 'We never charge applicants any fee; our records show no such request.',
        ])->assertNotFound();

        $this->assertSame('published', EmployerReview::find($id)->status);
        $this->assertSame(0, EmployerReviewFlag::where('reporter_type', 'employer')->count());
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

        // No "would you hire them again?" question: stars and an optional comment are enough.
        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $started]))
            ->assertCreated()
            ->assertJsonMissingPath('feedback.would_rehire')
            ->assertJsonPath('message', "Saved. Your comment stays private; the stars count toward the worker's rating.");
        $this->assertNull(WorkerFeedback::first()->would_rehire);

        // An answer sent by an older page is ignored.
        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $started, 'would_rehire' => 'no', 'comment' => 'Edited.']))
            ->assertOk()
            ->assertJsonPath('feedback.comment', 'Edited.');
        $this->assertNull(WorkerFeedback::first()->would_rehire);
        $this->assertSame(1, WorkerFeedback::count());
        $this->getJson('/api/employer/hires')->assertJsonMissingPath('would_rehire');

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

    // ── Hire photos ─────────────────────────────────────────────────────────

    public function test_hires_say_whether_a_photo_exists_and_which_application_they_came_from(): void
    {
        $withPhoto = $this->seeker('photo@example.test');
        $withPhoto->forceFill(['profile_image' => 'seeker_profile_images/1/a.jpg'])->save();
        $hired = $this->application($withPhoto, 'hired');
        $placed = $this->placement($this->seeker('placed@example.test'), $this->employerId, 'approved');
        Sanctum::actingAs($this->employerModel());

        $hires = collect($this->getJson('/api/employer/hires')->assertOk()->json('hires'));
        $application = $hires->firstWhere('source', 'application');
        $placement = $hires->firstWhere('source', 'placement');

        $this->assertTrue($application['has_photo']);
        $this->assertSame($hired, $application['application_id']);
        $this->assertFalse($placement['has_photo']);
        $this->assertSame($placed, $placement['source_id']);
        $this->assertNull($placement['application_id']);
    }

    public function test_employers_can_load_the_photo_of_anyone_they_hired(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('seeker_profile_images/hire.jpg', 'jpeg-bytes');
        $hired = $this->seekerWithPhoto('hired@example.test');
        $this->application($hired, 'hired');
        $placed = $this->seekerWithPhoto('placed@example.test');
        $this->placement($placed, $this->employerId, 'approved');
        Sanctum::actingAs($this->employerModel());

        $response = $this->get("/api/employer/hires/{$hired->seeker_id}/photo")->assertOk();
        $this->assertSame('inline', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));

        $this->get("/api/employer/hires/{$placed->seeker_id}/photo")->assertOk();
    }

    public function test_the_hire_photo_is_not_available_for_people_they_did_not_hire(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('seeker_profile_images/hire.jpg', 'jpeg-bytes');
        $applicant = $this->seekerWithPhoto('applicant@example.test');
        $this->application($applicant, 'reviewed');
        $pendingPlacement = $this->seekerWithPhoto('pending@example.test');
        $this->placement($pendingPlacement, $this->employerId, 'pending');
        $rejectedPlacement = $this->seekerWithPhoto('rejected@example.test');
        $this->placement($rejectedPlacement, $this->employerId, 'rejected');
        $elsewhere = $this->seekerWithPhoto('elsewhere@example.test');
        $this->placement($elsewhere, $this->employer('Pangasinan Bakeshop'), 'approved');
        $missingFile = $this->seeker('missing@example.test');
        $missingFile->forceFill(['profile_image' => 'seeker_profile_images/gone.jpg'])->save();
        $this->application($missingFile, 'hired');
        Sanctum::actingAs($this->employerModel());

        foreach ([$applicant, $pendingPlacement, $rejectedPlacement, $elsewhere, $missingFile] as $seeker) {
            $this->get("/api/employer/hires/{$seeker->seeker_id}/photo")->assertNotFound();
        }
    }

    public function test_the_seeker_reviews_page_gets_each_employers_logo(): void
    {
        DB::table('employers')->where('employer_id', $this->employerId)->update(['company_logo' => 'company_logos/rice.png']);
        $worker = $this->seeker('worker@example.test');
        $this->application($worker, 'reviewed');
        $this->review('Fair and organized.');
        EmployerReview::query()->latest('id')->first()->update(['seeker_id' => $worker->seeker_id]);
        WorkerFeedback::create([
            'employer_id' => $this->employerId, 'seeker_id' => $worker->seeker_id,
            'ratings' => ['professionalism' => 4, 'communication' => 4, 'reliability' => 4, 'job_performance' => 4],
            'would_rehire' => 'yes',
        ]);
        Sanctum::actingAs($worker);

        $this->getJson('/api/seeker/reviews')->assertOk()
            ->assertJsonPath('opportunities.0.employer.logo', 'company_logos/rice.png')
            ->assertJsonPath('employer_feedback.0.employer.logo', 'company_logos/rice.png')
            ->assertJsonPath('reviews.0.employer.logo', 'company_logos/rice.png');
    }

    // ── The worker's view (mutual reveal) ──────────────────────────────────

    public function test_the_worker_sees_employer_feedback_straight_away(): void
    {
        $worker = $this->seeker('worker@example.test');
        $hire = $this->application($worker, 'hired', ['placement_start_date' => now()->subWeek()->toDateString()]);
        Sanctum::actingAs($this->employerModel());
        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $hire]))->assertCreated();
        $this->postJson('/api/employer/worker-feedback', $this->workerPayload(['application_id' => $hire, 'comment' => 'Always on time and quick to learn.']))->assertOk();

        $notes = DB::table('notifications')->where('type', \App\Notifications\WorkerFeedbackReceivedNotification::class)->get();
        $this->assertCount(1, $notes, 'Told once, not on every edit.');
        $this->assertStringContainsString('Urdaneta Rice Mill Corp. left feedback about you', $notes[0]->data);
        $this->assertStringContainsString('Open My Reviews to read it.', $notes[0]->data);
        $this->assertStringNotContainsString('opens on', $notes[0]->data);

        // No waiting and no review needed: the ratings and comment show right away.
        Sanctum::actingAs($worker);
        $feedback = $this->getJson('/api/seeker/reviews')->assertOk()->json('employer_feedback.0');
        $this->assertFalse($feedback['locked']);
        $this->assertArrayNotHasKey('would_rehire', $feedback);
        $this->assertSame('Always on time and quick to learn.', $feedback['comment']);
    }

    public function test_older_feedback_shows_and_hidden_feedback_never_shows(): void
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

    private function seekerWithPhoto(string $email): JobSeeker
    {
        $seeker = $this->seeker($email);
        $seeker->forceFill(['profile_image' => 'seeker_profile_images/hire.jpg'])->save();

        return $seeker;
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
            'comment' => 'Always on time and quick to learn.',
        ], $overrides);
    }
}
