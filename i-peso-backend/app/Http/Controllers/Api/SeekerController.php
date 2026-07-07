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
use App\Services\AddressService;
use App\Services\MatchingProfileService;
use App\Services\OccupationTitleMatcher;
use App\Services\SkillCategorizer;
use App\Services\SkillTaxonomyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SeekerController extends Controller
{
    private const EDUCATIONAL_ATTAINMENT_OPTIONS = [
        'Elementary Graduate',
        'High School Graduate',
        'Senior High School Graduate',
        'Vocational / Technical',
        'College Undergraduate',
        'College Graduate',
        "Master's Degree",
        'Doctorate',
    ];

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

    private function inferEducationalAttainment(array $educations): ?string
    {
        $bestAttainment = null;
        $bestRank = 0;

        foreach ($educations as $education) {
            $attainment = $this->mapEducationToAttainment($education);
            if (! filled($attainment)) {
                continue;
            }

            $rank = $this->educationalAttainmentRank($attainment);
            if ($rank > $bestRank) {
                $bestAttainment = $attainment;
                $bestRank = $rank;
            }
        }

        return $bestAttainment;
    }

    private function mapEducationToAttainment(array $education): ?string
    {
        $level = $this->normalizeEducationLevel($education['level'] ?? null);
        if (! filled($level)) {
            return null;
        }

        $status = $education['completion_status'] ?? (filled($education['year_graduated'] ?? null) ? 'graduated' : 'undergraduate');
        $isGraduated = $status === 'graduated';

        return match ($level) {
            'vocational' => $isGraduated || $status === 'currently_studying' ? 'Vocational / Technical' : null,
            'elementary' => $isGraduated ? 'Elementary Graduate' : null,
            'secondary_non_k12' => $isGraduated ? 'High School Graduate' : null,
            'secondary_k12', 'senior_high_strand' => $isGraduated ? 'Senior High School Graduate' : null,
            'tertiary' => $isGraduated ? 'College Graduate' : 'College Undergraduate',
            'graduate_studies' => $isGraduated ? $this->graduateStudiesAttainment($education['course_strand'] ?? null) : null,
            default => null,
        };
    }

    private function normalizeEducationLevel(?string $level): ?string
    {
        return match ($level) {
            'senior_high' => 'senior_high_strand',
            'graduate' => 'graduate_studies',
            default => $level,
        };
    }

    private function educationRequiresProgram(?string $level): bool
    {
        return in_array($this->normalizeEducationLevel($level), [
            'vocational',
            'senior_high_strand',
            'tertiary',
            'graduate_studies',
        ], true);
    }

    private function educationDuplicateKey(array $education): string
    {
        $endYear = $education['year_graduated']
            ?? $education['undergrad_year_last_attended']
            ?? (($education['completion_status'] ?? null) === 'currently_studying' ? 'present' : null)
            ?? '';

        return collect([
            $education['institution_name'] ?? '',
            $education['level'] ?? '',
            $education['course_strand'] ?? '',
            $education['year_started'] ?? '',
            $endYear,
        ])
            ->map(fn ($value) => Str::lower(Str::squish((string) $value)))
            ->implode('|');
    }

    private function graduateStudiesAttainment(?string $courseStrand): string
    {
        $normalized = Str::lower((string) $courseStrand);

        return preg_match('/\b(phd|ph\.d|doctor|doctorate|juris doctor)\b/i', $normalized)
            ? 'Doctorate'
            : "Master's Degree";
    }

    private function educationalAttainmentRank(string $attainment): int
    {
        return match ($attainment) {
            'Elementary Graduate' => 1,
            'High School Graduate' => 2,
            'Senior High School Graduate' => 3,
            'Vocational / Technical' => 4,
            'College Undergraduate' => 5,
            'College Graduate' => 6,
            "Master's Degree" => 7,
            'Doctorate' => 8,
            default => 0,
        };
    }

    private function resolveEducationalAttainment(array $validated): ?string
    {
        $explicit = Str::squish((string) ($validated['educ_attainment'] ?? ''));

        if ($explicit !== '') {
            return $explicit;
        }

        return $this->inferEducationalAttainment($validated['educations'] ?? []);
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
            'educ_attainment' => $seeker->educ_attainment,
            'form_validation_state' => $seeker->form_validation_state,
        ];
    }

    // ── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────

    /**
     * Lightweight dashboard bootstrap payload. Avoids loading the complete
     * onboarding profile and its document-heavy relationships.
     */
    public function dashboardSummary(Request $request): JsonResponse
    {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $counts = [];
        foreach ([
            'seeker_skills' => 'seekerSkills',
            'seeker_occupations' => 'occupations',
            'seeker_educations' => 'educations',
            'seeker_work_experiences' => 'workExperiences',
            'seeker_trainings' => 'trainings',
            'seeker_certificates' => 'certificates',
            'seeker_languages' => 'languages',
        ] as $table => $relation) {
            if (Schema::hasTable($table)) {
                $counts[] = $relation;
            }
        }

        if (Schema::hasTable('applications')) {
            $counts['applications as active_applications_count'] = fn ($query) => $query
                ->whereNotIn('status', ['hired', 'rejected']);
        }
        $seeker->loadCount($counts);

        $preferredOccupation = Schema::hasTable('seeker_occupations')
            ? $seeker->occupations()->first()
            : null;
        $savedJobIds = Schema::hasTable('seeker_saved_jobs')
            ? $seeker->savedJobs()->limit(100)->pluck('job_vacancies.post_id')->values()
            : collect();

        return response()->json([
            'user' => [
                'seeker_id' => $seeker->getKey(),
                'first_name' => $seeker->first_name,
                'middle_name' => $seeker->middle_name,
                'last_name' => $seeker->last_name,
                'suffix' => $seeker->suffix,
                'educ_attainment' => $seeker->educ_attainment,
                'latitude' => $seeker->latitude,
                'longitude' => $seeker->longitude,
                'profile_completed' => (bool) $seeker->profile_completed,
                'has_profile_image' => filled($seeker->profile_image),
                'has_resume' => filled($seeker->resume_path),
                'occupations' => $preferredOccupation ? [[
                    'occupation_title' => $preferredOccupation->occupation_title,
                    'general_term' => $preferredOccupation->general_term,
                    'raw_job_title' => $preferredOccupation->raw_job_title,
                ]] : [],
                'dashboard_stats' => [
                    'active_applications' => (int) ($seeker->active_applications_count ?? 0),
                    'skills' => (int) ($seeker->seeker_skills_count ?? 0),
                    'saved_jobs' => $savedJobIds,
                ],
                'profile_strength' => $this->dashboardProfileStrength($seeker),
            ],
        ]);
    }

    private function dashboardProfileStrength(JobSeeker $seeker): array
    {
        $items = [
            ['key' => 'photo', 'label' => 'Professional 2x2 photo', 'weight' => 10, 'complete' => filled($seeker->profile_image)],
            ['key' => 'personal_information', 'label' => 'Personal information', 'weight' => 10, 'complete' => filled($seeker->date_of_birth) && filled($seeker->mobile_number) && filled($seeker->first_name)],
            ['key' => 'address', 'label' => 'Complete address', 'weight' => 10, 'complete' => filled($seeker->address_barangay) && filled($seeker->address_municipality_city)],
            ['key' => 'occupations', 'label' => 'Job preferences', 'weight' => 10, 'complete' => (int) ($seeker->occupations_count ?? 0) > 0],
            ['key' => 'skills', 'label' => 'Skills profile', 'weight' => 10, 'complete' => (int) ($seeker->seeker_skills_count ?? 0) >= 3],
            ['key' => 'education', 'label' => 'Education background', 'weight' => 15, 'complete' => filled($seeker->educ_attainment) || (int) ($seeker->educations_count ?? 0) > 0],
            ['key' => 'work_experience', 'label' => 'Work experience', 'weight' => 15, 'complete' => (int) ($seeker->work_experiences_count ?? 0) > 0],
            ['key' => 'training', 'label' => 'Training & certificates', 'weight' => 10, 'complete' => (int) ($seeker->trainings_count ?? 0) > 0 || (int) ($seeker->certificates_count ?? 0) > 0],
            ['key' => 'languages', 'label' => 'Language proficiency', 'weight' => 10, 'complete' => (int) ($seeker->languages_count ?? 0) > 0],
        ];
        $completedWeight = collect($items)->where('complete', true)->sum('weight');

        return [
            'percentage' => (int) round($completedWeight),
            'items' => $items,
            'coreComplete' => collect(array_slice($items, 0, 5))->where('complete', true)->count(),
            'coreTotal' => 5,
        ];
    }

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
            'certificates.training',
            'savedJobs',
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
                'self_employed_type_others' => $seeker->self_employed_type_others,
                'unemployment_months' => $seeker->unemployment_months,
                'unemployment_reason' => $seeker->unemployment_reason,
                'unemployment_reason_others' => $seeker->unemployment_reason_others,
                'unemployment_terminated_country' => $seeker->unemployment_terminated_country,
                'is_ofw' => $seeker->is_ofw,
                'ofw_country' => $seeker->ofw_country,
                'is_former_ofw' => $seeker->is_former_ofw,
                'former_ofw_country' => $seeker->former_ofw_country,
                'former_ofw_return_date' => $seeker->former_ofw_return_date?->format('Y-m-d'),
                'work_type_preference' => $seeker->work_type_preference,
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
                    'category' => $certificate->category,
                    'issued_at' => $certificate->issued_at?->format('Y-m-d'),
                    'expires_at' => $certificate->expires_at?->format('Y-m-d'),
                    'credential_number' => $certificate->credential_number,
                    'description' => $certificate->description,
                    'training_id' => $certificate->training_id,
                    'training' => $certificate->training ? [
                        'id' => $certificate->training->getKey(),
                        'course' => $certificate->training->course,
                        'training_institution' => $certificate->training->training_institution,
                    ] : null,
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
                    'saved_jobs' => clone $seeker->savedJobs->pluck('post_id'),
                ],
                'profile_strength' => $this->profileStrength($seeker),
            ]),
        ]);
    }

    /**
     * Calculate profile strength based on critical profile components.
     * Focuses on core employment profile data rather than optional features.
     *
     * Scoring:
     * - Core items (required): Photo, Personal Info, Address, Skills, Occupations = 50%
     * - Work Profile items (important): Education, Work Experience = 30%
     * - Enhancement items (optional): Training/Certificates, Languages = 20%
     */
    private function profileStrength(JobSeeker $seeker): array
    {
        // Core profile items (foundation - 50% weight)
        $coreItems = [
            ['key' => 'photo', 'label' => 'Professional 2x2 photo', 'weight' => 10, 'complete' => filled($seeker->profile_image)],
            ['key' => 'personal_information', 'label' => 'Personal information', 'weight' => 10, 'complete' => filled($seeker->date_of_birth) && filled($seeker->mobile_number) && filled($seeker->first_name)],
            ['key' => 'address', 'label' => 'Complete address', 'weight' => 10, 'complete' => filled($seeker->address_barangay) && filled($seeker->address_municipality_city)],
            ['key' => 'occupations', 'label' => 'Job preferences', 'weight' => 10, 'complete' => $seeker->occupations->isNotEmpty()],
            ['key' => 'skills', 'label' => 'Skills profile', 'weight' => 10, 'complete' => $seeker->seekerSkills->count() >= 3],
        ];

        // Work profile items (important - 30% weight)
        $workItems = [
            ['key' => 'education', 'label' => 'Education background', 'weight' => 15, 'complete' => filled($seeker->educ_attainment) || $seeker->educations->isNotEmpty()],
            ['key' => 'work_experience', 'label' => 'Work experience', 'weight' => 15, 'complete' => $seeker->workExperiences->isNotEmpty()],
        ];

        // Enhancement items (optional - 20% weight)
        $enhancementItems = [
            ['key' => 'training', 'label' => 'Training & certificates', 'weight' => 10, 'complete' => $seeker->trainings->isNotEmpty() || $seeker->certificates->isNotEmpty()],
            ['key' => 'languages', 'label' => 'Language proficiency', 'weight' => 10, 'complete' => $seeker->languages->isNotEmpty()],
        ];

        $allItems = array_merge($coreItems, $workItems, $enhancementItems);

        // Calculate weighted percentage
        $totalWeight = collect($allItems)->sum('weight');
        $completedWeight = collect($allItems)
            ->filter(fn ($item) => $item['complete'])
            ->sum('weight');

        $percentage = (int) round(($completedWeight / $totalWeight) * 100);

        return [
            'percentage' => $percentage,
            'items' => $allItems,
            'coreComplete' => collect($coreItems)->where('complete', true)->count(),
            'coreTotal' => count($coreItems),
        ];
    }

    /**
     * POST /api/seeker/step-1   [auth:sanctum]
     *
     * Saves: Personal Information, Present Address,
     *        and Disability Status (writes to seeker_disabilities table).
     */
    public function saveStep1(Request $request): JsonResponse
    {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $minimumBirthDate = today()->subYears(15)->toDateString();

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'in:,Jr.,Sr.,II,III,IV,V'],
            'date_of_birth' => ['required', 'date', 'before_or_equal:'.$minimumBirthDate],
            'sex' => ['required', 'in:male,female'],
            'civil_status' => ['required', 'in:single,married,widowed,separated'],
            'religion' => ['required', 'string', 'in:roman_catholic,islam,iglesia_ni_cristo,aglipayan,evangelical,seventh_day_adventist,jehovah_witness,buddhist,hindu,jewish,agnostic_atheist,declined,other'],
            'religion_other' => ['nullable', 'string', 'max:100', 'required_if:religion,other'],
            'height_ft' => ['required', 'numeric', 'between:2.5,8.5'],
            'tin' => ['nullable', 'string', 'max:20'],
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
        ]);
        
        $addressService = new AddressService();
        $seeker->full_address = $addressService->buildFullAddress(
            $validated['address_house_street'],
            $validated['address_barangay'],
            $validated['address_municipality_city'],
            $validated['address_province']
        );
        $seeker->address_region_code = substr($validated['address_province_code'] ?? '', 0, 2) ?: null;
        if (isset($validated['latitude']) && isset($validated['longitude'])) {
            $seeker->location_verified_at = now();
        }

        $seeker->save();

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
            'self_employed_type' => ['nullable', 'required_if:employment_type,self_employed', Rule::in([
                'fisherman_fisherfolk',
                'vendor_retailer',
                'home_based_worker',
                'transport',
                'domestic_worker',
                'freelancer',
                'artisan_craft_worker',
                'others',
            ])],
            'self_employed_type_others' => ['nullable', 'required_if:self_employed_type,others', 'string', 'max:255'],
            // Unemployed sub-fields
            'unemployment_months' => ['nullable', 'required_if:employment_status,unemployed', 'integer', 'min:0', 'max:999'],
            'unemployment_reason' => ['nullable', 'required_if:employment_status,unemployed', Rule::in([
                'fresh_graduate',
                'finished_contract',
                'resigned',
                'retired',
                'terminated_local',
                'terminated_abroad',
                'terminated_calamity',
                'others',
            ])],
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
            'occupation_preferences.*.general_term' => ['nullable', 'string', 'max:100'],
            'occupation_preferences.*.broad_field' => ['nullable', 'string', 'max:100'],
            'occupation_preferences.*.role_function' => ['nullable', 'string', 'max:100'],
            'occupation_preferences.*.confidence' => ['nullable', 'integer', 'min:0', 'max:100'],
            'occupation_preferences.*.raw_job_title' => ['nullable', 'string', 'min:2', 'max:150', 'distinct:ignore_case'],
            'occupation_preferences.*.source' => ['nullable', 'string', Rule::in(['catalog', 'dictionary', 'ai', 'ai_generated', 'manual', 'user_selected_broad_field'])],
        ]);

        $preferences = collect($validated['occupation_preferences'] ?? [])
            ->map(fn (array $preference) => [
                'occupation_id' => $preference['occupation_id'] ?? null,
                'general_term' => isset($preference['general_term'])
                    ? $this->normalizeOccupationTerm($preference['general_term'])
                    : null,
                'broad_field' => $preference['broad_field'] ?? null,
                'role_function' => $preference['role_function'] ?? null,
                'confidence' => $preference['confidence'] ?? null,
                'raw_job_title' => filled($preference['raw_job_title'] ?? null)
                    ? Str::of($preference['raw_job_title'])->squish()->limit(150, '')->toString()
                    : null,
                'source' => $preference['source'] ?? null,
            ]);

        if ($preferences->isEmpty()) {
            $preferences = collect($validated['occupation_ids'] ?? [])
                ->map(fn ($occupationId) => [
                    'occupation_id' => $occupationId,
                    'general_term' => null,
                    'broad_field' => null,
                    'role_function' => null,
                    'confidence' => null,
                    'raw_job_title' => null,
                    'source' => null,
                ]);
        }

        $invalidPreference = $preferences->first(function (array $preference) {
            $hasOccupation = $preference['occupation_id'] !== null;
            $hasGeneralTerm = $preference['general_term'] !== null && $preference['general_term'] !== '';
            $hasRawTitle = $preference['raw_job_title'] !== null && $preference['raw_job_title'] !== '';

            if ($hasOccupation && ($hasGeneralTerm || $hasRawTitle)) {
                return true;
            }

            return ! $hasOccupation && ! $hasGeneralTerm && ! $hasRawTitle;
        });

        if ($invalidPreference !== null) {
            return response()->json([
                'message' => 'Each occupation preference must contain one catalog occupation, job family, or AI-suggested job title.',
                'errors' => [
                    'occupation_preferences' => [
                        'Choose one available occupation, job family, or AI-suggested job title.',
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
                ?? $preference['raw_job_title']
                ?? $generalGroup['label'];

            SeekerOccupation::create([
                'seeker_id' => $seeker->getKey(),
                'occupation_id' => $occupation?->id,
                'general_term' => $preference['general_term'],
                'broad_field' => $preference['broad_field'],
                'role_function' => $preference['role_function'],
                'confidence' => $preference['confidence'],
                'source' => $preference['source'],
                'occupation_title' => $title,
                'raw_job_title' => $preference['raw_job_title'],
                'status' => match (true) {
                    (bool) $occupation => 'standardized',
                    (bool) $generalGroup => 'generalized',
                    in_array($preference['source'], ['ai', 'ai_generated']) => 'ai_generated',
                    $preference['source'] === 'user_selected_broad_field' => 'generalized',
                    default => 'custom_pending',
                },
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

    private function normalizeSubmittedSkillItems(array $values): array
    {
        return collect($values)
            ->map(function ($value): array {
                if (is_array($value)) {
                    $name = Str::of((string) ($value['name'] ?? $value['skill_name'] ?? ''))->squish()->toString();
                    $proficiency = (string) ($value['proficiency'] ?? 'intermediate');
                    $source = $this->normalizeSkillSource((string) ($value['source'] ?? 'system'));
                    $isOfficial = (bool) ($value['is_official'] ?? false);
                    $isRecommended = (bool) ($value['is_recommended'] ?? false);
                } else {
                    $name = Str::of((string) $value)->squish()->toString();
                    $proficiency = 'intermediate';
                    $source = 'system';
                    $isOfficial = false;
                    $isRecommended = false;
                }

                return [
                    'name' => $name,
                    'proficiency' => $this->normalizeSkillProficiency($proficiency),
                    'source' => $source,
                    'is_official' => $source === 'dole' || $isOfficial,
                    'is_recommended' => $isRecommended,
                ];
            })
            ->filter(fn (array $skill): bool => filled($skill['name']))
            ->unique(fn (array $skill): string => Str::lower($skill['name']))
            ->values()
            ->all();
    }

    private function skillItemNames(array $items): array
    {
        return collect($items)->pluck('name')->filter()->values()->all();
    }

    private function proficiencyForSkill(array $items, string $skillName): string
    {
        $normalized = Str::lower(Str::squish($skillName));
        $match = collect($items)->first(
            fn (array $item): bool => Str::lower(Str::squish($item['name'])) === $normalized
        );

        return $match['proficiency'] ?? 'intermediate';
    }

    private function skillSourceMetadata(array $items, string $skillName): array
    {
        $normalized = Str::lower(Str::squish($skillName));
        $match = collect($items)->first(
            fn (array $item): bool => Str::lower(Str::squish($item['name'])) === $normalized
        );

        return $this->filterSkillSourceMetadata([
            'source' => $match['source'] ?? 'system',
            'is_official' => (bool) ($match['is_official'] ?? false),
            'is_recommended' => (bool) ($match['is_recommended'] ?? false),
        ]);
    }

    private function filterSkillSourceMetadata(array $metadata): array
    {
        return collect($metadata)
            ->filter(fn ($value, string $column): bool => Schema::hasColumn('seeker_skills', $column))
            ->all();
    }

    private function normalizeSkillSource(string $source): string
    {
        return in_array($source, ['dole', 'esco', 'user_added', 'occupation_recommended', 'system'], true)
            ? $source
            : 'system';
    }

    private function normalizeSkillProficiency(string $value): string
    {
        return in_array($value, ['beginner', 'intermediate', 'expert'], true)
            ? $value
            : 'intermediate';
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

        $currentYear = (int) now()->year;
        $maxExpectedGraduationYear = $currentYear + 15;

        $request->merge([
            'educations' => collect($request->input('educations', []))
                ->map(function ($education) {
                    if (! is_array($education)) {
                        return $education;
                    }

                    $level = $this->normalizeEducationLevel($education['level'] ?? null);
                    $status = $education['completion_status']
                        ?? (filled($education['year_graduated'] ?? null) ? 'graduated' : 'undergraduate');

                    $education['level'] = $level;
                    $education['completion_status'] = $status;

                    if (! $this->educationRequiresProgram($level)) {
                        $education['course_strand'] = null;
                    }

                    if ($status === 'graduated') {
                        $education['expected_year_graduated'] = null;
                        $education['undergrad_level_reached'] = null;
                        $education['undergrad_year_last_attended'] = null;
                        $education['current_level'] = null;
                    } elseif ($status === 'undergraduate') {
                        $education['year_graduated'] = null;
                        $education['expected_year_graduated'] = null;
                        $education['current_level'] = null;
                    } elseif ($status === 'currently_studying') {
                        $education['year_graduated'] = null;
                        $education['undergrad_level_reached'] = null;
                        $education['undergrad_year_last_attended'] = null;
                    }

                    return $education;
                })
                ->all(),
        ]);

        if (! $request->has('currently_in_school')) {
            $request->merge([
                'currently_in_school' => collect($request->input('educations', []))
                    ->contains(fn ($education) => ($education['completion_status'] ?? null) === 'currently_studying'),
            ]);
        }

        $validator = Validator::make($request->all(), [
            'educ_attainment' => ['nullable', 'string', Rule::in(self::EDUCATIONAL_ATTAINMENT_OPTIONS)],
            'currently_in_school' => ['required', 'boolean'],
            'educations' => ['required', 'array', 'min:1'],
            'educations.*.attainment_level' => ['nullable', 'string', 'in:elementary_undergraduate,elementary_graduate,high_school_undergraduate,high_school_graduate,senior_high_undergraduate,senior_high_graduate,vocational,college_undergraduate,college_graduate,post_graduate'],
            'educations.*.level' => ['required', 'string', 'in:elementary,secondary_non_k12,secondary_k12,senior_high_strand,vocational,tertiary,graduate_studies'],
            'educations.*.institution_name' => ['required', 'string', 'max:255'],
            'educations.*.course_strand' => ['nullable', 'string', 'max:255'],
            'educations.*.completion_status' => ['required', 'string', 'in:graduated,undergraduate,currently_studying'],
            'educations.*.year_started' => ['required', 'integer', 'min:1950', 'max:'.$currentYear],
            'educations.*.year_graduated' => ['nullable', 'integer', 'min:1900', 'max:'.$currentYear],
            'educations.*.expected_year_graduated' => ['nullable', 'integer', 'min:'.$currentYear, 'max:'.$maxExpectedGraduationYear],
            'educations.*.undergrad_level_reached' => ['nullable', 'string', 'max:255'],
            'educations.*.undergrad_year_last_attended' => ['nullable', 'integer', 'min:1900', 'max:'.$currentYear],
            'educations.*.current_level' => ['nullable', 'string', 'max:100'],

            // ── SKILLS: Three separate arrays (all optional) ──────────────────────
            // DOLE standard skills (Section VIII of NSRP Form)
            'dole_skills' => ['nullable', 'array'],
            'dole_skills.*' => ['required_with:dole_skills'],
            'dole_skills.*.skill_id' => ['sometimes', 'nullable', 'integer'],
            'dole_skills.*.name' => ['sometimes', 'string', 'max:255'],
            'dole_skills.*.skill_name' => ['sometimes', 'string', 'max:255'],
            'dole_skills.*.proficiency' => ['sometimes', Rule::in(['beginner', 'intermediate', 'expert'])],
            'dole_skills.*.source' => ['sometimes', 'string', Rule::in(['dole', 'esco', 'user_added', 'occupation_recommended', 'system'])],
            'dole_skills.*.is_official' => ['sometimes', 'boolean'],
            'dole_skills.*.is_recommended' => ['sometimes', 'boolean'],

            // Technical/Professional skills (custom, not on official NSRP form)
            'technical_skills' => ['nullable', 'array', 'max:20'],
            'technical_skills.*' => ['required_with:technical_skills'],
            'technical_skills.*.skill_id' => ['sometimes', 'nullable', 'integer'],
            'technical_skills.*.name' => ['sometimes', 'string', 'max:255'],
            'technical_skills.*.skill_name' => ['sometimes', 'string', 'max:255'],
            'technical_skills.*.proficiency' => ['sometimes', Rule::in(['beginner', 'intermediate', 'expert'])],
            'technical_skills.*.source' => ['sometimes', 'string', Rule::in(['dole', 'esco', 'user_added', 'occupation_recommended', 'system'])],
            'technical_skills.*.is_official' => ['sometimes', 'boolean'],
            'technical_skills.*.is_recommended' => ['sometimes', 'boolean'],

            // Soft/Interpersonal skills (custom, not on official NSRP form)
            'soft_skills' => ['nullable', 'array', 'max:10'],
            'soft_skills.*' => ['required_with:soft_skills'],
            'soft_skills.*.skill_id' => ['sometimes', 'nullable', 'integer'],
            'soft_skills.*.name' => ['sometimes', 'string', 'max:255'],
            'soft_skills.*.skill_name' => ['sometimes', 'string', 'max:255'],
            'soft_skills.*.proficiency' => ['sometimes', Rule::in(['beginner', 'intermediate', 'expert'])],
            'soft_skills.*.source' => ['sometimes', 'string', Rule::in(['dole', 'esco', 'user_added', 'occupation_recommended', 'system'])],
            'soft_skills.*.is_official' => ['sometimes', 'boolean'],
            'soft_skills.*.is_recommended' => ['sometimes', 'boolean'],
        ]);

        $validator->after(function ($validator) use ($request, $currentYear): void {
            $seenEducationRecords = [];

            foreach ($request->input('educations', []) as $index => $education) {
                $level = $education['level'] ?? null;
                $status = $education['completion_status'] ?? null;
                $attainmentLevel = $education['attainment_level'] ?? null;
                $yearStarted = isset($education['year_started']) ? (int) $education['year_started'] : null;

                if (in_array($attainmentLevel, ['elementary_undergraduate', 'high_school_undergraduate', 'senior_high_undergraduate', 'college_undergraduate'], true) && $status === 'graduated') {
                    $validator->errors()->add(
                        "educations.{$index}.completion_status",
                        'Graduated is not a valid status for an undergraduate education level.'
                    );
                }

                if (in_array($attainmentLevel, ['elementary_graduate', 'high_school_graduate', 'senior_high_graduate', 'college_graduate'], true) && $status !== 'graduated') {
                    $validator->errors()->add(
                        "educations.{$index}.completion_status",
                        'Graduate education levels must use the Graduated status.'
                    );
                }

                if ($this->educationRequiresProgram($level) && ! filled($education['course_strand'] ?? null)) {
                    $validator->errors()->add(
                        "educations.{$index}.course_strand",
                        $level === 'senior_high_strand' ? 'Strand is required.' : 'Course or program is required.'
                    );
                }

                if ($status === 'graduated') {
                    $yearGraduated = isset($education['year_graduated']) ? (int) $education['year_graduated'] : null;

                    if (! filled($education['year_graduated'] ?? null)) {
                        $validator->errors()->add("educations.{$index}.year_graduated", 'Year graduated is required.');
                    } elseif ($yearStarted && $yearGraduated < $yearStarted) {
                        $validator->errors()->add("educations.{$index}.year_graduated", 'Year graduated must not be earlier than year started.');
                    }
                }

                if ($status === 'undergraduate') {
                    $yearLastAttended = isset($education['undergrad_year_last_attended'])
                        ? (int) $education['undergrad_year_last_attended']
                        : null;

                    if (! filled($education['undergrad_level_reached'] ?? null)) {
                        $validator->errors()->add("educations.{$index}.undergrad_level_reached", 'Level reached is required for undergraduate entries.');
                    }

                    if (! filled($education['undergrad_year_last_attended'] ?? null)) {
                        $validator->errors()->add("educations.{$index}.undergrad_year_last_attended", 'Year last attended is required for undergraduate entries.');
                    } elseif ($yearStarted && $yearLastAttended < $yearStarted) {
                        $validator->errors()->add("educations.{$index}.undergrad_year_last_attended", 'Year last attended must not be earlier than year started.');
                    } elseif ($yearLastAttended > $currentYear) {
                        $validator->errors()->add("educations.{$index}.undergrad_year_last_attended", 'Year last attended must not be in the future.');
                    }
                }

                if ($status === 'currently_studying') {
                    $expectedYearGraduated = isset($education['expected_year_graduated'])
                        ? (int) $education['expected_year_graduated']
                        : null;

                    if (
                        ! filled($education['expected_year_graduated'] ?? null)
                        && ! filled($education['current_level'] ?? null)
                    ) {
                        $validator->errors()->add("educations.{$index}.expected_year_graduated", 'Expected graduation year is required for currently studying entries.');
                    } elseif (filled($education['expected_year_graduated'] ?? null) && $yearStarted && $expectedYearGraduated < $yearStarted) {
                        $validator->errors()->add("educations.{$index}.expected_year_graduated", 'Expected graduation year must not be earlier than year started.');
                    }
                }

                $duplicateKey = $this->educationDuplicateKey($education);
                if (in_array($duplicateKey, $seenEducationRecords, true)) {
                    $validator->errors()->add("educations.{$index}", 'Duplicate education records are not allowed.');
                }

                $seenEducationRecords[] = $duplicateKey;
            }

            $doleSkillCount = count($this->normalizeSubmittedSkillItems($request->input('dole_skills', [])));
            $technicalSkillCount = count($this->normalizeSubmittedSkillItems($request->input('technical_skills', [])));
            $softSkillCount = count($this->normalizeSubmittedSkillItems($request->input('soft_skills', [])));

            if (($doleSkillCount + $technicalSkillCount) > 20) {
                $validator->errors()->add('technical_skills', 'Select up to 20 hard skills.');
            }

            if ($softSkillCount > 10) {
                $validator->errors()->add('soft_skills', 'Select up to 10 soft skills.');
            }
        });

        $validated = $validator->validate();
        $resolvedEducAttainment = $this->resolveEducationalAttainment($validated);

        // Save main seeker fields
        $seeker->forceFill([
            'educ_attainment' => $resolvedEducAttainment,
            'currently_in_school' => $validated['currently_in_school'],
        ])->save();

        // ── Sync educations (delete + re-insert) ──
        $seeker->educations()->delete();
        foreach ($validated['educations'] ?? [] as $edu) {
            $status = $edu['completion_status'];
            $yearGraduated = $edu['year_graduated'] ?? null;
            $yearLastAttended = $edu['undergrad_year_last_attended'] ?? null;
            $educationData = [
                'seeker_id' => $seeker->getKey(),
                'level' => $edu['level'],
                'course_strand' => filled($edu['course_strand'] ?? null) ? Str::squish($edu['course_strand']) : null,
                'year_graduated' => $status === 'graduated' ? $yearGraduated : null,
                'undergrad_level_reached' => $status === 'undergraduate'
                    ? (filled($edu['undergrad_level_reached'] ?? null) ? Str::squish((string) $edu['undergrad_level_reached']) : null)
                    : null,
                'undergrad_year_last_attended' => $status === 'undergraduate' ? $yearLastAttended : null,
            ];
            if (Schema::hasColumn('seeker_educations', 'institution_name')) {
                $educationData['institution_name'] = Str::squish((string) $edu['institution_name']);
            }
            if (Schema::hasColumn('seeker_educations', 'completion_status')) {
                $educationData['completion_status'] = $status;
            }
            if (Schema::hasColumn('seeker_educations', 'year_started')) {
                $educationData['year_started'] = $edu['year_started'];
            }
            if (Schema::hasColumn('seeker_educations', 'expected_year_graduated')) {
                $educationData['expected_year_graduated'] = $status === 'currently_studying'
                    ? ($edu['expected_year_graduated'] ?? null)
                    : null;
            }
            if (Schema::hasColumn('seeker_educations', 'current_level')) {
                $educationData['current_level'] = $status === 'currently_studying'
                    ? Str::squish((string) ($edu['current_level'] ?? ''))
                    : null;
            } elseif ($status === 'currently_studying') {
                $educationData['undergrad_level_reached'] = Str::squish((string) ($edu['current_level'] ?? ''));
            }
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
        $doleSkillItems = $this->normalizeSubmittedSkillItems($validated['dole_skills'] ?? []);
        if ($doleSkillItems !== []) {
            foreach ($doleSkillItems as $skill) {
                $skillData = [
                    'skill_name' => trim($skill['name']),
                    'skill_type' => 'dole_standard',
                ];
                $skillData = array_merge($skillData, $this->filterSkillSourceMetadata([
                    'source' => 'dole',
                    'is_official' => true,
                    'is_recommended' => $skill['is_recommended'],
                ]));
                if (Schema::hasColumn('seeker_skills', 'proficiency')) {
                    $skillData['proficiency'] = $skill['proficiency'];
                }
                $seeker->skills()->create($skillData);
            }
        }

        $technicalSkillItems = $this->normalizeSubmittedSkillItems($validated['technical_skills'] ?? []);
        $softSkillItems = $this->normalizeSubmittedSkillItems($validated['soft_skills'] ?? []);
        $submittedSkillItems = array_merge($doleSkillItems, $technicalSkillItems, $softSkillItems);

        $categorizedSkills = $categorizer->canonicalizeSubmitted(
            $this->skillItemNames($technicalSkillItems),
            $this->skillItemNames($softSkillItems)
        );

        // Insert technical/professional skills
        if ($categorizedSkills['technical'] !== []) {
            foreach ($categorizedSkills['technical'] as $skillName) {
                $skillData = [
                    'skill_name' => trim($skillName),
                    'skill_type' => 'technical',
                ];
                $skillData = array_merge($skillData, $this->skillSourceMetadata($submittedSkillItems, $skillName));
                if (Schema::hasColumn('seeker_skills', 'proficiency')) {
                    $skillData['proficiency'] = $this->proficiencyForSkill($submittedSkillItems, $skillName);
                }
                $seeker->skills()->create($skillData);
            }
        }

        // Insert soft/interpersonal skills
        if ($categorizedSkills['soft'] !== []) {
            foreach ($categorizedSkills['soft'] as $skillName) {
                $skillData = [
                    'skill_name' => trim($skillName),
                    'skill_type' => 'soft',
                ];
                $skillData = array_merge($skillData, $this->skillSourceMetadata($submittedSkillItems, $skillName));
                if (Schema::hasColumn('seeker_skills', 'proficiency')) {
                    $skillData['proficiency'] = $this->proficiencyForSkill($submittedSkillItems, $skillName);
                }
                $seeker->skills()->create($skillData);
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
                    'course' => Str::squish($training['course']),
                    'hours_of_training' => $training['hours_of_training'] ?? null,
                    'training_institution' => filled($training['training_institution'] ?? null)
                        ? Str::squish($training['training_institution'])
                        : null,
                    'skills_acquired' => filled($training['skills_acquired'] ?? null)
                        ? Str::squish($training['skills_acquired'])
                        : null,
                    'certificates_received' => filled($training['certificates_received'] ?? null)
                        ? Str::squish($training['certificates_received'])
                        : null,
                ];
                if (Schema::hasColumn('seeker_trainings', 'normalized_course')) {
                    $trainingData['normalized_course'] = $matchingProfiles->normalize($trainingData['course']);
                }
                if (Schema::hasColumn('seeker_trainings', 'normalized_certificates')) {
                    $trainingData['normalized_certificates'] = filled($trainingData['certificates_received'])
                        ? $matchingProfiles->normalize($trainingData['certificates_received'])
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
                    'name' => Str::squish($elig['name']),
                    'date_taken' => $elig['date_taken'] ?? null,
                    'valid_until' => $elig['valid_until'] ?? null,
                ];
                if (Schema::hasColumn('seeker_eligibilities', 'normalized_name')) {
                    $eligibilityData['normalized_name'] = $matchingProfiles->normalize($eligibilityData['name']);
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
            'work_experiences.*.company_name' => ['required', 'string', 'max:255'],
            'work_experiences.*.company_address' => ['nullable', 'string', 'max:500'],
            'work_experiences.*.occupation_id' => ['nullable', 'integer', 'exists:occupations,id'],
            'work_experiences.*.position' => ['required', 'string', 'max:255'],
            'work_experiences.*.responsibilities' => ['nullable', 'string', 'max:1000'],
            'work_experiences.*.number_of_months' => ['nullable', 'integer', 'min:0', 'max:600'],
            'work_experiences.*.start_date' => ['nullable', 'date', 'before_or_equal:today'],
            'work_experiences.*.end_date' => ['nullable', 'date', 'before_or_equal:today'],
            'work_experiences.*.currently_employed' => ['nullable', 'boolean'],
            'work_experiences.*.employment_status' => ['nullable', 'string', Rule::in([
                'permanent',
                'contractual',
                'part_time',
                'project_based',
                'casual',
                'probationary',
                'temporary',
                'seasonal',
                'internship',
                'ojt',
                'freelance',
                'self_employed',
            ])],
        ]);

        foreach ($validated['work_experiences'] ?? [] as $index => $exp) {
            if (
                ! ($exp['currently_employed'] ?? false)
                && filled($exp['start_date'] ?? null)
                && filled($exp['end_date'] ?? null)
                && $exp['end_date'] < $exp['start_date']
            ) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => [
                        "work_experiences.$index.end_date" => [
                            'End date cannot be earlier than start date.',
                        ],
                    ],
                ], 422);
            }
        }

        // ── Sync work experiences (delete + re-insert) ──
        $seeker->workExperiences()->delete();
        $selectedOccupations = Occupation::query()
            ->whereIn(
                'id',
                collect($validated['work_experiences'] ?? [])
                    ->pluck('occupation_id')
                    ->filter()
                    ->unique()
                    ->values()
            )
            ->get()
            ->keyBy('id');

        foreach ($validated['work_experiences'] ?? [] as $exp) {
            $position = Str::squish($exp['position']);
            $selectedOccupation = filled($exp['occupation_id'] ?? null)
                ? $selectedOccupations->get((int) $exp['occupation_id'])
                : null;
            $matchedOccupation = $selectedOccupation
                ?: data_get($occupationMatcher->match($position), 'occupation');

            $experienceData = [
                'seeker_id' => $seeker->getKey(),
                'company_name' => Str::squish($exp['company_name']),
                'company_address' => filled($exp['company_address'] ?? null)
                    ? Str::squish($exp['company_address'])
                    : null,
                'position' => $selectedOccupation?->title ?? $position,
                'number_of_months' => $exp['number_of_months'] ?? null,
                'employment_status' => $exp['employment_status'] ?? null,
            ];
            if (Schema::hasColumn('seeker_work_experiences', 'responsibilities')) {
                $experienceData['responsibilities'] = filled($exp['responsibilities'] ?? null)
                    ? Str::squish($exp['responsibilities'])
                    : null;
            }
            if (Schema::hasColumn('seeker_work_experiences', 'occupation_id')) {
                $experienceData['occupation_id'] = $matchedOccupation?->id;
            }
            if (Schema::hasColumn('seeker_work_experiences', 'normalized_position')) {
                $experienceData['normalized_position'] = $matchingProfiles->normalize($experienceData['position']);
            }
            if (Schema::hasColumn('seeker_work_experiences', 'end_date')) {
                $experienceData['end_date'] = ($exp['currently_employed'] ?? false) ? null : ($exp['end_date'] ?? null);
            }
            if (Schema::hasColumn('seeker_work_experiences', 'start_date')) {
                $experienceData['start_date'] = $exp['start_date'] ?? null;
            }
            if (Schema::hasColumn('seeker_work_experiences', 'currently_employed')) {
                $experienceData['currently_employed'] = (bool) ($exp['currently_employed'] ?? false);
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

    /**
     * POST /api/seeker/saved-jobs/{vacancy}   [auth:sanctum]
     *
     * Toggles the saved status of a job vacancy.
     */
    public function toggleSavedJob(Request $request, \App\Models\JobVacancy $vacancy): JsonResponse
    {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) {
            return $seeker;
        }

        $seeker->savedJobs()->toggle($vacancy->post_id);

        return response()->json([
            'message' => 'Saved jobs updated.',
            'saved_jobs' => $seeker->savedJobs()->pluck('job_vacancies.post_id'),
        ]);
    }
}
