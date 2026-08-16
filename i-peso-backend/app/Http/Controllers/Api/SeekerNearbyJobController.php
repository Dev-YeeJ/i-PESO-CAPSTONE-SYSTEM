<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Services\EnhancedJobMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SeekerNearbyJobController extends Controller
{
    public function getNearbyJobs(
        Request $request,
        EnhancedJobMatchingService $matching
    ): JsonResponse {
        abort_unless(
            $request->user() instanceof JobSeeker,
            403,
            'Job seeker account required.'
        );

        // Query-string booleans arrive as text in browsers. Normalize the
        // supported forms before Laravel's strict boolean validation runs.
        foreach (['hide_low_match', 'hide_applied', 'coordinates_only', 'include_no_coordinates', 'saved_only', 'job_fair_only', 'upskill_recommended_only', 'certificate_match_only', 'can_apply_only', 'compact'] as $booleanFilter) {
            if ($request->has($booleanFilter)) {
                $request->merge([$booleanFilter => $request->boolean($booleanFilter)]);
            }
        }

        /** @var JobSeeker $seeker */
        $seeker = $request->user();

        $validated = $request->validate([
            'radius_km' => ['nullable', 'numeric', 'min:1', 'max:500'],
            'min_match' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'keyword' => ['nullable', 'string', 'max:100'],
            'location_keyword' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'string', 'in:distance,match,newest,salary'],
            'feed_mode' => ['nullable', 'string', 'in:nearby,recommended,latest'],
            'job_type' => ['nullable', 'string', 'max:60'],
            'salary_min' => ['nullable', 'numeric', 'min:0'],
            'salary_max' => ['nullable', 'numeric', 'min:0'],
            'hide_low_match' => ['nullable', 'boolean'],
            'hide_applied' => ['nullable', 'boolean'],
            'coordinates_only' => ['nullable', 'boolean'],
            'include_no_coordinates' => ['nullable', 'boolean'],
            'saved_only' => ['nullable', 'boolean'],
            'job_fair_only' => ['nullable', 'boolean'],
            'upskill_recommended_only' => ['nullable', 'boolean'],
            'certificate_match_only' => ['nullable', 'boolean'],
            'can_apply_only' => ['nullable', 'boolean'],
            'max_missing_skills' => ['nullable', 'integer', 'min:0', 'max:50'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:150'],
            'compact' => ['nullable', 'boolean'],
            'job_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $radiusKm = (float) ($validated['radius_km'] ?? 15);
        $minMatch = max(
            (float) ($validated['min_match'] ?? 0),
            ! empty($validated['hide_low_match']) ? 50 : 0,
        );
        $limit = (int) ($validated['limit'] ?? 100);
        $requiresDetailedMatching = $minMatch > 0
            || ($validated['sort'] ?? null) === 'match'
            || ! empty($validated['job_fair_only'])
            || ! empty($validated['upskill_recommended_only'])
            || ! empty($validated['certificate_match_only'])
            || isset($validated['max_missing_skills']);
        $compact = ! empty($validated['compact']) && ! $requiresDetailedMatching;
        // Matching is calculated in PHP. Bound the candidate pool so map and
        // dashboard requests do not score hundreds of vacancies per refresh.
        $candidateLimit = min(120, max($limit * 2, 40));

        $lat = isset($validated['lat']) ? (float) $validated['lat'] : $seeker->latitude;
        $lng = isset($validated['lng']) ? (float) $validated['lng'] : $seeker->longitude;
        $hasLocation = $lat !== null && $lng !== null;
        $feedMode = $validated['feed_mode'] ?? 'nearby';
        $usesDistanceFilter = $feedMode === 'nearby' && $hasLocation;

        $seekerPayload = $this->seekerPayload(
            $seeker,
            $seeker->latitude !== null ? (float) $seeker->latitude : null,
            $seeker->longitude !== null ? (float) $seeker->longitude : null,
            ! $compact,
        );

        if (! $hasLocation && $feedMode === 'nearby') {
            return response()->json([
                'message' => 'Update your address to view nearby jobs on the map.',
                'code' => 'location_required',
                'seeker' => $seekerPayload,
                'seeker_location' => [
                    'latitude' => null,
                    'longitude' => null,
                    'full_address' => $seeker->getFullAddress(),
                ],
                'jobs' => [],
            ], 422);
        }

        if (Schema::hasTable('seeker_skills') && Schema::hasColumn('seeker_skills', 'skill_id')) {
            $seeker->loadMissing('seekerSkills:id,seeker_id,skill_id');
        }

        $applicationsByPost = Schema::hasTable('applications')
            ? $seeker->applications()
                ->select(['apply_id', 'post_id', 'status'])
                ->get()
                ->keyBy('post_id')
            : collect();

        $savedPostIds = Schema::hasTable('seeker_saved_jobs')
            ? $seeker->savedJobs()->pluck('job_vacancies.post_id')->map(fn ($id) => (int) $id)->all()
            : [];

        $attendeesByFair = ! $compact && Schema::hasTable('job_fair_attendees')
            ? $seeker->jobFairAttendances()->get()->keyBy('job_fair_id')
            : collect();

        $seekerCertificates = ! $compact && Schema::hasTable('seeker_certificates')
            ? $seeker->certificates()->get(['certificate_id', 'title', 'issuing_body'])
            : collect();

        $trainingPrograms = $compact ? collect() : $this->trainingPrograms();

        $with = ['employer:employer_id,company_name,company_logo'];
        if (! $compact && Schema::hasTable('job_vacancy_skills')) {
            $with[] = 'skillRequirements.skill.outgoingRelationships';
            $with[] = 'skillRequirements.skill.incomingRelationships';
        }
        if (! $compact && Schema::hasTable('job_vacancy_certifications')) {
            $with[] = 'certificationRequirements';
        }
        if (! $compact && Schema::hasTable('job_fair_vacancies') && Schema::hasTable('job_fairs')) {
            $with[] = 'jobFairLinks.jobFair';
        }

        $query = JobVacancy::query()
            ->with($with)
            ->where('status', 'active')
            ->where(function ($query) {
                $query
                    ->whereNull('application_deadline')
                    ->orWhereDate('application_deadline', '>=', today());
            });

        if (isset($validated['job_id'])) {
            $query->whereKey($validated['job_id']);
        }

        // Search filters
        if (!empty($validated['keyword'])) {
            $keyword = '%' . $validated['keyword'] . '%';
            $query->where(function ($q) use ($keyword) {
                $q->where('job_title', 'like', $keyword)
                  ->orWhere('job_description', 'like', $keyword)
                  ->orWhere('location', 'like', $keyword)
                  ->orWhere('city_municipality', 'like', $keyword)
                  ->orWhere('province', 'like', $keyword)
                  ->orWhereHas('employer', function ($eq) use ($keyword) {
                      $eq->where('company_name', 'like', $keyword);
                  });
            });
        }

        if (! empty($validated['location_keyword'])) {
            $locationKeyword = '%'.$validated['location_keyword'].'%';
            $query->where(function ($location) use ($locationKeyword) {
                $location->where('location', 'like', $locationKeyword)
                    ->orWhere('specific_address', 'like', $locationKeyword)
                    ->orWhere('barangay', 'like', $locationKeyword)
                    ->orWhere('city_municipality', 'like', $locationKeyword)
                    ->orWhere('province', 'like', $locationKeyword);
            });
        }

        if (! empty($validated['job_type'])) {
            $query->where('employment_type', $validated['job_type']);
        }

        if (isset($validated['salary_min'])) {
            $query->where(function ($salary) use ($validated) {
                $salary->where('salary_max', '>=', $validated['salary_min'])
                    ->orWhere(function ($fallback) use ($validated) {
                        $fallback->whereNull('salary_max')
                            ->where('salary_min', '>=', $validated['salary_min']);
                    });
            });
        }

        if (isset($validated['salary_max'])) {
            $query->where(function ($salary) use ($validated) {
                $salary->where('salary_min', '<=', $validated['salary_max'])
                    ->orWhereNull('salary_min');
            });
        }

        if (! empty($validated['coordinates_only']) || (array_key_exists('include_no_coordinates', $validated) && ! $validated['include_no_coordinates'])) {
            $query->whereNotNull('latitude')->whereNotNull('longitude');
        }

        if (! empty($validated['saved_only'])) {
            $query->whereIn('post_id', $savedPostIds ?: [-1]);
        }

        if (! empty($validated['job_fair_only'])) {
            if (Schema::hasTable('job_fair_vacancies') && Schema::hasTable('job_fairs')) {
                $query->whereHas('jobFairLinks.jobFair', fn ($fair) => $fair->whereIn('status', ['upcoming', 'ongoing', 'active']));
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        // Distance filtering using Haversine formula in SQL
        if ($usesDistanceFilter) {
            $query->withinRadius($lat, $lng, $radiusKm, true);

            if (($validated['sort'] ?? 'distance') === 'distance') {
                $query->orderBy('distance_km', 'asc');
            }
        } elseif (($validated['sort'] ?? ($feedMode === 'recommended' ? 'match' : 'newest')) === 'newest') {
            $query->latest();
        }

        $jobs = $query
            ->limit($candidateLimit)
            ->get()
            ->map(function (JobVacancy $job) use ($matching, $seeker, $applicationsByPost, $savedPostIds, $attendeesByFair, $seekerCertificates, $trainingPrograms, $hasLocation, $lat, $lng, $compact) {
                $application = $applicationsByPost->get($job->post_id);
                if ($compact) {
                    return $this->compactJobPayload($job, $seeker, $application, $savedPostIds, $hasLocation, $lat, $lng);
                }

                $match = $matching->calculateMatch($job, $seeker);
                $missingSkills = collect($match['missing_critical_skills'] ?? []);
                $skillDetails = collect(data_get($match, 'factors.skills.details.details', data_get($match, 'factors.skills.details', [])));
                $matchedSkills = $skillDetails
                    ->filter(fn ($skill) => (float) ($skill['adjusted_match_factor'] ?? $skill['match_factor'] ?? 0) > 0)
                    ->map(fn ($skill) => $skill['matched_skill'] ?? $skill['required_skill'] ?? null)
                    ->filter()
                    ->unique()
                    ->values();
                $structuredRequiredSkills = $skillDetails
                    ->pluck('required_skill')
                    ->filter()
                    ->merge($job->required_skills ?? [])
                    ->unique()
                    ->values();
                $upskillPrograms = $this->programsForMissingSkills($missingSkills, $trainingPrograms);
                $jobFair = $this->jobFairPayload($job, $attendeesByFair);
                $certificateMatch = $this->certificateMatch($job, $seekerCertificates);

                $distanceKm = $job->distance_km ?? null;
                if ($distanceKm === null && $hasLocation && $job->latitude !== null && $job->longitude !== null) {
                    $latFrom = deg2rad((float) $lat);
                    $lonFrom = deg2rad((float) $lng);
                    $latTo = deg2rad((float) $job->latitude);
                    $lonTo = deg2rad((float) $job->longitude);

                    $latDelta = $latTo - $latFrom;
                    $lonDelta = $lonTo - $lonFrom;

                    $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
                        cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));

                    $distanceKm = round($angle * 6371.0088, 1);
                } else if ($distanceKm !== null) {
                    $distanceKm = round($distanceKm, 1);
                }

                $googleMapsUrl = null;
                if ($hasLocation && $job->latitude && $job->longitude) {
                    $googleMapsUrl = "https://www.google.com/maps/dir/?api=1&origin={$lat},{$lng}&destination={$job->latitude},{$job->longitude}";
                }

                $fullWorkAddress = collect([
                    $job->specific_address,
                    $job->barangay,
                    $job->city_municipality,
                    $job->province,
                ])->filter()->unique()->join(', ') ?: $job->location;

                return [
                    'post_id' => $job->post_id,
                    'vacancy_id' => $job->post_id,
                    'job_title' => $job->job_title,
                    'employer_name' => $job->employer?->company_name,
                    'employer' => [
                        'employer_id' => $job->employer?->employer_id,
                        'company_name' => $job->employer?->company_name,
                    ],
                    'employment_type' => $job->employment_type,
                    'work_setup' => $job->work_setup,
                    'location' => $job->location,
                    'work_location' => $fullWorkAddress,
                    'full_work_address' => $fullWorkAddress,
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
                    'required_skills' => $structuredRequiredSkills,
                    'soft_skills' => $job->soft_skills,
                    'match' => $match,
                    'match_percentage' => $match['percentage'] ?? 0,
                    'match_breakdown' => [
                        'skills' => (float) data_get($match, 'factors.skills.score', data_get($match, 'score_summary.skills', 0)),
                        'occupation' => (float) data_get($match, 'factors.occupation.score', data_get($match, 'score_summary.occupation', 0)),
                        'experience' => (float) data_get($match, 'factors.experience.score', data_get($match, 'score_summary.experience', 0)),
                        'education' => (float) data_get($match, 'factors.education.score', data_get($match, 'score_summary.education', 0)),
                    ],
                    'matched_skills' => $matchedSkills,
                    'missing_skills' => $missingSkills->values(),
                    'skill_match' => data_get($match, 'factors.skills.details', []),
                    'required_certifications' => $job->required_certifications,
                    'application_deadline' => $job->application_deadline?->toDateString(),
                    'open_to_pwds' => $job->open_to_pwds,
                    'open_to_senior_citizens' => $job->open_to_senior_citizens,
                    'spes_tupad_eligible' => $job->spes_tupad_eligible,
                    'distance_km' => $distanceKm,
                    'posted_at' => $job->created_at?->toISOString(),
                    'has_applied' => (bool) $application,
                    'is_saved' => in_array((int) $job->post_id, $savedPostIds, true),
                    'application_id' => $application?->apply_id,
                    'application_status' => $application?->status,
                    'has_coordinates' => $job->latitude !== null && $job->longitude !== null,
                    'certificate_match' => $certificateMatch,
                    'job_fair' => $jobFair,
                    'upskill' => [
                        'recommended' => $upskillPrograms !== [],
                        'programs' => $upskillPrograms,
                        'missing_skills_count' => $missingSkills->count(),
                    ],
                    'actions' => [
                        'can_apply' => ! $application,
                        'can_save' => true,
                        'can_rsvp_job_fair' => (bool) ($jobFair['is_available_at_job_fair'] && ! $jobFair['has_rsvp']),
                        'can_download_resume' => (bool) $seeker->profile_completed,
                    ],
                    'google_maps_url' => $googleMapsUrl,
                ];
            })
            ->filter(function ($job) use ($minMatch) {
                if ((float) data_get($job, 'match.percentage', 0) < $minMatch) {
                    return false;
                }
                return true;
            })
            ->when(
                ! empty($validated['hide_applied']),
                fn ($collection) => $collection->reject(fn (array $job) => $job['has_applied'])
            )
            ->when(
                ! empty($validated['upskill_recommended_only']),
                fn ($collection) => $collection->filter(fn (array $job) => $job['upskill']['recommended'])
            )
            ->when(
                ! empty($validated['certificate_match_only']),
                fn ($collection) => $collection->filter(fn (array $job) => $job['certificate_match']['matched'])
            )
            ->when(
                ! empty($validated['can_apply_only']),
                fn ($collection) => $collection->filter(fn (array $job) => $job['actions']['can_apply'])
            )
            ->when(
                isset($validated['max_missing_skills']),
                fn ($collection) => $collection->filter(fn (array $job) => $job['upskill']['missing_skills_count'] <= $validated['max_missing_skills'])
            )
            ->sort(function (array $left, array $right) use ($validated) {
                $sort = $validated['sort'] ?? 'distance';

                if ($sort === 'match') {
                    $percentage = ((float) data_get($right, 'match.percentage', 0) <=> (float) data_get($left, 'match.percentage', 0));
                    if ($percentage !== 0) return $percentage;
                }

                if ($sort === 'salary') {
                    $leftSalary = (float) ($left['salary_max'] ?? $left['salary_min'] ?? 0);
                    $rightSalary = (float) ($right['salary_max'] ?? $right['salary_min'] ?? 0);
                    $salary = $rightSalary <=> $leftSalary;
                    if ($salary !== 0) return $salary;
                }

                if ($sort === 'newest') {
                    $newest = strcmp((string) $right['posted_at'], (string) $left['posted_at']);
                    if ($newest !== 0) return $newest;
                }

                // Fallback to eligibility, then distance
                $eligibility = ((bool) data_get($right, 'match.eligible', true) <=> (bool) data_get($left, 'match.eligible', true));
                if ($eligibility !== 0) {
                    return $eligibility;
                }

                if (! in_array($sort, ['match', 'newest', 'salary'], true)) {
                    $percentage = ((float) data_get($right, 'match.percentage', 0) <=> (float) data_get($left, 'match.percentage', 0));
                    if ($percentage !== 0) {
                        return $percentage;
                    }
                }

                $leftDistance = $left['distance_km'] ?? 999999;
                $rightDistance = $right['distance_km'] ?? 999999;

                return $leftDistance <=> $rightDistance;
            })
            ->take($limit)
            ->values();

        $summary = [
            'total_found' => $jobs->count(),
            'high_match_count' => $jobs->where('match_percentage', '>=', 80)->count(),
            'nearest_distance_km' => $jobs->pluck('distance_km')->filter(fn ($distance) => $distance !== null)->min(),
            'applied_count' => $jobs->where('has_applied', true)->count(),
            'saved_count' => $jobs->where('is_saved', true)->count(),
            'job_fair_count' => $jobs->filter(fn ($job) => $job['job_fair']['is_available_at_job_fair'])->count(),
            'upskill_recommendation_count' => $jobs->filter(fn ($job) => $job['upskill']['recommended'])->count(),
        ];

        return response()->json([
            'seeker' => $seekerPayload,
            'summary' => $summary,
            'radius_km' => $radiusKm,
            'feed_mode' => $feedMode,
            'location_available' => $hasLocation,
            'origin' => $hasLocation ? [
                'latitude' => $lat,
                'longitude' => $lng,
            ] : null,
            'seeker_location' => [
                'latitude' => $hasLocation ? $lat : null,
                'longitude' => $hasLocation ? $lng : null,
                'full_address' => $seeker->getFullAddress(),
            ],
            'filters_applied' => [
                ...$validated,
                'radius_km' => $radiusKm,
                'min_match' => $minMatch,
            ],
            'count' => $jobs->count(),
            'jobs' => $jobs,
        ]);
    }

    public function show(
        Request $request,
        JobVacancy $job,
        EnhancedJobMatchingService $matching
    ): JsonResponse {
        abort_unless($request->user() instanceof JobSeeker, 403, 'Job seeker account required.');

        $request->merge([
            'job_id' => $job->getKey(),
            'feed_mode' => 'latest',
            'sort' => 'newest',
            'limit' => 1,
            'compact' => false,
        ]);

        $response = $this->getNearbyJobs($request, $matching);
        $payload = $response->getData(true);
        $detailedJob = collect($payload['jobs'] ?? [])->first();

        abort_unless($detailedJob, 404, 'This vacancy is no longer available.');

        return response()->json([
            'job' => $detailedJob,
            'seeker' => $payload['seeker'] ?? null,
        ]);
    }

    private function compactJobPayload(
        JobVacancy $job,
        JobSeeker $seeker,
        mixed $application,
        array $savedPostIds,
        bool $hasLocation,
        mixed $latitude,
        mixed $longitude
    ): array {
        $distanceKm = $job->distance_km ?? null;
        if ($distanceKm === null && $hasLocation && $job->latitude !== null && $job->longitude !== null) {
            $latFrom = deg2rad((float) $latitude);
            $lonFrom = deg2rad((float) $longitude);
            $latTo = deg2rad((float) $job->latitude);
            $lonTo = deg2rad((float) $job->longitude);
            $angle = 2 * asin(sqrt(
                pow(sin(($latTo - $latFrom) / 2), 2)
                + cos($latFrom) * cos($latTo) * pow(sin(($lonTo - $lonFrom) / 2), 2)
            ));
            $distanceKm = round($angle * 6371.0088, 1);
        } elseif ($distanceKm !== null) {
            $distanceKm = round($distanceKm, 1);
        }

        $fullWorkAddress = collect([
            $job->specific_address,
            $job->barangay,
            $job->city_municipality,
            $job->province,
        ])->filter()->unique()->join(', ') ?: $job->location;

        $googleMapsUrl = null;
        if ($hasLocation && $job->latitude && $job->longitude) {
            $googleMapsUrl = "https://www.google.com/maps/dir/?api=1&origin={$latitude},{$longitude}&destination={$job->latitude},{$job->longitude}";
        }

        return [
            'post_id' => $job->post_id,
            'vacancy_id' => $job->post_id,
            'job_title' => $job->job_title,
            'employer_name' => $job->employer?->company_name,
            'employer' => [
                'employer_id' => $job->employer?->employer_id,
                'company_name' => $job->employer?->company_name,
            ],
            'employment_type' => $job->employment_type,
            'work_setup' => $job->work_setup,
            'location' => $job->location,
            'province' => $job->province,
            'city_municipality' => $job->city_municipality,
            'barangay' => $job->barangay,
            'full_work_address' => $fullWorkAddress,
            'latitude' => $job->latitude,
            'longitude' => $job->longitude,
            'salary_min' => $job->salary_min,
            'salary_max' => $job->salary_max,
            'salary_type' => $job->salary_type,
            'hide_salary' => $job->hide_salary,
            'job_description' => $job->job_description,
            'vacancies_count' => $job->vacancies_count,
            'experience_level' => $job->experience_level,
            'minimum_experience_months' => $job->minimum_experience_months,
            'required_skills' => $job->required_skills ?? [],
            'soft_skills' => $job->soft_skills ?? [],
            'application_deadline' => $job->application_deadline?->toDateString(),
            'distance_km' => $distanceKm,
            'posted_at' => $job->created_at?->toISOString(),
            'match' => null,
            'match_percentage' => null,
            'match_deferred' => true,
            'missing_skills' => [],
            'has_applied' => (bool) $application,
            'is_saved' => in_array((int) $job->post_id, $savedPostIds, true),
            'application_id' => $application?->apply_id,
            'application_status' => $application?->status,
            'has_coordinates' => $job->latitude !== null && $job->longitude !== null,
            'certificate_match' => ['matched' => false, 'matched_count' => 0, 'required_count' => 0, 'deferred' => true],
            'job_fair' => ['is_available_at_job_fair' => false, 'has_rsvp' => false, 'deferred' => true],
            'upskill' => ['recommended' => false, 'programs' => [], 'missing_skills_count' => 0, 'deferred' => true],
            'actions' => [
                'can_apply' => ! $application,
                'can_save' => true,
                'can_rsvp_job_fair' => false,
                'can_download_resume' => (bool) $seeker->profile_completed,
            ],
            'google_maps_url' => $googleMapsUrl,
        ];
    }

    private function seekerPayload(JobSeeker $seeker, ?float $latitude, ?float $longitude, bool $includeStats = true): array
    {
        $payload = [
            'id' => $seeker->seeker_id,
            'full_name' => collect([$seeker->first_name, $seeker->middle_name, $seeker->last_name])->filter()->join(' '),
            'profile_completed' => (bool) $seeker->profile_completed,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'full_address' => $seeker->getFullAddress(),
            'resume_ready' => (bool) $seeker->profile_completed,
        ];

        if ($includeStats) {
            $payload['certificate_count'] = Schema::hasTable('seeker_certificates')
                ? $seeker->certificates()->count()
                : 0;
            $payload['skills_count'] = Schema::hasTable('seeker_skills')
                ? $seeker->seekerSkills()->count()
                : 0;
        }

        return $payload;
    }

    private function trainingPrograms(): Collection
    {
        if (! Schema::hasTable('government_programs')
            || ! Schema::hasTable('government_program_skills')
            || ! Schema::hasColumn('government_programs', 'program_status')
            || ! Schema::hasColumn('government_programs', 'visibility')) {
            return collect();
        }

        return GovernmentProgram::query()
            ->with('skills')
            ->where('program_status', 'open')
            ->where('visibility', 'public')
            ->where(function ($deadline) {
                $deadline->whereNull('application_deadline')->orWhereDate('application_deadline', '>=', today());
            })
            ->limit(100)
            ->get();
    }

    private function programsForMissingSkills(Collection $missingSkills, Collection $programs): array
    {
        $missingNames = $missingSkills
            ->map(fn ($skill) => $this->normalizeTerm($skill['skill'] ?? $skill['name'] ?? $skill))
            ->filter()
            ->unique();

        if ($missingNames->isEmpty()) {
            return [];
        }

        return $programs
            ->map(function (GovernmentProgram $program) use ($missingNames) {
                $matchedSkills = $program->skills
                    ->filter(fn ($skill) => $missingNames->contains($this->normalizeTerm($skill->skill_name)))
                    ->pluck('skill_name')
                    ->unique()
                    ->values();

                if ($matchedSkills->isEmpty()) {
                    return null;
                }

                return [
                    'program_id' => $program->program_id,
                    'title' => $program->program_name,
                    'matched_skills' => $matchedSkills,
                    'url' => "/seeker/government-programs/{$program->program_id}",
                ];
            })
            ->filter()
            ->take(3)
            ->values()
            ->all();
    }

    private function jobFairPayload(JobVacancy $job, Collection $attendeesByFair): array
    {
        $link = $job->relationLoaded('jobFairLinks')
            ? $job->jobFairLinks
                ->filter(fn ($item) => $item->jobFair && in_array($item->jobFair->status, ['upcoming', 'ongoing', 'active'], true))
                ->sortBy(fn ($item) => ($item->jobFair->start_date ?? $item->jobFair->event_date)?->timestamp ?? PHP_INT_MAX)
                ->first()
            : null;
        $fair = $link?->jobFair;
        $attendee = $fair ? $attendeesByFair->get($fair->job_fair_id) : null;

        return [
            'is_available_at_job_fair' => (bool) $fair,
            'job_fair_id' => $fair?->job_fair_id,
            'title' => $fair?->title,
            'date' => ($fair?->start_date ?? $fair?->event_date)?->toDateString(),
            'venue' => $fair?->venue,
            'has_rsvp' => (bool) $attendee,
            'qr_pass_url' => $attendee ? '/seeker/job-fairs' : null,
        ];
    }

    private function certificateMatch(JobVacancy $job, Collection $seekerCertificates): array
    {
        $requirements = $job->relationLoaded('certificationRequirements')
            ? $job->certificationRequirements->pluck('name')
            : collect($job->required_certifications ?? []);
        $certificateTitles = $seekerCertificates->pluck('title')->filter();
        $matched = $requirements->filter(function ($requirement) use ($certificateTitles) {
            $normalizedRequirement = $this->normalizeTerm($requirement);
            return $certificateTitles->contains(function ($title) use ($normalizedRequirement) {
                $normalizedTitle = $this->normalizeTerm($title);
                return $normalizedTitle !== '' && ($normalizedTitle === $normalizedRequirement
                    || str_contains($normalizedTitle, $normalizedRequirement)
                    || str_contains($normalizedRequirement, $normalizedTitle));
            });
        })->values();

        return [
            'matched' => $matched->isNotEmpty(),
            'matched_count' => $matched->count(),
            'required_count' => $requirements->count(),
            'matched_certificates' => $matched,
        ];
    }

    private function normalizeTerm(mixed $value): string
    {
        return Str::of((string) $value)->lower()->replaceMatches('/[^a-z0-9+#.]+/', ' ')->squish()->toString();
    }
}
