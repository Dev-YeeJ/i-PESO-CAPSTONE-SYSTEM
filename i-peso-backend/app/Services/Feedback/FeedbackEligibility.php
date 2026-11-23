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
 * interaction recorded in i-PESO, and each interaction gets ONE review: the
 * seeker chooses whether it is about the hiring process or about working there.
 *
 *  - Hiring process (recruitment): open as soon as the seeker has applied, with
 *    every hiring aspect, whatever stage the application is at.
 *  - Working there (employment): only for verified hires whose start date has
 *    arrived — an application marked Hired, or a placement-report row PESO
 *    linked to the seeker (for hires made outside the applicant tracker).
 *
 * Job fair results are names on a form, not linked to accounts, so they
 * can't verify anything and aren't used.
 */
class FeedbackEligibility
{
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
            $existing = $byApplication->get($application->apply_id, collect());
            $employer = $application->jobVacancy->employer;

            return [
                'source' => 'application',
                'source_id' => $application->apply_id,
                'employer' => ['id' => $employer->employer_id, 'name' => $employer->company_name],
                'job_title' => $application->jobVacancy->job_title,
                'status' => $application->status,
                'recruitment' => $this->describe($this->recruitment($application), $existing),
                'employment' => $this->describe($this->employmentFromApplication($application), $existing),
                'review' => $this->summary($existing),
            ];
        })->values();

        // Hires PESO linked from placement reports, unless the same employer
        // already hired them through the applicant tracker (one employment
        // review per job, not two).
        $hiredEmployers = $applications->where('status', 'hired')->map(fn ($application) => $application->jobVacancy->employer_id)->unique();

        $placements = $this->linkedPlacements($seeker)
            ->reject(fn (PlacementRecord $record) => $hiredEmployers->contains($record->employer_id))
            ->map(function (PlacementRecord $record) use ($byPlacement) {
                $existing = $byPlacement->get($record->id, collect());

                return [
                    'source' => 'placement',
                    'source_id' => $record->id,
                    'employer' => ['id' => $record->employer_id, 'name' => $record->employer?->company_name],
                    'job_title' => $record->position,
                    'status' => 'hired',
                    'recruitment' => null,
                    'employment' => $this->describe($this->employmentFromPlacement($record), $existing),
                    'review' => $this->summary($existing),
                ];
            });

        return $items->concat($placements)->values();
    }

    /**
     * The hiring process can be reviewed from the moment the seeker applies,
     * with every hiring aspect.
     *
     * @return array{allowed: bool, limited: bool}
     */
    public function recruitment(Application $application): array
    {
        return ['allowed' => true, 'limited' => false];
    }

    /**
     * Which kinds of review this interaction allows right now.
     *
     * @return list<string>
     */
    public function allowedTypes(?Application $application, ?PlacementRecord $placement): array
    {
        if ($application) {
            return array_values(array_filter([
                FeedbackAspects::RECRUITMENT,
                $this->employmentFromApplication($application)['allowed'] ? FeedbackAspects::EMPLOYMENT : null,
            ]));
        }

        return $placement && $this->employmentFromPlacement($placement)['allowed'] ? [FeedbackAspects::EMPLOYMENT] : [];
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

    /**
     * One review per interaction: once the seeker reviewed it (either kind),
     * both kinds point at that review, so neither offers a new one.
     */
    private function describe(array $rule, Collection $existing): array
    {
        $review = $existing->sortByDesc('id')->first();

        return $rule + ['review_id' => $review?->id, 'review_status' => $review?->status];
    }

    /** @return array{id: int, type: string, status: string}|null */
    private function summary(Collection $existing): ?array
    {
        $review = $existing->sortByDesc('id')->first();

        return $review ? ['id' => $review->id, 'type' => $review->type, 'status' => $review->status] : null;
    }
}
