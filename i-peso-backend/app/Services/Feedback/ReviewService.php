<?php

namespace App\Services\Feedback;

use App\Models\Application;
use App\Models\EmployerReview;
use App\Models\EmployerReviewFlag;
use App\Models\JobSeeker;
use App\Models\PlacementRecord;
use App\Support\FeedbackAspects;
use Illuminate\Validation\ValidationException;

/** Writing, editing and taking back a job seeker's review, under the eligibility rules. */
class ReviewService
{
    public function __construct(private readonly FeedbackEligibility $eligibility) {}

    /**
     * @param  array{type: string, application_id?: int, placement_record_id?: int, ratings: array, recommend: bool, comment?: ?string}  $data
     */
    public function submit(JobSeeker $seeker, array $data, ?string $ip): EmployerReview
    {
        [$employerId, $limited, $source] = $this->resolveInteraction($seeker, $data);

        $existing = EmployerReview::query()
            ->where('type', $data['type'])
            ->where($source)
            ->exists();
        if ($existing) {
            throw ValidationException::withMessages([
                'type' => 'You already reviewed this. You can edit your review instead.',
            ]);
        }

        $ratings = $this->validatedRatings($data['type'], $limited, $data['ratings'] ?? []);
        $comment = $this->cleanComment($data['comment'] ?? null);
        $reasons = ContentScreen::check($comment);

        $review = EmployerReview::create([
            'employer_id' => $employerId,
            'seeker_id' => $seeker->seeker_id,
            ...$source,
            'type' => $data['type'],
            'ratings' => $ratings,
            'recommend' => (bool) $data['recommend'],
            'comment' => $comment,
            'limited' => $limited,
            'status' => $reasons === [] ? EmployerReview::PUBLISHED : EmployerReview::HELD,
            'hold_reason' => ContentScreen::describe($reasons),
            'submitted_ip' => $ip,
        ]);

        $this->flagForPeso($review, $reasons);

        return $review;
    }

    /**
     * Edits keep the same review (one per interaction). A review PESO hid
     * goes back to PESO instead of reappearing on its own.
     */
    public function update(EmployerReview $review, array $data): EmployerReview
    {
        $ratings = $this->validatedRatings($review->type, $review->limited, $data['ratings'] ?? []);
        $comment = $this->cleanComment($data['comment'] ?? null);
        $reasons = ContentScreen::check($comment);

        $wasHidden = $review->status === EmployerReview::HIDDEN;

        $status = match (true) {
            $reasons !== [] => EmployerReview::HELD,
            $wasHidden => EmployerReview::HELD,
            default => EmployerReview::PUBLISHED,
        };

        $review->update([
            'ratings' => $ratings,
            'recommend' => (bool) $data['recommend'],
            'comment' => $comment,
            'status' => $status,
            'hold_reason' => ContentScreen::describe($reasons) ?? ($wasHidden ? 'Edited after PESO hid it' : null),
            'edited_at' => now(),
        ]);

        if ($reasons !== []) {
            $this->flagForPeso($review, $reasons);
        } elseif ($wasHidden) {
            EmployerReviewFlag::create([
                'review_id' => $review->id,
                'reporter_type' => EmployerReviewFlag::BY_SYSTEM,
                'reason' => 'other',
                'details' => 'The reviewer edited this review after PESO hid it. Check it again.',
            ]);
        }

        return $review;
    }

    /** @return array{0: int, 1: bool, 2: array} [employer id, limited, source columns] */
    private function resolveInteraction(JobSeeker $seeker, array $data): array
    {
        $type = $data['type'];

        if (! empty($data['application_id'])) {
            $application = Application::query()
                ->with('jobVacancy')
                ->where('apply_id', $data['application_id'])
                ->where('seeker_id', $seeker->seeker_id)
                ->first();

            if (! $application || ! $application->jobVacancy) {
                $this->deny('That application was not found.');
            }

            $rule = $type === FeedbackAspects::RECRUITMENT
                ? $this->eligibility->recruitment($application)
                : $this->eligibility->employmentFromApplication($application);

            if (! $rule['allowed']) {
                $this->deny($rule['reason']);
            }

            return [$application->jobVacancy->employer_id, (bool) ($rule['limited'] ?? false), ['application_id' => $application->apply_id]];
        }

        if (! empty($data['placement_record_id'])) {
            if ($type !== FeedbackAspects::EMPLOYMENT) {
                $this->deny('Placement-report hires can only get an Employment review.');
            }

            $record = $this->eligibility->linkedPlacements($seeker)->firstWhere('id', (int) $data['placement_record_id']);
            if (! $record) {
                $this->deny('That hire was not found.');
            }

            $rule = $this->eligibility->employmentFromPlacement($record);
            if (! $rule['allowed']) {
                $this->deny($rule['reason']);
            }

            return [$record->employer_id, false, ['placement_record_id' => $record->id]];
        }

        $this->deny('Choose the application or job this review is about.');
    }

    private function validatedRatings(string $type, bool $limited, array $ratings): array
    {
        $aspects = FeedbackAspects::forReview($type, $limited);
        $clean = [];
        $errors = [];

        foreach ($aspects as $key => $label) {
            $value = $ratings[$key] ?? null;
            if (! is_numeric($value) || (int) $value != $value || $value < 1 || $value > 5) {
                $errors["ratings.{$key}"] = "Rate {$label} from 1 to 5 stars.";

                continue;
            }
            $clean[$key] = (int) $value;
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $clean;
    }

    private function cleanComment(?string $comment): ?string
    {
        $comment = trim((string) $comment);

        return $comment === '' ? null : $comment;
    }

    private function flagForPeso(EmployerReview $review, array $reasons): void
    {
        if ($reasons === []) {
            return;
        }

        EmployerReviewFlag::create([
            'review_id' => $review->id,
            'reporter_type' => EmployerReviewFlag::BY_SYSTEM,
            'reason' => in_array('contact_details', $reasons, true) ? 'personal_information' : (in_array('profanity', $reasons, true) ? 'harassment' : 'other'),
            'details' => 'Automatic check: '.ContentScreen::describe($reasons).'.',
        ]);
    }

    private function deny(string $message): never
    {
        throw ValidationException::withMessages(['type' => $message]);
    }
}
