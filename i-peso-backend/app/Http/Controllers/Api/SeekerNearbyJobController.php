<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Services\JobMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SeekerNearbyJobController extends Controller
{
    public function getNearbyJobs(
        Request $request,
        JobMatchingService $matching
    ): JsonResponse {
        abort_unless(
            $request->user() instanceof JobSeeker,
            403,
            'Job seeker account required.'
        );

        /** @var JobSeeker $seeker */
        $seeker = $request->user();
        if ($seeker->latitude === null || $seeker->longitude === null) {
            return response()->json([
                'message' => 'Set your address location before searching for nearby jobs.',
                'code' => 'location_required',
            ], 422);
        }

        $validated = $request->validate([
            'radius_km' => ['nullable', 'numeric', 'min:1', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $radiusKm = (float) ($validated['radius_km'] ?? 15);
        $limit = (int) ($validated['limit'] ?? 20);
        $candidateLimit = min(100, max($limit, $limit * 5));
        if (Schema::hasTable('seeker_skills') && Schema::hasColumn('seeker_skills', 'skill_id')) {
            $seeker->loadMissing('seekerSkills:id,seeker_id,skill_id');
        }

        $with = ['employer:employer_id,company_name'];
        if (Schema::hasTable('job_vacancy_skills')) {
            $with[] = 'skillRequirements.skill.outgoingRelationships';
            $with[] = 'skillRequirements.skill.incomingRelationships';
        }

        $jobs = JobVacancy::query()
            ->with($with)
            ->where('status', 'active')
            ->where(function ($query) {
                $query
                    ->whereNull('application_deadline')
                    ->orWhereDate('application_deadline', '>=', today());
            })
            ->withinRadius(
                (float) $seeker->latitude,
                (float) $seeker->longitude,
                $radiusKm
            )
            ->limit($candidateLimit)
            ->get()
            ->map(function (JobVacancy $job) use ($matching, $seeker) {
                $match = $matching->score($job, $seeker);

                return [
                    'post_id' => $job->post_id,
                    'job_title' => $job->job_title,
                    'employer' => [
                        'employer_id' => $job->employer?->employer_id,
                        'company_name' => $job->employer?->company_name,
                    ],
                    'employment_type' => $job->employment_type,
                    'work_setup' => $job->work_setup,
                    'location' => $job->location,
                    'region' => $job->region,
                    'province' => $job->province,
                    'city_municipality' => $job->city_municipality,
                    'barangay' => $job->barangay,
                    'specific_address' => $job->specific_address,
                    'latitude' => $job->latitude,
                    'longitude' => $job->longitude,
                    'job_description' => $job->job_description,
                    'vacancies_count' => $job->vacancies_count,
                    'minimum_education' => $job->minimum_education,
                    'experience_level' => $job->experience_level,
                    'salary_min' => $job->salary_min,
                    'salary_max' => $job->salary_max,
                    'salary_type' => $job->salary_type,
                    'hide_salary' => $job->hide_salary,
                    'benefits' => $job->benefits,
                    'required_skills' => $job->required_skills,
                    'soft_skills' => $job->soft_skills,
                    'match' => $match,
                    'skill_match' => $match['factors']['skills']['details'],
                    'required_certifications' => $job->required_certifications,
                    'application_deadline' => $job->application_deadline?->toDateString(),
                    'open_to_pwds' => $job->open_to_pwds,
                    'open_to_senior_citizens' => $job->open_to_senior_citizens,
                    'spes_tupad_eligible' => $job->spes_tupad_eligible,
                    'distance_km' => round((float) $job->distance_km, 1),
                    'posted_at' => $job->created_at?->toISOString(),
                ];
            })
            ->sort(function (array $left, array $right) {
                $eligibility = ($right['match']['eligible'] <=> $left['match']['eligible']);
                if ($eligibility !== 0) {
                    return $eligibility;
                }

                $percentage = ($right['match']['percentage'] <=> $left['match']['percentage']);
                if ($percentage !== 0) {
                    return $percentage;
                }

                return $left['distance_km'] <=> $right['distance_km'];
            })
            ->take($limit)
            ->values();

        return response()->json([
            'radius_km' => $radiusKm,
            'origin' => [
                'latitude' => (float) $seeker->latitude,
                'longitude' => (float) $seeker->longitude,
            ],
            'count' => $jobs->count(),
            'jobs' => $jobs,
        ]);
    }
}
