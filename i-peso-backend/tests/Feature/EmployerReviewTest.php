<?php

namespace Tests\Feature;

use App\Events\ApplicationStatusChanged;
use App\Models\Application;
use App\Models\EmployerReview;
use App\Models\EmployerReviewFlag;
use App\Models\JobSeeker;
use App\Notifications\ReviewInvitationNotification;
use App\Services\Feedback\ContentScreen;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesFeedbackTables;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class EmployerReviewTest extends TestCase
{
    use CreatesFeedbackTables, CreatesStaffTables, DatabaseTransactions;

    private int $employerId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();
        $this->createHiringTables();
        (require database_path('migrations/2026_11_12_000001_create_employer_feedback_tables.php'))->up();
        (require database_path('migrations/2026_11_25_000001_make_worker_feedback_would_rehire_optional.php'))->up();

        $this->employerId = $this->employer('Urdaneta Rice Mill Corp.');
    }

    // ── Who can review what, and when ───────────────────────────────────────

    public function test_any_application_can_review_the_hiring_process_and_nothing_offers_working_here(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $justApplied = $this->application($seeker, 'pending');
        $hired = $this->application($seeker, 'hired', ['placement_start_date' => now()->subDay()->toDateString()]);
        $this->placement($seeker, $this->employer('Pangasinan Bakeshop'), 'approved');
        Sanctum::actingAs($seeker);

        $items = collect($this->getJson('/api/seeker/reviews')->assertOk()->json('opportunities'));
        $this->assertSame(['application'], $items->pluck('source')->unique()->values()->all(), 'Placement hires only had working-here reviews, so they are no longer listed.');
        foreach ([$justApplied, $hired] as $id) {
            $item = $items->firstWhere('source_id', $id);
            $this->assertTrue($item['recruitment']['allowed'], 'The hiring process can be reviewed as soon as you apply.');
            $this->assertNull($item['employment'], 'Working-here reviews are no longer offered, even to hires.');
        }
    }

    public function test_one_review_per_application_about_the_hiring_process(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $application = $this->application($seeker, 'hired', ['placement_start_date' => now()->subDay()->toDateString()]);
        Sanctum::actingAs($seeker);

        // A working-here review is refused, even from a hire.
        $this->postJson('/api/seeker/reviews', $this->employmentPayload(['application_id' => $application]))
            ->assertStatus(422)->assertJsonPath('errors.type.0', "Reviews are about the company's hiring process.");

        // No type needed: it is a hiring-process review.
        $payload = $this->recruitmentPayload($application);
        unset($payload['type']);
        $this->postJson('/api/seeker/reviews', $payload)
            ->assertCreated()
            ->assertJsonPath('review.type', 'recruitment')
            ->assertJsonPath('review.reviewer', 'Verified applicant')
            ->assertJsonPath('review.allowed_types', ['recruitment']);

        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($application))->assertStatus(422);
        $this->assertSame(1, EmployerReview::query()->count());
        $this->assertDatabaseHas('activity_logs', ['action' => 'submitted_employer_review']);
    }

    public function test_an_older_working_here_review_stays_published_and_editable(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $application = $this->application($seeker, 'hired', ['placement_start_date' => now()->subMonth()->toDateString()]);
        Sanctum::actingAs($seeker);
        $id = $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($application))->json('review.id');
        $working = ['work_environment' => 4, 'management' => 3, 'job_accuracy' => 4, 'overall' => 4];
        EmployerReview::whereKey($id)->update(['type' => 'employment', 'ratings' => json_encode($working)]);

        // Its author can still edit it with its own aspects, and it stays a working-here review.
        $this->putJson("/api/seeker/reviews/{$id}", ['recommend' => true, 'ratings' => ['overall' => 5] + $working])
            ->assertOk()->assertJsonPath('review.type', 'employment')->assertJsonPath('review.reviewer', 'Verified employee');
        // It can be switched to a hiring-process review (the only kind written now).
        $this->putJson("/api/seeker/reviews/{$id}", ['type' => 'recruitment', 'recommend' => true, 'ratings' => $this->recruitmentRatings()])
            ->assertOk()->assertJsonPath('review.type', 'recruitment');
    }

    public function test_reviews_need_a_real_interaction_and_the_guidelines_agreement(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $someoneElse = $this->seeker('ben@example.test');
        $theirApplication = $this->application($someoneElse, 'reviewed');
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($theirApplication))
            ->assertStatus(422)->assertJsonPath('errors.type.0', 'That application was not found.');

        $reviewed = $this->application($seeker, 'reviewed');
        $this->postJson('/api/seeker/reviews', ['agree_guidelines' => false] + $this->recruitmentPayload($reviewed))
            ->assertStatus(422)->assertJsonValidationErrors('agree_guidelines');
    }

    public function test_an_older_limited_review_stays_editable_and_can_be_completed(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $application = $this->application($seeker, 'pending');
        Sanctum::actingAs($seeker);
        $id = $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($application))->json('review.id');
        // As written under the old rule for an unanswered application.
        EmployerReview::whereKey($id)->update(['limited' => true, 'ratings' => json_encode(['communication' => 1, 'posting_accuracy' => 3])]);

        $this->putJson("/api/seeker/reviews/{$id}", ['recommend' => false, 'ratings' => ['communication' => 2, 'posting_accuracy' => 3]])
            ->assertOk()->assertJsonPath('review.limited', true);
        $this->putJson("/api/seeker/reviews/{$id}", ['recommend' => false, 'ratings' => $this->recruitmentRatings()])
            ->assertOk()->assertJsonPath('review.limited', false)->assertJsonCount(4, 'review.ratings');
    }

    public function test_every_aspect_needs_one_to_five_stars(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $application = $this->application($seeker, 'interview');
        Sanctum::actingAs($seeker);

        $payload = $this->recruitmentPayload($application);
        $payload['ratings']['process'] = 7;
        unset($payload['ratings']['communication']);

        $this->postJson('/api/seeker/reviews', $payload)
            ->assertStatus(422)
            ->assertJsonPath('errors', fn ($errors) => isset($errors['ratings.process'], $errors['ratings.communication']));
    }

    // ── Automatic checks and editing ────────────────────────────────────────

    public function test_comments_with_contact_details_or_profanity_wait_for_peso(): void
    {
        $seeker = $this->seeker('ana@example.test');
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($seeker, 'reviewed'), 'Call the HR at 0917 123 4567 to complain.'))
            ->assertCreated()->assertJsonPath('review.status', 'held');
        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($seeker, 'reviewed'), 'Ang gago ng interviewer.'))
            ->assertCreated()->assertJsonPath('review.status', 'held');
        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($seeker, 'reviewed'), 'Clear schedule and a respectful interviewer.'))
            ->assertCreated()->assertJsonPath('review.status', 'published');

        $this->assertSame(2, EmployerReviewFlag::where('reporter_type', 'system')->count());
        $this->assertSame(['personal_information', 'harassment'], EmployerReviewFlag::orderBy('id')->pluck('reason')->all());
    }

    public function test_the_content_check_doesnt_catch_ordinary_words(): void
    {
        $this->assertSame([], ContentScreen::check('The process took three weeks. Good luck to all applicants!'));
        $this->assertSame(['link'], ContentScreen::check('See www.example.com for details'));
        $this->assertSame(['contact_details'], ContentScreen::check('Email me at juan@gmail.com'));
    }

    public function test_editing_a_hidden_review_sends_it_back_to_peso(): void
    {
        $seeker = $this->seeker('ana@example.test');
        Sanctum::actingAs($seeker);
        $id = $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($seeker, 'reviewed')))->json('review.id');

        $this->putJson("/api/seeker/reviews/{$id}", ['ratings' => $this->recruitmentRatings(2), 'recommend' => false, 'comment' => 'Changed my mind.'])
            ->assertOk()
            ->assertJsonPath('review.status', 'published')
            ->assertJsonPath('review.edited', true);

        EmployerReview::whereKey($id)->update(['status' => 'hidden', 'moderation_note' => 'Contained a rumour.']);
        $this->putJson("/api/seeker/reviews/{$id}", ['ratings' => $this->recruitmentRatings(2), 'recommend' => false, 'comment' => 'Fixed wording.'])
            ->assertOk()
            ->assertJsonPath('review.status', 'held');

        $this->assertDatabaseHas('employer_review_flags', ['review_id' => $id, 'reporter_type' => 'system']);
    }

    public function test_only_the_author_can_edit_or_take_back_a_review(): void
    {
        $author = $this->seeker('ana@example.test');
        Sanctum::actingAs($author);
        $id = $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($author, 'reviewed')))->json('review.id');

        Sanctum::actingAs($this->seeker('ben@example.test'));
        $this->deleteJson("/api/seeker/reviews/{$id}")->assertNotFound();
        $this->putJson("/api/seeker/reviews/{$id}", ['ratings' => $this->recruitmentRatings(1), 'recommend' => false])->assertNotFound();

        Sanctum::actingAs($author);
        $this->deleteJson("/api/seeker/reviews/{$id}")->assertOk();
        $this->assertSame(0, EmployerReview::count());
    }

    // ── What job seekers see about a company ────────────────────────────────

    public function test_the_summary_waits_for_three_people_and_counts_each_person_once(): void
    {
        $reviewers = collect(['a', 'b'])->map(fn ($name) => $this->seeker("{$name}@example.test"));
        foreach ($reviewers as $seeker) {
            Sanctum::actingAs($seeker);
            $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($seeker, 'reviewed')))->assertCreated();
        }
        // The same person reviewing a second application doesn't make three.
        Sanctum::actingAs($reviewers[0]);
        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($reviewers[0], 'rejected')))->assertCreated();

        $viewer = $this->seeker('viewer@example.test');
        Sanctum::actingAs($viewer);
        $this->getJson("/api/seeker/employers/{$this->employerId}/reviews")
            ->assertOk()
            ->assertJsonPath('summary.recruitment.enough', false)
            ->assertJsonPath('summary.recruitment.reviewers', 2)
            ->assertJsonCount(3, 'reviews.data');

        $third = $this->seeker('c@example.test');
        Sanctum::actingAs($third);
        $this->postJson('/api/seeker/reviews', [
            'type' => 'recruitment', 'application_id' => $this->application($third, 'interview'), 'recommend' => false, 'agree_guidelines' => true,
            'ratings' => ['communication' => 2, 'process' => 2, 'professionalism' => 5, 'posting_accuracy' => 2],
        ])->assertCreated();

        Sanctum::actingAs($viewer);
        $summary = $this->getJson("/api/seeker/employers/{$this->employerId}/reviews")->json('summary.recruitment');

        $this->assertTrue($summary['enough']);
        $this->assertSame(3, $summary['reviewers']);
        $this->assertSame(67, $summary['recommend_percent']);
        // Latest review per person: 5, 5 and 2 stars.
        $this->assertEquals(4.0, $summary['aspects']['communication']['average']);
        $this->assertContains('professionalism', $summary['strengths']);
        $this->assertSame([], $summary['to_improve']);
    }

    public function test_public_reviews_are_anonymous_and_only_for_verified_employers(): void
    {
        $seeker = $this->seeker('ana@example.test');
        Sanctum::actingAs($seeker);
        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($seeker, 'rejected'), 'Organized and fair.'))->assertCreated();

        $review = $this->getJson("/api/seeker/employers/{$this->employerId}/reviews")->json('reviews.data.0');
        $this->assertSame('Verified applicant', $review['reviewer']);
        $this->assertArrayNotHasKey('job_title', $review);
        $this->assertArrayNotHasKey('seeker_id', $review);
        $this->assertArrayNotHasKey('status', $review);

        $unverified = $this->employer('Pending Verification Inc.', 'pending');
        $this->getJson("/api/seeker/employers/{$unverified}/reviews")->assertNotFound();
    }

    // ── Reporting a review, job-card ratings ────────────────────────────────

    public function test_job_seekers_can_no_longer_report_a_review(): void
    {
        $author = $this->seeker('author@example.test');
        Sanctum::actingAs($author);
        $id = $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($author, 'reviewed')))->json('review.id');

        Sanctum::actingAs($this->seeker('other@example.test'));
        $this->postJson("/api/seeker/reviews/{$id}/report", ['reason' => 'false_information'])->assertNotFound();
        $this->assertSame('published', EmployerReview::find($id)->status);
        $this->assertSame(0, EmployerReviewFlag::where('reporter_type', 'seeker')->count());
    }

    public function test_the_company_shows_one_summary_and_list_of_both_kinds_of_review(): void
    {
        foreach (['a', 'b', 'c'] as $name) {
            $seeker = $this->seeker("{$name}@example.test");
            Sanctum::actingAs($seeker);
            $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($seeker, 'reviewed')))->assertCreated();
        }
        // One of them was written about working there, before reviews were unified.
        EmployerReview::query()->latest('id')->first()->update(['type' => 'employment', 'ratings' => ['work_environment' => 3, 'management' => 3, 'job_accuracy' => 3, 'overall' => 3]]);

        $response = $this->getJson("/api/seeker/employers/{$this->employerId}/reviews")->assertOk();
        $response->assertJsonPath('summary.overall.reviewers', 3)
            ->assertJsonPath('summary.overall.enough', true)
            // (5 + 5 + 3) / 3: each review's own average counts once.
            ->assertJsonPath('summary.overall.average', 4.3)
            ->assertJsonPath('summary.overall.aspects.communication.ratings', 2)
            ->assertJsonPath('summary.overall.aspects.work_environment.ratings', 1)
            ->assertJsonCount(3, 'reviews.data');
        // Older app builds read summary.recruitment and pass ?type=recruitment: they get the unified list.
        $this->assertSame($response->json('summary.overall'), $response->json('summary.recruitment'));
        $this->getJson("/api/seeker/employers/{$this->employerId}/reviews?type=recruitment")->assertJsonCount(3, 'reviews.data');
    }

    public function test_job_cards_get_a_rating_only_from_three_people(): void
    {
        $quiet = $this->employer('Small Sari-Sari Store');
        foreach (['a', 'b', 'c'] as $name) {
            $seeker = $this->seeker("{$name}@example.test");
            Sanctum::actingAs($seeker);
            $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($seeker, 'reviewed')))->assertCreated();
        }

        $ratings = $this->getJson("/api/seeker/employer-ratings?ids[]={$this->employerId}&ids[]={$quiet}")->assertOk()->json('ratings');

        $this->assertEquals(['average' => 5.0, 'reviewers' => 3], $ratings[$this->employerId]);
        $this->assertArrayNotHasKey($quiet, $ratings);
    }

    // ── Invitations ─────────────────────────────────────────────────────────

    public function test_a_decision_invites_the_applicant_once_and_not_after_reviewing(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $application = Application::with('jobSeeker', 'jobVacancy.employer')->find($this->application($seeker, 'rejected'));

        event(new ApplicationStatusChanged($application));
        event(new ApplicationStatusChanged($application)); // e.g. a repeated save

        $invites = DB::table('notifications')->where('type', ReviewInvitationNotification::class)->get();
        $this->assertCount(1, $invites);
        $data = json_decode($invites[0]->data, true);
        $this->assertSame('How was applying to Urdaneta Rice Mill Corp.?', $data['title']);
        $this->assertSame("/seeker/reviews?review=application-{$application->apply_id}-recruitment", $data['action_url']);

        // Something already reviewed never gets an invitation.
        $reviewed = Application::with('jobSeeker', 'jobVacancy.employer')->find($this->application($seeker, 'rejected'));
        Sanctum::actingAs($seeker);
        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($reviewed->apply_id))->assertCreated();
        event(new ApplicationStatusChanged($reviewed));
        $this->assertSame(1, DB::table('notifications')->where('type', ReviewInvitationNotification::class)->count());
    }

    public function test_hires_are_no_longer_invited_to_review_the_workplace(): void
    {
        $this->assertArrayNotHasKey('reviews:invite-employment', \Illuminate\Support\Facades\Artisan::all());
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function recruitmentRatings(int $stars = 5): array
    {
        return ['communication' => $stars, 'process' => $stars, 'professionalism' => $stars, 'posting_accuracy' => $stars];
    }

    private function recruitmentPayload(int $applicationId, ?string $comment = null): array
    {
        return [
            'type' => 'recruitment', 'application_id' => $applicationId, 'ratings' => $this->recruitmentRatings(),
            'recommend' => true, 'comment' => $comment, 'agree_guidelines' => true,
        ];
    }

    private function employmentPayload(array $source): array
    {
        return $source + [
            'type' => 'employment', 'recommend' => true, 'agree_guidelines' => true, 'confirm_started' => true,
            'ratings' => ['work_environment' => 4, 'management' => 3, 'job_accuracy' => 4, 'overall' => 4],
        ];
    }

}
