<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use App\Models\Occupation;
use App\Models\SeekerDisability;
use App\Models\SeekerEducation;
use App\Models\SeekerEligibility;
use App\Models\SeekerLanguage;
use App\Models\SeekerOccupation;
use App\Models\SeekerTraining;
use App\Models\SeekerWorkExperience;
use App\Services\MatchingProfileService;
use App\Services\OccupationTitleMatcher;
use App\Services\SkillCategorizer;
use App\Services\SkillTaxonomyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SeekerController extends Controller
{
    private const SUPPORTED_LANGUAGES = [
        'english',
        'filipino',
        'cebuano',
        'ilocano',
        'hiligaynon',
        'bikol',
        'waray',
        'pangasinan',
        'kapampangan',
        'maranao',
        'maguindanao',
        'tausug',
        'mandarin',
        'spanish',
        'japanese',
        'korean',
        'arabic',
        'french',
        'german',
        'others',
    ];

    // ── PRIVATE HELPERS ──────────────────────────────────────────────────────

    /**
     * Ensure the authenticated user is a JobSeeker.
     * Returns the model or a 403 JsonResponse.
     */
    private function getSeeker(Request $request): JobSeeker|JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof JobSeeker) {
            return response()->json(['message' => 'Unauthorized. Job Seeker access only.'], 403);
        }

        return $user;
    }

    /**
     * Updates the form_validation_state JSON column for a given step key.
     * Used by all 4 step methods to track completion progress.
     */
    private function markStepComplete(JobSeeker $seeker, string $stepKey): void
    {
        $state = $seeker->form_validation_state ?? [];
        $state[$stepKey] = true;
        $seeker->forceFill(['form_validation_state' => $state])->save();
    }

    /**
     * Builds the minimal user payload returned to the frontend after each step.
     * Matches the shape that authStore and VerifyEmailPage expect.
     */
    private function buildPayload(JobSeeker $seeker): array
    {
        return [
            'id' => $seeker->getKey(),
            'name' => trim("{$seeker->first_name} {$seeker->last_name}"),
            'email' => $seeker->email,
            'role' => 'seeker',
            'email_verified_at' => $seeker->email_verified_at,
            'profile_completed' => $seeker->profile_completed,
            'first_name' => $seeker->first_name,
            'last_name' => $seeker->last_name,
            'mobile_number' => $seeker->mobile_number,
            'form_validation_state' => $seeker->form_validation_state,
        ];
    }

    // ── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────

    /**
     * GET /api/seeker/profile   [auth:sanctum]
     *
     * Returns the full seeker profile including all related data.
     * Used to pre-fill the onboarding form on return visits.
     * Skills are organized by type for form initialization.
     */
    public function getProfile(Request $request): JsonResponse
    {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $seeker->load([
            'disabilities',
            'occupations',
            'languages',
            'educations',
            'trainings',
            'eligibilities',
            'workExperiences.occupation',
            'seekerSkills',
            'certificates',
        ]);

        // Organize skills by type for frontend form initialization
        $doleSkills = [];
        $technicalSkills = [];
        $softSkills = [];

        foreach ($seeker->seekerSkills as $skill) {
            if ($skill->skill_type === 'dole_standard') {
                $doleSkills[] = $skill->skill_name;
            } elseif ($skill->skill_type === 'technical') {
                $technicalSkills[] = $skill->skill_name;
            } elseif ($skill->skill_type === 'soft') {
                $softSkills[] = $skill->skill_name;
            }
        }

        return response()->json([
            'user' => array_merge($this->buildPayload($seeker), [
                'middle_name' => $seeker->middle_name,
                'suffix' => $seeker->suffix,
                'date_of_birth' => $seeker->date_of_birth?->format('Y-m-d'),
                'sex' => $seeker->sex,
                'civil_status' => $seeker->civil_status,
                'religion' => $seeker->religion,
                'height_ft' => $seeker->height_ft,
                'tin' => $seeker->tin,
                'educ_attainment' => $seeker->educ_attainment,
                'address_house_street' => $seeker->address_house_street,
                'address_barangay' => $seeker->address_barangay,
                'address_municipality_city' => $seeker->address_municipality_city,
                'address_province' => $seeker->address_province,
                'address_province_code' => $seeker->address_province_code,
                'address_city_code' => $seeker->address_city_code,
                'address_barangay_code' => $seeker->address_barangay_code,
                'latitude' => $seeker->latitude,
                'longitude' => $seeker->longitude,
                'location_accuracy' => $seeker->location_accuracy,
                'google_place_id' => $seeker->google_place_id,
                'disabilities' => $seeker->disabilities,
                'is_4ps_beneficiary' => $seeker->is_4ps_beneficiary,
                'household_id_4ps' => $seeker->household_id_4ps,
                'employment_status' => $seeker->employment_status,
                'employment_type' => $seeker->employment_type,
                'self_employed_type' => $seeker->self_employed_type,
                'unemployment_months' => $seeker->unemployment_months,
                'unemployment_reason' => $seeker->unemployment_reason,
                'is_ofw' => $seeker->is_ofw,
                'ofw_country' => $seeker->ofw_country,
                'is_former_ofw' => $seeker->is_former_ofw,
                'former_ofw_country' => $seeker->former_ofw_country,
                'former_ofw_return_date' => $seeker->former_ofw_return_date?->format('Y-m-d'),
                'work_type_preference' => $seeker->work_type_preference,
                'preferred_work_setups' => $seeker->preferred_work_setups,
                'preferred_employment_types' => $seeker->preferred_employment_types,
                'preferred_work_location' => $seeker->preferred_work_location,
                'preferred_locations_details' => $seeker->preferred_locations_details,
                'occupations' => $seeker->occupations,
                'languages' => $seeker->languages,
                'currently_in_school' => $seeker->currently_in_school,
                'dole_skills' => $doleSkills,
                'technical_skills' => $technicalSkills,
                'soft_skills' => $softSkills,
                'educations' => $seeker->educations,
                'trainings' => $seeker->trainings,
                'eligibilities' => $seeker->eligibilities,
                'work_experiences' => $seeker->workExperiences,
                'certificates' => $seeker->certificates->map(fn ($certificate) => [
                    'certificate_id' => $certificate->certificate_id,
                    'title' => $certificate->title,
                    'issuing_body' => $certificate->issuing_body,
                    'issued_at' => $certificate->issued_at?->format('Y-m-d'),
                    'original_filename' => $certificate->original_filename,
                    'mime_type' => $certificate->mime_type,
                    'file_size' => $certificate->file_size,
                    'created_at' => $certificate->created_at,
                ]),
                'profile_image_url' => filled($seeker->profile_image)
                    ? '/api/seeker/profile-image'
                    : null,
                'has_profile_image' => filled($seeker->profile_image),
                'has_resume' => filled($seeker->resume_path),
                'dashboard_stats' => [
                    'active_applications' => Schema::hasTable('applications')
                        ? DB::table('applications')
                            ->where('seeker_id', $seeker->getKey())
                            ->whereNotIn('status', ['hired', 'rejected'])
                            ->count()
                        : 0,
                    'skills' => $seeker->seekerSkills->count(),
                    'saved_jobs' => 0,
                ],
                'profile_strength' => $this->profileStrength($seeker),
            ]),
        ]);
    }

    private function profileStrength(JobSeeker $seeker): array
    {
        $items = [
            ['key' => 'photo', 'label' => 'Professional 2x2 photo', 'complete' => filled($seeker->profile_image)],
            ['key' => 'personal_information', 'label' => 'Personal information', 'complete' => filled($seeker->date_of_birth) && filled($seeker->mobile_number)],
            ['key' => 'address', 'label' => 'Complete address', 'complete' => filled($seeker->address_barangay) && filled($seeker->address_municipality_city)],
            ['key' => 'education', 'label' => 'Education', 'complete' => $seeker->educations->isNotEmpty()],
            ['key' => 'skills', 'label' => 'Skills', 'complete' => $seeker->seekerSkills->isNotEmpty()],
            ['key' => 'work_experience', 'label' => 'Work experience', 'complete' => $seeker->workExperiences->isNotEmpty()],
            ['key' => 'training', 'label' => 'Training or certificate', 'complete' => $seeker->trainings->isNotEmpty() || $seeker->certificates->isNotEmpty()],
            ['key' => 'resume', 'label' => 'Generated resume', 'complete' => filled($seeker->resume_path)],
        ];

        $completed = collect($items)->where('complete', true)->count();

        return [
            'percentage' => (int) round(($completed / count($items)) * 100),
            'items' => $items,
        ];
    }

    /**
     * POST /api/seeker/step-1   [auth:sanctum]
     *
     * Saves: Personal Information, Present Address, Educational Attainment,
     *        and Disability Status (writes to seeker_disabilities table).
     */
    public function saveStep1(Request $request): JsonResponse
    {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'in:,Jr.,Sr.,II,III,IV,V'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'sex' => ['required', 'in:male,female'],
            'civil_status' => ['required', 'in:single,married,widowed,separated'],
            'religion' => ['required', 'string', 'in:roman_catholic,islam,iglesia_ni_cristo,aglipayan,evangelical,seventh_day_adventist,jehovah_witness,buddhist,hindu,jewish,agnostic_atheist,declined,other'],
            'religion_other' => ['nullable', 'string', 'max:100', 'required_if:religion,other'],
            'height_ft' => ['required', 'numeric', 'between:2.5,8.5'],
            'tin' => ['nullable', 'string', 'max:20'],
            'educ_attainment' => ['required', 'string', 'max:100'],
            'address_province' => ['required', 'string', 'max:100'],
            'address_municipality_city' => ['required', 'string', 'max:100'],
            'address_barangay' => ['required', 'string', 'max:100'],
            'address_house_street' => ['required', 'string', 'max:255'],
            'address_province_code' => ['nullable', 'string', 'max:10'],
            'address_city_code' => ['nullable', 'string', 'max:10'],
            'address_barangay_code' => ['nullable', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'location_accuracy' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'google_place_id' => ['nullable', 'string', 'max:255'],
            // Disability: array of types, at least one must be selected
            'disabilities' => ['required', 'array', 'min:1'],
            'disabilities.*' => ['string', 'in:visual,hearing,speech,mental,physical,others,none'],
            'disability_specification' => [
                'nullable',
                Rule::requiredIf(fn () => in_array('others', $request->input('disabilities', []), true)),
                'string',
                'max:255',
            ],
        ]);

        if (in_array('none', $validated['disabilities'], true) && count($validated['disabilities']) > 1) {
            return response()->json([
                'message' => 'No Disability cannot be combined with another disability.',
                'errors' => [
                    'disabilities' => ['Select No Disability by itself.'],
                ],
            ], 422);
        }

        // ── Save main seeker fields ──
        $seeker->forceFill([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'suffix' => $validated['suffix'] ?? null,
            'date_of_birth' => $validated['date_of_birth'],
            'sex' => $validated['sex'],
            'civil_status' => $validated['civil_status'],
            'religion' => $validated['religion'] === 'other'
                ? ($validated['religion_other'] ?? null)
                : $validated['religion'],
            'height_ft' => $validated['height_ft'],
            'tin' => $validated['tin'] ?? null,
            'educ_attainment' => $validated['educ_attainment'],
            'address_province' => $validated['address_province'],
            'address_municipality_city' => $validated['address_municipality_city'],
            'address_barangay' => $validated['address_barangay'],
            'address_house_street' => $validated['address_house_street'],
            'address_province_code' => $validated['address_province_code'] ?? null,
            'address_city_code' => $validated['address_city_code'] ?? null,
            'address_barangay_code' => $validated['address_barangay_code'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'location_accuracy' => $validated['location_accuracy'] ?? null,
            'google_place_id' => $validated['google_place_id'] ?? null,
        ])->save();

        // ── Save disability records ──
        $seeker->disabilities()->delete();

        $selected = $validated['disabilities'] ?? [];
        // Only insert if not 'none'
        if (! empty($selected) && ! in_array('none', $selected)) {
            foreach ($selected as $type) {
                SeekerDisability::create([
                    'seeker_id' => $seeker->getKey(),
                    'disability_type' => $type,
                    'disability_specification' => ($type === 'others')
                        ? ($validated['disability_specification'] ?? null)
                        : null,
                ]);
            }
        }

        $this->markStepComplete($seeker, 'step1');

        return response()->json([
            'message' => 'Personal information saved.',
            'user' => $this->buildPayload($seeker),
        ]);
    }

    /**
     * POST /api/seeker/step-2   [auth:sanctum]
     *
     * Saves: Employment Status (including sub-types),
     *        OFW status, and 4Ps Beneficiary status.
     */
    public function saveStep2(Request $request): JsonResponse
    {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $validated = $request->validate([
            'employment_status' => ['required', 'in:employed,unemployed'],
            // Employed sub-fields
            'employment_type' => ['nullable', 'required_if:employment_status,employed', 'in:wage_employed,self_employed'],
            'self_employed_type' => ['nullable', 'required_if:employment_type,self_employed', 'string', 'max:100'],
            'self_employed_type_others' => ['nullable', 'required_if:self_employed_type,others', 'string', 'max:255'],
            // Unemployed sub-fields
            'unemployment_months' => ['nullable', 'required_if:employment_status,unemployed', 'integer', 'min:0', 'max:999'],
            'unemployment_reason' => ['nullable', 'required_if:employment_status,unemployed', 'string', 'max:100'],
            'unemployment_reason_others' => ['nullable', 'required_if:unemployment_reason,others', 'string', 'max:255'],
            'unemployment_terminated_country' => ['nullable', 'required_if:unemployment_reason,terminated_abroad', 'string', 'max:100'],
            // OFW
            'is_ofw' => ['required', 'boolean'],
            'ofw_country' => ['nullable', 'required_if:is_ofw,true', 'string', 'max:100'],
            'is_former_ofw' => ['required', 'boolean'],
            'former_ofw_country' => ['nullable', 'required_if:is_former_ofw,true', 'string', 'max:100'],
            'former_ofw_return_date' => ['nullable', 'required_if:is_former_ofw,true', 'date', 'before_or_equal:today'],
            // 4Ps
            'is_4ps_beneficiary' => ['required', 'boolean'],
            'household_id_4ps' => [
                'nullable',
                'required_if:is_4ps_beneficiary,true',
                'string',
                'regex:/^\d{2}-\d{2}-\d{2}-\d{3}-\d{5}$/',
            ],
        ], [
            'household_id_4ps.required_if' => 'The 4Ps Household ID is required for beneficiaries.',
            'household_id_4ps.regex' => 'The 4Ps Household ID must contain 14 digits in the format 00-00-00-000-00000.',
        ]);

        $seeker->forceFill([
            'employment_status' => $validated['employment_status'],
            'employment_type' => $validated['employment_status'] === 'employed'
                ? ($validated['employment_type'] ?? null)
                : null,
            'self_employed_type' => ($validated['employment_type'] ?? null) === 'self_employed'
                ? ($validated['self_employed_type'] ?? null)
                : null,
            'self_employed_type_others' => ($validated['self_employed_type'] ?? null) === 'others'
                ? ($validated['self_employed_type_others'] ?? null)
                : null,
            'unemployment_months' => $validated['employment_status'] === 'unemployed'
                ? ($validated['unemployment_months'] ?? null)
                : null,
            'unemployment_reason' => $validated['employment_status'] === 'unemployed'
                ? ($validated['unemployment_reason'] ?? null)
                : null,
            'unemployment_reason_others' => ($validated['unemployment_reason'] ?? null) === 'others'
                ? ($validated['unemployment_reason_others'] ?? null)
                : null,
            'unemployment_terminated_country' => ($validated['unemployment_reason'] ?? null) === 'terminated_abroad'
                ? ($validated['unemployment_terminated_country'] ?? null)
                : null,
            'is_ofw' => $validated['is_ofw'],
            'ofw_country' => $validated['is_ofw'] ? ($validated['ofw_country'] ?? null) : null,
            'is_former_ofw' => $validated['is_former_ofw'],
            'former_ofw_country' => $validated['is_former_ofw'] ? ($validated['former_ofw_country'] ?? null) : null,
            'former_ofw_return_date' => $validated['is_former_ofw'] ? ($validated['former_ofw_return_date'] ?? null) : null,
            'is_4ps_beneficiary' => $validated['is_4ps_beneficiary'],
            'household_id_4ps' => $validated['is_4ps_beneficiary'] ? ($validated['household_id_4ps'] ?? null) : null,
        ])->save();

        $this->markStepComplete($seeker, 'step2');

        return response()->json([
            'message' => 'Employment information saved.',
            'user' => $this->buildPayload($seeker),
        ]);
    }

    /**
     * POST /api/seeker/step-3   [auth:sanctum]
     *
     * Saves: Job Preferences (work type, location) and
     *        Preferred Occupations (writes to seeker_occupations table).
     */
    public function saveStep3(Request $request): JsonResponse
    {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $validated = $request->validate([
            'work_type_preference' => ['required', 'in:part_time,full_time'],
            'preferred_work_setups' => ['nullable', 'array', 'max:3'],
            'preferred_work_setups.*' => [
                'string',
                'distinct',
                Rule::in(['On-Site', 'Remote', 'Hybrid']),
            ],
            'preferred_employment_types' => ['nullable', 'array', 'max:6'],
            'preferred_employment_types.*' => [
                'string',
                'distinct',
                Rule::in([
                    'Permanent/Regular',
                    'Contractual',
                    'Project-Based',
                    'Seasonal',
                    'Part-Time',
                    'Freelance',
                ]),
            ],
            'preferred_work_location' => ['required', 'in:local,overseas'],
            'preferred_locations_details' => ['required', 'array', 'min:1', 'max:3'],
            'preferred_locations_details.*' => ['required', 'string', 'max:255', 'distinct'],
            'occupation_ids' => ['required_without:occupation_preferences', 'array', 'min:1', 'max:3'],
            'occupation_ids.*' => [
                'required',
                'integer',
                'distinct',
                'exists:occupations,id',
            ],
            'occupation_preferences' => ['required_without:occupation_ids', 'array', 'min:1', 'max:3'],
            'occupation_preferences.*.occupation_id' => ['nullable', 'integer', 'distinct', 'exists:occupations,id'],
            'occupation_preferences.*.general_term' => ['nullable', 'string', 'max:100', 'distinct'],
            'occupation_preferences.*.raw_job_title' => ['prohibited'],
        ]);

        $preferences = collect($validated['occupation_preferences'] ?? [])
            ->map(fn (array $preference) => [
                'occupation_id' => $preference['occupation_id'] ?? null,
                'general_term' => isset($preference['general_term'])
                    ? $this->normalizeOccupationTerm($preference['general_term'])
                    : null,
            ]);

        if ($preferences->isEmpty()) {
            $preferences = collect($validated['occupation_ids'] ?? [])
                ->map(fn ($occupationId) => [
                    'occupation_id' => $occupationId,
                    'general_term' => null,
                ]);
        }

        $invalidPreference = $preferences->first(function (array $preference) {
            $hasOccupation = $preference['occupation_id'] !== null;
            $hasGeneralTerm = $preference['general_term'] !== null && $preference['general_term'] !== '';

            return collect([$hasOccupation, $hasGeneralTerm])->filter()->count() !== 1;
        });

        if ($invalidPreference !== null) {
            return response()->json([
                'message' => 'Each occupation preference must contain a job family or catalog occupation.',
                'errors' => [
                    'occupation_preferences' => [
                        'Choose one available job family or catalog occupation for each preference.',
                    ],
                ],
            ], 422);
        }

        $generalGroups = collect(config('job_preferences.generalized_groups', []))
            ->keyBy(fn (array $group) => $this->normalizeOccupationTerm($group['term']));
        $unknownGeneralTerm = $preferences
            ->pluck('general_term')
            ->filter()
            ->first(fn (string $term) => ! $generalGroups->has($term));

        if ($unknownGeneralTerm !== null) {
            return response()->json([
                'message' => 'The selected job family is not available.',
                'errors' => [
                    'occupation_preferences' => ['Choose an available generalized job family.'],
                ],
            ], 422);
        }

        $preferenceData = [
            'work_type_preference' => $validated['work_type_preference'],
            'preferred_work_location' => $validated['preferred_work_location'],
            'preferred_locations_details' => $this->uniqueStringList(
                $validated['preferred_locations_details'] ?? []
            ),
        ];
        if (Schema::hasColumn('job_seekers', 'preferred_work_setups')) {
            $preferenceData['preferred_work_setups'] = $validated['preferred_work_setups'] ?? [];
        }
        if (Schema::hasColumn('job_seekers', 'preferred_employment_types')) {
            $preferenceData['preferred_employment_types'] = $validated['preferred_employment_types'] ?? [];
        }
        $seeker->forceFill($preferenceData)->save();

        // ── Sync occupations (delete + re-insert) ──
        $seeker->occupations()->delete();
        $occupations = Occupation::query()
            ->whereIn('id', $preferences->pluck('occupation_id')->filter())
            ->get()
            ->keyBy('id');

        foreach ($preferences as $index => $preference) {
            $occupation = $preference['occupation_id']
                ? $occupations->get($preference['occupation_id'])
                : null;
            $generalGroup = $preference['general_term']
                ? $generalGroups->get($preference['general_term'])
                : null;
            $title = $occupation?->title
                ?? $generalGroup['label'];

            SeekerOccupation::create([
                'seeker_id' => $seeker->getKey(),
                'occupation_id' => $occupation?->id,
                'general_term' => $preference['general_term'],
                'occupation_title' => $title,
                'raw_job_title' => null,
                'status' => $occupation ? 'standardized' : 'generalized',
                'preference_order' => $index + 1,
            ]);
        }

        $this->markStepComplete($seeker, 'step3');

        return response()->json([
            'message' => 'Job preferences saved.',
            'user' => $this->buildPayload($seeker),
        ]);
    }

    private function normalizeOccupationTerm(string $term): string
    {
        return Str::of($term)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }

    private function uniqueStringList(array $values): array
    {
        return collect($values)
            ->map(fn ($value) => Str::of((string) $value)->squish()->toString())
            ->filter()
            ->unique(fn (string $value) => Str::lower($value))
            ->values()
            ->all();
    }

    /**
     * POST /api/seeker/step-4   [auth:sanctum]
     *
     * Saves: Language / Dialect Proficiency
     *        (writes to seeker_languages table).
     *
     * Final step — marks profile_completed = true upon success.
     */
    public function saveStep4(Request $request): JsonResponse
    {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $request->merge([
            'languages' => collect($request->input('languages', []))
                ->map(function ($language) {
                    if (! is_array($language)) {
                        return $language;
                    }

                    $language['language'] = Str::lower(trim((string) ($language['language'] ?? '')));

                    return $language;
                })
                ->all(),
        ]);

        $validated = $request->validate([
            'languages' => ['required', 'array', 'min:1'],
            'languages.*.language' => [
                'required',
                'string',
                Rule::in(self::SUPPORTED_LANGUAGES),
                'distinct:ignore_case',
            ],
            'languages.*.language_other' => ['nullable', 'string', 'max:100'],
            'languages.*.can_read' => ['boolean'],
            'languages.*.can_write' => ['boolean'],
            'languages.*.can_speak' => ['boolean'],
            'languages.*.can_understand' => ['boolean'],
        ]);

        $languages = collect($validated['languages'])
            ->map(function (array $language) {
                $language['language'] = Str::lower(trim($language['language']));
                $language['language_other'] = $language['language'] === 'others'
                    ? Str::of((string) ($language['language_other'] ?? ''))->squish()->toString()
                    : null;

                return $language;
            });

        if ($languages->contains(
            fn (array $language) => $language['language'] === 'others'
                && $language['language_other'] === ''
        )) {
            return response()->json([
                'message' => 'Please specify the other language or dialect.',
                'errors' => [
                    'languages' => ['Specify the language or dialect selected under Others.'],
                ],
            ], 422);
        }

        // ── Sync languages (delete + re-insert) ──
        $seeker->languages()->delete();
        foreach ($languages as $lang) {
            // Only save if at least one proficiency is marked
            $hasAny = ($lang['can_read'] ?? false)
                   || ($lang['can_write'] ?? false)
                   || ($lang['can_speak'] ?? false)
                   || ($lang['can_understand'] ?? false);

            if ($hasAny) {
                SeekerLanguage::create([
                    'seeker_id' => $seeker->getKey(),
                    'language' => $lang['language'],
                    'language_other' => $lang['language_other'],
                    'can_read' => $lang['can_read'] ?? false,
                    'can_write' => $lang['can_write'] ?? false,
                    'can_speak' => $lang['can_speak'] ?? false,
                    'can_understand' => $lang['can_understand'] ?? false,
                ]);
            }
        }

        $this->markStepComplete($seeker, 'step4');

        return response()->json([
            'message' => 'Language proficiency saved.',
            'user' => $this->buildPayload($seeker),
        ]);
    }

    /**
     * POST /api/seeker/step-5   [auth:sanctum]
     *
     * Saves: Educational Background (writes to seeker_educations table) and
     *        Other Skills (JSON array in job_seekers table).
     */
    public function saveStep5(
        Request $request,
        SkillCategorizer $categorizer,
        SkillTaxonomyService $taxonomy,
        MatchingProfileService $matchingProfiles
    ): JsonResponse {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $validated = $request->validate([
            'currently_in_school' => ['required', 'boolean'],
            // Education array: one record per level (required, min 1)
            'educations' => ['nullable', 'array'],
            'educations.*.level' => ['required', 'string', 'in:elementary,secondary_non_k12,secondary_k12,senior_high_strand,tertiary,graduate_studies'],
            'educations.*.course_strand' => ['nullable', 'string', 'max:255'],
            'educations.*.year_graduated' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'educations.*.undergrad_level_reached' => ['nullable', 'string', 'max:255'],
            'educations.*.undergrad_year_last_attended' => ['nullable', 'integer', 'min:1900', 'max:2100'],

            // ── SKILLS: Three separate arrays (all optional) ──────────────────────
            // DOLE standard skills (Section VIII of NSRP Form)
            'dole_skills' => ['nullable', 'array'],
            'dole_skills.*' => ['required_with:dole_skills', 'string', 'max:255'],

            // Technical/Professional skills (custom, not on official NSRP form)
            'technical_skills' => ['nullable', 'array'],
            'technical_skills.*' => ['required_with:technical_skills', 'string', 'max:255'],

            // Soft/Interpersonal skills (custom, not on official NSRP form)
            'soft_skills' => ['nullable', 'array'],
            'soft_skills.*' => ['required_with:soft_skills', 'string', 'max:255'],
        ]);

        // ── Save main seeker fields ──
        $seeker->forceFill([
            'currently_in_school' => $validated['currently_in_school'],
        ])->save();

        // ── Sync educations (delete + re-insert) ──
        $seeker->educations()->delete();
        foreach ($validated['educations'] ?? [] as $edu) {
            $educationData = [
                'seeker_id' => $seeker->getKey(),
                'level' => $edu['level'],
                'course_strand' => $edu['course_strand'] ?? null,
                'year_graduated' => $edu['year_graduated'] ?? null,
                'undergrad_level_reached' => $edu['undergrad_level_reached'] ?? null,
                'undergrad_year_last_attended' => $edu['undergrad_year_last_attended'] ?? null,
            ];
            if (Schema::hasColumn('seeker_educations', 'normalized_course_strand')) {
                $educationData['normalized_course_strand'] = filled($edu['course_strand'] ?? null)
                    ? $matchingProfiles->normalize($edu['course_strand'])
                    : null;
            }
            SeekerEducation::create($educationData);
        }

        // ── Sync all skills (delete + re-insert) ──
        // Delete existing skills for this seeker
        $seeker->skills()->delete();

        // Insert DOLE standard skills
        if (! empty($validated['dole_skills'])) {
            foreach ($this->uniqueStringList($validated['dole_skills']) as $skillName) {
                $seeker->skills()->create([
                    'skill_name' => trim($skillName),
                    'skill_type' => 'dole_standard',
                ]);
            }
        }

        $categorizedSkills = $categorizer->canonicalizeSubmitted(
            $this->uniqueStringList($validated['technical_skills'] ?? []),
            $this->uniqueStringList($validated['soft_skills'] ?? [])
        );

        // Insert technical/professional skills
        if ($categorizedSkills['technical'] !== []) {
            foreach ($categorizedSkills['technical'] as $skillName) {
                $seeker->skills()->create([
                    'skill_name' => trim($skillName),
                    'skill_type' => 'technical',
                ]);
            }
        }

        // Insert soft/interpersonal skills
        if ($categorizedSkills['soft'] !== []) {
            foreach ($categorizedSkills['soft'] as $skillName) {
                $seeker->skills()->create([
                    'skill_name' => trim($skillName),
                    'skill_type' => 'soft',
                ]);
            }
        }

        $taxonomy->syncSeeker($seeker);

        $this->markStepComplete($seeker, 'step5');

        return response()->json([
            'message' => 'Educational background and skills saved.',
            'user' => $this->buildPayload($seeker),
        ]);
    }

    /**
     * POST /api/seeker/step-6   [auth:sanctum]
     *
     * Saves: Vocational/Technical Trainings (writes to seeker_trainings table) and
     *        Professional Eligibilities/Licenses (writes to seeker_eligibilities table).
     *        Both support dynamic Add/Remove rows.
     */
    public function saveStep6(
        Request $request,
        MatchingProfileService $matchingProfiles
    ): JsonResponse {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $validated = $request->validate([
            // Vocational trainings
            'trainings' => ['nullable', 'array'],
            'trainings.*.course' => ['required_with:trainings', 'string', 'max:255'],
            'trainings.*.hours_of_training' => ['nullable', 'integer', 'min:1'],
            'trainings.*.training_institution' => ['nullable', 'string', 'max:255'],
            'trainings.*.skills_acquired' => ['nullable', 'string', 'max:1000'],
            'trainings.*.certificates_received' => ['nullable', 'string', 'max:1000'],
            // Professional eligibilities/licenses
            'eligibilities' => ['nullable', 'array'],
            'eligibilities.*.type' => ['required_with:eligibilities', 'string', 'in:civil_service,professional_license'],
            'eligibilities.*.name' => ['required_with:eligibilities', 'string', 'max:255'],
            'eligibilities.*.date_taken' => ['nullable', 'required_with:eligibilities.*.valid_until', 'date', 'before_or_equal:today'],
            'eligibilities.*.valid_until' => ['nullable', 'date', 'after_or_equal:eligibilities.*.date_taken'],
        ]);

        // ── Sync trainings (delete + re-insert) ──
        $seeker->trainings()->delete();
        if (! empty($validated['trainings'])) {
            foreach ($validated['trainings'] as $training) {
                $trainingData = [
                    'seeker_id' => $seeker->getKey(),
                    'course' => $training['course'],
                    'hours_of_training' => $training['hours_of_training'] ?? null,
                    'training_institution' => $training['training_institution'] ?? null,
                    'skills_acquired' => $training['skills_acquired'] ?? null,
                    'certificates_received' => $training['certificates_received'] ?? null,
                ];
                if (Schema::hasColumn('seeker_trainings', 'normalized_course')) {
                    $trainingData['normalized_course'] = $matchingProfiles->normalize($training['course']);
                }
                if (Schema::hasColumn('seeker_trainings', 'normalized_certificates')) {
                    $trainingData['normalized_certificates'] = filled($training['certificates_received'] ?? null)
                        ? $matchingProfiles->normalize($training['certificates_received'])
                        : null;
                }
                SeekerTraining::create($trainingData);
            }
        }

        // ── Sync eligibilities (delete + re-insert) ──
        $seeker->eligibilities()->delete();
        if (! empty($validated['eligibilities'])) {
            foreach ($validated['eligibilities'] as $elig) {
                $eligibilityData = [
                    'seeker_id' => $seeker->getKey(),
                    'type' => $elig['type'],
                    'name' => $elig['name'],
                    'date_taken' => $elig['date_taken'] ?? null,
                    'valid_until' => $elig['valid_until'] ?? null,
                ];
                if (Schema::hasColumn('seeker_eligibilities', 'normalized_name')) {
                    $eligibilityData['normalized_name'] = $matchingProfiles->normalize($elig['name']);
                }
                SeekerEligibility::create($eligibilityData);
            }
        }

        $this->markStepComplete($seeker, 'step6');

        return response()->json([
            'message' => 'Trainings and eligibilities saved.',
            'user' => $this->buildPayload($seeker),
        ]);
    }

    /**
     * POST /api/seeker/step-7   [auth:sanctum]
     *
     * Saves: Work Experience (writes to seeker_work_experiences table).
     *        Supports dynamic Add/Remove rows.
     *        Final step — marks profile_completed = true upon success.
     */
    public function saveStep7(
        Request $request,
        OccupationTitleMatcher $occupationMatcher,
        MatchingProfileService $matchingProfiles
    ): JsonResponse {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $validated = $request->validate([
            'work_experiences' => ['nullable', 'array'],
            'work_experiences.*.occupation_id' => ['nullable', 'integer', 'exists:occupations,id'],
            'work_experiences.*.company_name' => ['required', 'string', 'max:255'],
            'work_experiences.*.company_address' => ['nullable', 'string', 'max:500'],
            'work_experiences.*.position' => ['required', 'string', 'max:255'],
            'work_experiences.*.number_of_months' => ['nullable', 'integer', 'min:0', 'max:600'],
            'work_experiences.*.employment_status' => ['nullable', 'string', 'in:permanent,contractual,part_time,probationary,temporary,seasonal'],
        ]);

        // ── Sync work experiences (delete + re-insert) ──
        $seeker->workExperiences()->delete();
        foreach ($validated['work_experiences'] ?? [] as $exp) {
            $match = isset($exp['occupation_id'])
                ? null
                : $occupationMatcher->match($exp['position']);
            $matchedOccupation = isset($exp['occupation_id'])
                ? Occupation::query()->find($exp['occupation_id'])
                : data_get($match, 'occupation');

            $experienceData = [
                'seeker_id' => $seeker->getKey(),
                'company_name' => $exp['company_name'],
                'company_address' => $exp['company_address'] ?? null,
                'position' => $exp['position'],
                'number_of_months' => $exp['number_of_months'] ?? null,
                'employment_status' => $exp['employment_status'] ?? null,
            ];
            if (Schema::hasColumn('seeker_work_experiences', 'occupation_id')) {
                $experienceData['occupation_id'] = $matchedOccupation?->id;
            }
            if (Schema::hasColumn('seeker_work_experiences', 'normalized_position')) {
                $experienceData['normalized_position'] = $matchingProfiles->normalize($exp['position']);
            }
            SeekerWorkExperience::create($experienceData);
        }

        $this->markStepComplete($seeker, 'step7');

        // ── Mark profile as fully complete ──
        $seeker->forceFill([
            'profile_completed' => true,
            'profile_completed_at' => Carbon::now(),
        ])->save();

        return response()->json([
            'message' => 'Profile completed! Welcome to i-PESO.',
            'user' => $this->buildPayload($seeker),
        ]);
    }

    /**
     * Helper: Build other_skills JSON array, including custom "others" value if provided.
     */
    private function buildOtherSkillsArray(array $validated): array
    {
        $skills = $validated['other_skills'] ?? [];

        // If 'others' is selected and custom text provided, add it
        if (in_array('others', $skills) && ! empty($validated['other_skills_others'])) {
            $skills[] = $validated['other_skills_others'];
        }

        return array_filter($skills);
    }
}
