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
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class EmployerReviewTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    private int $employerId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createStaffTables();
        $this->createHiringTables();
        (require database_path('migrations/2026_11_12_000001_create_employer_feedback_tables.php'))->up();

        $this->employerId = $this->employer('Urdaneta Rice Mill Corp.');
    }

    // ── Who can review what, and when ───────────────────────────────────────

    public function test_eligibility_follows_the_application_stage(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $fresh = $this->application($seeker, 'pending');
        $ignored = $this->application($seeker, 'pending', ['created_at' => now()->subDays(15)]);
        $reviewed = $this->application($seeker, 'reviewed');
        $hiredLater = $this->application($seeker, 'hired', ['placement_start_date' => now()->addDays(5)->toDateString()]);
        $hired = $this->application($seeker, 'hired', ['placement_start_date' => now()->subDay()->toDateString()]);
        Sanctum::actingAs($seeker);

        $items = collect($this->getJson('/api/seeker/reviews')->assertOk()->json('opportunities'))->keyBy('source_id');

        $this->assertFalse($items[$fresh]['recruitment']['allowed']);
        $this->assertNotNull($items[$fresh]['recruitment']['available_from']);
        $this->assertTrue($items[$ignored]['recruitment']['allowed']);
        $this->assertTrue($items[$ignored]['recruitment']['limited'], 'Ghosted applications get a communication-only review.');
        $this->assertTrue($items[$reviewed]['recruitment']['allowed']);
        $this->assertFalse($items[$reviewed]['recruitment']['limited']);
        $this->assertFalse($items[$reviewed]['employment']['allowed'], 'Only hires can review the workplace.');
        $this->assertFalse($items[$hiredLater]['employment']['allowed']);
        $this->assertTrue($items[$hired]['employment']['allowed']);
    }

    public function test_a_recruitment_review_publishes_and_only_once_per_application(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $application = $this->application($seeker, 'rejected');
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($application))
            ->assertCreated()
            ->assertJsonPath('review.status', 'published')
            ->assertJsonPath('review.reviewer', 'Verified applicant')
            ->assertJsonPath('review.job_title', 'Machine Operator');

        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($application))
            ->assertStatus(422)
            ->assertJsonPath('errors.type.0', 'You already reviewed this. You can edit your review instead.');

        $this->assertDatabaseHas('activity_logs', ['action' => 'submitted_employer_review']);
    }

    public function test_reviews_need_a_real_interaction_and_the_guidelines_agreement(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $someoneElse = $this->seeker('ben@example.test');
        $theirApplication = $this->application($someoneElse, 'reviewed');
        $pending = $this->application($seeker, 'pending');
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($theirApplication))
            ->assertStatus(422)->assertJsonPath('errors.type.0', 'That application was not found.');

        $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($pending))
            ->assertStatus(422)->assertJsonValidationErrors('type');

        $reviewed = $this->application($seeker, 'reviewed');
        $this->postJson('/api/seeker/reviews', ['agree_guidelines' => false] + $this->recruitmentPayload($reviewed))
            ->assertStatus(422)->assertJsonValidationErrors('agree_guidelines');
    }

    public function test_a_ghosted_application_can_only_rate_communication_and_posting_accuracy(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $application = $this->application($seeker, 'pending', ['created_at' => now()->subDays(20)]);
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/reviews', [
            'type' => 'recruitment', 'application_id' => $application, 'recommend' => false, 'agree_guidelines' => true,
            'ratings' => ['communication' => 1, 'posting_accuracy' => 3, 'process' => 5, 'professionalism' => 5],
        ])
            ->assertCreated()
            ->assertJsonPath('review.limited', true)
            ->assertJsonCount(2, 'review.ratings');

        $this->assertSame(['communication' => 1, 'posting_accuracy' => 3], EmployerReview::first()->ratings);
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

    public function test_employment_reviews_need_a_started_hire_and_confirmation(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $notYet = $this->application($seeker, 'hired', ['placement_start_date' => now()->addWeek()->toDateString()]);
        $started = $this->application($seeker, 'hired', ['placement_start_date' => now()->subWeek()->toDateString()]);
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/reviews', $this->employmentPayload(['application_id' => $notYet]))
            ->assertStatus(422)->assertJsonPath('errors.type.0', 'Available from your start date.');

        $this->postJson('/api/seeker/reviews', ['confirm_started' => null] + $this->employmentPayload(['application_id' => $started]))
            ->assertStatus(422)->assertJsonValidationErrors('confirm_started');

        $this->postJson('/api/seeker/reviews', $this->employmentPayload(['application_id' => $started]))
            ->assertCreated()
            ->assertJsonPath('review.reviewer', 'Verified employee');
    }

    public function test_hires_from_approved_placement_reports_can_be_reviewed(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $otherEmployer = $this->employer('Pangasinan Bakeshop');
        $approved = $this->placement($seeker, $otherEmployer, 'approved');
        $pendingReport = $this->placement($seeker, $otherEmployer, 'pending_review');
        // Already hired by the first employer through the tracker: no second employment entry.
        $this->application($seeker, 'hired', ['placement_start_date' => now()->subMonth()->toDateString()]);
        $duplicate = $this->placement($seeker, $this->employerId, 'approved');
        Sanctum::actingAs($seeker);

        $placements = collect($this->getJson('/api/seeker/reviews')->json('opportunities'))->where('source', 'placement');
        $this->assertSame([$approved], $placements->pluck('source_id')->all());

        $this->postJson('/api/seeker/reviews', $this->employmentPayload(['placement_record_id' => $approved]))->assertCreated();
        $this->postJson('/api/seeker/reviews', $this->employmentPayload(['placement_record_id' => $pendingReport]))
            ->assertStatus(422)->assertJsonPath('errors.type.0', 'That hire was not found.');
        $this->assertNotNull($duplicate);
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

    public function test_other_job_seekers_can_report_a_review_and_three_reports_hold_it(): void
    {
        $author = $this->seeker('author@example.test');
        Sanctum::actingAs($author);
        $id = $this->postJson('/api/seeker/reviews', $this->recruitmentPayload($this->application($author, 'reviewed')))->json('review.id');

        $this->postJson("/api/seeker/reviews/{$id}/report", ['reason' => 'harassment'])
            ->assertStatus(422)->assertJsonPath('message', 'You can edit or take back your own review instead.');

        foreach (['r1', 'r2'] as $name) {
            Sanctum::actingAs($this->seeker("{$name}@example.test"));
            $this->postJson("/api/seeker/reviews/{$id}/report", ['reason' => 'false_information', 'details' => 'Never happened.'])->assertOk();
        }
        $this->postJson("/api/seeker/reviews/{$id}/report", ['reason' => 'harassment'])
            ->assertStatus(422)->assertJsonPath('message', 'You already reported this review. PESO is looking into it.');
        $this->assertSame('published', EmployerReview::find($id)->status, 'Two reports keep it up while PESO looks.');

        Sanctum::actingAs($this->seeker('r3@example.test'));
        $this->postJson("/api/seeker/reviews/{$id}/report", ['reason' => 'not_genuine'])->assertOk();
        $this->assertSame('held', EmployerReview::find($id)->status);
        $this->assertSame(3, EmployerReviewFlag::where('reporter_type', 'seeker')->count());
        $this->assertDatabaseHas('activity_logs', ['action' => 'reported_employer_review']);

        // Held reviews can't be reported further (they're no longer public).
        Sanctum::actingAs($this->seeker('r4@example.test'));
        $this->postJson("/api/seeker/reviews/{$id}/report", ['reason' => 'other'])->assertNotFound();
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

    public function test_hires_are_invited_to_review_the_workplace_once_they_start(): void
    {
        $seeker = $this->seeker('ana@example.test');
        $started = $this->application($seeker, 'hired', ['placement_start_date' => now()->subDays(2)->toDateString()]);
        $this->application($seeker, 'hired', ['placement_start_date' => now()->addDays(3)->toDateString()]);
        $this->application($seeker, 'hired', ['placement_start_date' => now()->subDays(90)->toDateString()]); // too long ago

        $this->artisan('reviews:invite-employment')->assertSuccessful();
        $this->artisan('reviews:invite-employment')->assertSuccessful(); // the next day: no repeat

        $invites = DB::table('notifications')->where('type', ReviewInvitationNotification::class)->get();
        $this->assertCount(1, $invites);
        $this->assertStringContainsString("application-{$started}-employment", $invites[0]->data);
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

    private function employer(string $name, string $status = 'verified'): int
    {
        return DB::table('employers')->insertGetId([
            'company_name' => $name, 'email' => strtolower(preg_replace('/\W+/', '', $name)).'@example.test',
            'verification_status' => $status, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function seeker(string $email): JobSeeker
    {
        return JobSeeker::forceCreate([
            'first_name' => 'Test', 'last_name' => 'Seeker', 'email' => $email, 'password' => 'password123',
        ]);
    }

    private function application(JobSeeker $seeker, string $status, array $extra = []): int
    {
        $postId = DB::table('job_vacancies')->insertGetId([
            'employer_id' => $this->employerId, 'job_title' => 'Machine Operator', 'status' => 'active',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return DB::table('applications')->insertGetId(array_merge([
            'post_id' => $postId, 'seeker_id' => $seeker->seeker_id, 'status' => $status,
            'created_at' => now(), 'updated_at' => now(),
        ], $extra));
    }

    private function placement(JobSeeker $seeker, int $employerId, string $reportStatus): int
    {
        $upload = DB::table('placement_report_uploads')->insertGetId([
            'employer_id' => $employerId, 'status' => $reportStatus, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return DB::table('placement_records')->insertGetId([
            'upload_id' => $upload, 'employer_id' => $employerId, 'seeker_id' => $seeker->seeker_id,
            'position' => 'Baker', 'date_hired' => now()->subMonth()->toDateString(), 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function createHiringTables(): void
    {
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

        foreach (['job_seekers', 'employers'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::create('employers', function (Blueprint $table) {
            $table->id('employer_id');
            $table->string('company_name');
            $table->string('email')->unique();
            $table->string('verification_status')->default('pending');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id('seeker_id');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('password');
            $table->timestamps();
        });

        Schema::create('job_vacancies', function (Blueprint $table) {
            $table->id('post_id');
            $table->unsignedBigInteger('employer_id');
            $table->string('job_title');
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id('apply_id');
            $table->unsignedBigInteger('post_id');
            $table->unsignedBigInteger('seeker_id');
            $table->string('status');
            $table->date('placement_start_date')->nullable();
            $table->timestamp('status_changed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('placement_report_uploads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employer_id');
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('placement_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('upload_id');
            $table->unsignedBigInteger('employer_id');
            $table->unsignedBigInteger('seeker_id')->nullable();
            $table->string('position')->nullable();
            $table->date('date_hired')->nullable();
            $table->timestamps();
        });
    }
}
