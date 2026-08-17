<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\JobVacancy;
use App\Services\ActivityLogger;
use App\Services\GoogleMapsService;
use App\Services\AddressService;
use App\Services\MatchingProfileService;
use App\Services\SkillTaxonomyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmployerJobVacancyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $employer = $this->employer($request);
        $employer->vacancies()
            ->where('status', 'active')
            ->whereDate('application_deadline', '<', today())
            ->update(['status' => 'closed']);

        $vacancies = $employer->vacancies()
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($vacancies);
    }

    public function store(
        Request $request,
        GoogleMapsService $maps,
        SkillTaxonomyService $taxonomy,
        MatchingProfileService $matchingProfiles
    ): JsonResponse {
        $employer = $this->employer($request);
        $vacancy = $employer->vacancies()->create($this->validatedData($request, $maps));
        $taxonomy->syncVacancy($vacancy);
        $matchingProfiles->syncVacancyCertifications($vacancy);

        ActivityLogger::logAs($employer, 'posted_vacancy', sprintf(
            'Posted job vacancy "%s" (#%d).',
            $vacancy->job_title,
            $vacancy->post_id
        ));

        return response()->json([
            'message' => 'Job vacancy created successfully.',
            'vacancy' => $vacancy,
        ], 201);
    }

    public function show(Request $request, JobVacancy $vacancy): JsonResponse
    {
        $this->ensureOwnership($request, $vacancy);

        return response()->json($vacancy);
    }

    public function update(
        Request $request,
        JobVacancy $vacancy,
        GoogleMapsService $maps,
        SkillTaxonomyService $taxonomy,
        MatchingProfileService $matchingProfiles
    ): JsonResponse {
        $this->ensureOwnership($request, $vacancy);
        $vacancy->update($this->validatedData($request, $maps));
        $taxonomy->syncVacancy($vacancy);
        $matchingProfiles->syncVacancyCertifications($vacancy);

        ActivityLogger::logAs($this->employer($request), 'updated_vacancy', sprintf(
            'Updated job vacancy "%s" (#%d).',
            $vacancy->job_title,
            $vacancy->post_id
        ));

        return response()->json([
            'message' => 'Job vacancy updated successfully.',
            'vacancy' => $vacancy->fresh(),
        ]);
    }

    public function destroy(Request $request, JobVacancy $vacancy): JsonResponse
    {
        $this->ensureOwnership($request, $vacancy);

        $description = sprintf('Deleted job vacancy "%s" (#%d).', $vacancy->job_title, $vacancy->post_id);
        $vacancy->delete();

        ActivityLogger::logAs($this->employer($request), 'deleted_vacancy', $description);

        return response()->json(['message' => 'Job vacancy deleted successfully.']);
    }

    private function validatedData(Request $request, GoogleMapsService $maps): array
    {
        $broadOccupationInput = $this->broadOccupationInput($request);
        $data = $request->validate([
            'occupation_id' => [$broadOccupationInput ? 'nullable' : 'required', 'integer', 'exists:occupations,id'],
            'general_term' => ['nullable', 'string', 'max:120'],
            'broad_field_key' => ['nullable', 'string', 'max:120'],
            'anchor_code' => ['nullable', 'string', 'max:120'],
            'job_title' => ['required', 'string', 'max:255'],
            'employment_type' => ['required', Rule::in([
                'Permanent/Regular',
                'Contractual',
                'Project-Based',
                'Seasonal',
                'Part-Time',
                'Freelance',
            ])],
            'work_setup' => ['required', Rule::in(['On-Site', 'Remote', 'Hybrid'])],
            'region' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
            'city_municipality' => ['required', 'string', 'max:150'],
            'barangay' => ['required', 'string', 'max:150'],
            'specific_address' => ['nullable', 'string', 'max:255'],
            'province_code' => ['nullable', 'string', 'max:10'],
            'city_code' => ['nullable', 'string', 'max:10'],
            'barangay_code' => ['nullable', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'location_accuracy' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'google_place_id' => ['nullable', 'string', 'max:255'],
            'job_description' => ['required', 'string', 'max:10000'],
            'vacancies_count' => ['required', 'integer', 'min:1', 'max:10000'],
            'minimum_education' => ['required', Rule::in([
                'High School Undergraduate',
                'High School Graduate',
                'College Undergraduate',
                'College Graduate',
                'TVET/Vocational Graduate',
                'Post-Graduate',
            ])],
            'target_courses' => ['nullable', 'array', 'max:20'],
            'target_courses.*' => ['string', 'max:150'],
            'experience_level' => ['required', 'string', 'max:50'],
            'required_skills' => ['required', 'array', 'min:1', 'max:30'],
            'required_skills.*' => ['string', 'max:100'],
            'hard_to_find_skills' => ['nullable', 'array', 'max:20'],
            'hard_to_find_skills.*' => ['string', 'max:100'],
            'training_needed' => ['nullable', 'array', 'max:20'],
            'training_needed.*' => ['string', 'max:150'],
            'accepts_trainees' => ['sometimes', 'boolean'],
            'accepts_fresh_graduates' => ['sometimes', 'boolean'],
            'soft_skills' => ['nullable', 'array', 'max:20'],
            'soft_skills.*' => ['string', 'max:100'],
            'required_certifications' => ['nullable', 'array', 'max:20'],
            'required_certifications.*' => ['string', 'max:150'],
            'salary_type' => ['required', Rule::in(['Monthly', 'Daily', 'Hourly'])],
            'salary_min' => ['required_unless:hide_salary,true', 'nullable', 'numeric', 'min:0'],
            'salary_max' => ['required_unless:hide_salary,true', 'nullable', 'numeric', 'gte:salary_min'],
            'hide_salary' => ['required', 'boolean'],
            'benefits' => ['nullable', 'array', 'max:30'],
            'benefits.*' => ['string', 'max:100'],
            'application_deadline' => ['required', 'date', 'after_or_equal:today'],
            'preferred_gender' => ['nullable', Rule::in(['Any', 'Male', 'Female'])],
            'minimum_age' => ['nullable', 'integer', 'min:15', 'max:100'],
            'maximum_age' => ['nullable', 'integer', 'min:15', 'max:100', 'gte:minimum_age'],
            'open_to_pwds' => ['required', 'boolean'],
            'open_to_senior_citizens' => ['required', 'boolean'],
            'spes_tupad_eligible' => ['required', 'boolean'],
            'status' => ['required', Rule::in(['active', 'closed', 'draft'])],
        ]);

        $data['job_title'] = Str::squish($data['job_title']);
        $data['general_term'] = $this->normalizeOccupationGeneralTerm($broadOccupationInput);
        unset($data['broad_field_key'], $data['anchor_code']);

        if (! Schema::hasColumn('job_vacancies', 'general_term')) {
            unset($data['general_term']);
        }

        if (isset($request->minimum_experience_months)) {
            $data['minimum_experience_months'] = $request->minimum_experience_months;
        } else {
            $years = (int) filter_var($data['experience_level'], FILTER_SANITIZE_NUMBER_INT);
            $data['minimum_experience_months'] = $years * 12;
        }
        $data['certifications_mandatory'] = false;

        if (! Schema::hasColumn('job_vacancies', 'minimum_experience_months')) {
            unset($data['minimum_experience_months']);
        }
        if (! Schema::hasColumn('job_vacancies', 'certifications_mandatory')) {
            unset($data['certifications_mandatory']);
        }
        foreach (['hard_to_find_skills', 'training_needed', 'accepts_trainees', 'accepts_fresh_graduates'] as $column) {
            if (! Schema::hasColumn('job_vacancies', $column)) {
                unset($data[$column]);
            }
        }
        foreach (['preferred_gender', 'minimum_age', 'maximum_age'] as $column) {
            if (! Schema::hasColumn('job_vacancies', $column)) {
                unset($data[$column]);
            }
        }

        $addressService = new AddressService();
        $data['full_work_address'] = $addressService->buildFullAddress(
            $data['specific_address'] ?? null,
            $data['barangay'],
            $data['city_municipality'],
            $data['province']
        );
        $data['location'] = collect([
            $data['specific_address'] ?? null,
            $data['barangay'],
            $data['city_municipality'],
            $data['province'],
        ])->filter()->join(', ');
        
        $data['region_code'] = substr($data['province_code'] ?? '', 0, 2) ?: null;
        if (isset($data['latitude'], $data['longitude'])) {
            $data['location_verified_at'] = now();
        }

        if (
            Schema::hasColumns('job_vacancies', ['latitude', 'longitude', 'google_place_id'])
            && ! isset($data['latitude'], $data['longitude'])
        ) {
            try {
                $location = $maps->geocode($data['location'].', Philippines');
                if ($location) {
                    $data['latitude'] = $location['latitude'];
                    $data['longitude'] = $location['longitude'];
                    $data['google_place_id'] = $location['place_id'];
                    $data['location_verified_at'] = now();
                }
            } catch (\Throwable) {
                // Preserve vacancy posting when optional coordinate lookup is unavailable.
            }
        }

        if ($data['hide_salary']) {
            $data['salary_min'] = null;
            $data['salary_max'] = null;
        }

        return $data;
    }

    private function broadOccupationInput(Request $request): ?string
    {
        foreach (['general_term', 'broad_field_key', 'anchor_code'] as $field) {
            $value = $request->input($field);

            if (is_string($value) && trim($value) !== '') {
                return $value;
            }
        }

        return null;
    }

    private function normalizeOccupationGeneralTerm(?string $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return Str::of($value)
            ->lower()
            ->replaceMatches('/^general:/', '')
            ->replace(['-', '_'], ' ')
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }

    private function employer(Request $request): Employer
    {
        /** @var Employer $employer */
        $employer = $request->user();

        return $employer;
    }

    private function ensureOwnership(Request $request, JobVacancy $vacancy): void
    {
        abort_unless(
            $vacancy->employer_id === $this->employer($request)->employer_id,
            404
        );
    }
}
