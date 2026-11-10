<?php

namespace App\Services\Feedback;

use App\Models\Application;
use App\Models\EmployerReview;
use App\Models\JobSeeker;
use App\Models\PlacementRecord;
use App\Models\PlacementReportUpload;
use App\Support\FeedbackAspects;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Who may review which employer, and when. Every review comes from a real
 * interaction recorded in i-PESO:
 *
 *  - Recruitment Experience: an application the employer has acted on (any
 *    stage past Pending) or that the seeker withdrew. An application left at
 *    Pending for NO_RESPONSE_DAYS can get a limited review (communication and
 *    posting accuracy only) — that's how ghosting gets reported.
 *  - Employment Experience: a hire whose start date has arrived — either an
 *    application marked Hired, or a placement-report row PESO linked to the
 *    seeker (for hires made outside the applicant tracker).
 *
 * Job fair results are names on a form, not linked to accounts, so they
 * can't verify anything and aren't used.
 */
class FeedbackEligibility
{
    public const NO_RESPONSE_DAYS = 14;

    private const ACTED_ON = ['reviewed', 'shortlisted', 'interview', 'hired', 'rejected', 'withdrawn'];

    /**
     * Everything this seeker has done with employers, and what they can
     * review for each. Feeds the "Reviews" list on their side.
     *
     * @return Collection<int, array>
     */
    public function opportunitiesFor(JobSeeker $seeker): Collection
    {
        $reviews = EmployerReview::query()->where('seeker_id', $seeker->seeker_id)->get();
        $byApplication = $reviews->whereNotNull('application_id')->groupBy('application_id');
        $byPlacement = $reviews->whereNotNull('placement_record_id')->groupBy('placement_record_id');

        $applications = $seeker->applications()
            ->with('jobVacancy.employer')
            ->latest()
            ->get()
            ->filter(fn (Application $application) => $application->jobVacancy?->employer !== null);

        $items = $applications->map(function (Application $application) use ($byApplication) {
            $existing = $byApplication->get($application->apply_id, collect())->keyBy('type');
            $employer = $application->jobVacancy->employer;

            return [
                'source' => 'application',
                'source_id' => $application->apply_id,
                'employer' => ['id' => $employer->employer_id, 'name' => $employer->company_name],
                'job_title' => $application->jobVacancy->job_title,
                'status' => $application->status,
                'recruitment' => $this->describe($this->recruitment($application), $existing->get(FeedbackAspects::RECRUITMENT)),
                'employment' => $this->describe($this->employmentFromApplication($application), $existing->get(FeedbackAspects::EMPLOYMENT)),
            ];
        })->values();

        // Hires PESO linked from placement reports, unless the same employer
        // already hired them through the applicant tracker (one employment
        // review per job, not two).
        $hiredEmployers = $applications->where('status', 'hired')->map(fn ($application) => $application->jobVacancy->employer_id)->unique();

        $placements = $this->linkedPlacements($seeker)
            ->reject(fn (PlacementRecord $record) => $hiredEmployers->contains($record->employer_id))
            ->map(function (PlacementRecord $record) use ($byPlacement) {
                $existing = $byPlacement->get($record->id, collect())->keyBy('type');

                return [
                    'source' => 'placement',
                    'source_id' => $record->id,
                    'employer' => ['id' => $record->employer_id, 'name' => $record->employer?->company_name],
                    'job_title' => $record->position,
                    'status' => 'hired',
                    'recruitment' => null,
                    'employment' => $this->describe($this->employmentFromPlacement($record), $existing->get(FeedbackAspects::EMPLOYMENT)),
                ];
            });

        return $items->concat($placements)->values();
    }

    /** @return array{allowed: bool, limited?: bool, reason?: string, available_from?: string} */
    public function recruitment(Application $application): array
    {
        if (in_array($application->status, self::ACTED_ON, true)) {
            return ['allowed' => true, 'limited' => false];
        }

        $since = $application->created_at ?? now();
        $availableFrom = $since->copy()->addDays(self::NO_RESPONSE_DAYS);

        if ($application->status === 'pending' && $availableFrom->lte(now())) {
            return ['allowed' => true, 'limited' => true];
        }

        return [
            'allowed' => false,
            'reason' => 'Available once the employer responds to your application, or after '.self::NO_RESPONSE_DAYS.' days without a response.',
            'available_from' => $availableFrom->toDateString(),
        ];
    }

    public function employmentFromApplication(Application $application): array
    {
        if ($application->status !== 'hired') {
            return ['allowed' => false, 'reason' => 'Only for people this employer hired.'];
        }

        return $this->startedBy($application->placement_start_date);
    }

    public function employmentFromPlacement(PlacementRecord $record): array
    {
        return $this->startedBy($record->date_hired);
    }

    /** Placement-report rows PESO linked to this seeker, from approved reports. */
    public function linkedPlacements(JobSeeker $seeker): Collection
    {
        return PlacementRecord::query()
            ->with('employer')
            ->where('seeker_id', $seeker->seeker_id)
            ->whereHas('upload', fn ($query) => $query->where('status', PlacementReportUpload::STATUS_APPROVED))
            ->get()
            ->filter(fn (PlacementRecord $record) => $record->employer !== null)
            ->values();
    }

    private function startedBy(mixed $startDate): array
    {
        if (! $startDate) {
            return ['allowed' => true];
        }

        $start = Carbon::parse($startDate)->toDateString();
        $today = Carbon::now('Asia/Manila')->toDateString();

        return $start <= $today
            ? ['allowed' => true]
            : [
                'allowed' => false,
                'reason' => 'Available from your start date.',
                'available_from' => $start,
            ];
    }

    private function describe(array $rule, ?EmployerReview $existing): array
    {
        return $rule + ['review_id' => $existing?->id, 'review_status' => $existing?->status];
    }
}
