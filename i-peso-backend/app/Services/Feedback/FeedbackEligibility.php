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
 * application recorded in i-PESO, and each application gets ONE review of the
 * company's hiring process, open as soon as the seeker has applied.
 *
 * "Working here" (employment) reviews are no longer written. Ones written
 * earlier stay published and their authors can still edit or take them back.
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

        $applications = $seeker->applications()
            ->with('jobVacancy.employer')
            ->latest()
            ->get()
            ->filter(fn (Application $application) => $application->jobVacancy?->employer !== null);

        return $applications->map(function (Application $application) use ($byApplication) {
            $existing = $byApplication->get($application->apply_id, collect());
            $employer = $application->jobVacancy->employer;

            return [
                'source' => 'application',
                'source_id' => $application->apply_id,
                'employer' => ['id' => $employer->employer_id, 'name' => $employer->company_name, 'logo' => $employer->company_logo],
                'job_title' => $application->jobVacancy->job_title,
                'status' => $application->status,
                'recruitment' => $this->describe($this->recruitment($application), $existing),
                // Working-here reviews are no longer offered.
                'employment' => null,
                'review' => $this->summary($existing),
            ];
        })->values();
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
     * Which kinds of review this interaction allows: the hiring process, for an
     * application. (An older working-here review keeps its own kind when edited.)
     *
     * @return list<string>
     */
    public function allowedTypes(?Application $application, ?PlacementRecord $placement): array
    {
        return $application ? [FeedbackAspects::RECRUITMENT] : [];
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
