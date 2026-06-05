<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use App\Models\SeekerDisability;
use App\Models\SeekerOccupation;
use App\Models\SeekerLanguage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SeekerController extends Controller
{
    // ── PRIVATE HELPERS ──────────────────────────────────────────────────────

    /**
     * Ensure the authenticated user is a JobSeeker.
     * Returns the model or a 403 JsonResponse.
     */
    private function getSeeker(Request $request): JobSeeker|JsonResponse
    {
        $user = $request->user();

        if (!$user instanceof JobSeeker) {
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
        $state           = $seeker->form_validation_state ?? [];
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
            'id'                    => $seeker->getKey(),
            'name'                  => trim("{$seeker->first_name} {$seeker->last_name}"),
            'email'                 => $seeker->email,
            'role'                  => 'seeker',
            'email_verified_at'     => $seeker->email_verified_at,
            'profile_completed'     => $seeker->profile_completed,
            'first_name'            => $seeker->first_name,
            'last_name'             => $seeker->last_name,
            'mobile_number'         => $seeker->mobile_number,
            'form_validation_state' => $seeker->form_validation_state,
        ];
    }

    // ── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────

    /**
     * GET /api/seeker/profile   [auth:sanctum]
     *
     * Returns the full seeker profile including all related data.
     * Used to pre-fill the onboarding form on return visits.
     */
    public function getProfile(Request $request): JsonResponse
    {
        $seeker = $this->getSeeker($request);
        if ($seeker instanceof JsonResponse) return $seeker;

        $seeker->load(['disabilities', 'occupations', 'languages']);

        return response()->json([
            'user' => array_merge($this->buildPayload($seeker), [
                'middle_name'                => $seeker->middle_name,
                'suffix'                     => $seeker->suffix,
                'date_of_birth'              => $seeker->date_of_birth?->format('Y-m-d'),
                'sex'                        => $seeker->sex,
                'civil_status'               => $seeker->civil_status,
                'religion'                   => $seeker->religion,
                'height_ft'                  => $seeker->height_ft,
                'tin'                        => $seeker->tin,
                'educ_attainment'            => $seeker->educ_attainment,
                'address_house_street'       => $seeker->address_house_street,
                'address_barangay'           => $seeker->address_barangay,
                'address_municipality_city'  => $seeker->address_municipality_city,
                'address_province'           => $seeker->address_province,
                'disabilities'               => $seeker->disabilities,
                'is_4ps_beneficiary'         => $seeker->is_4ps_beneficiary,
                'household_id_4ps'           => $seeker->household_id_4ps,
                'employment_status'          => $seeker->employment_status,
                'employment_type'            => $seeker->employment_type,
                'self_employed_type'         => $seeker->self_employed_type,
                'unemployment_months'        => $seeker->unemployment_months,
                'unemployment_reason'        => $seeker->unemployment_reason,
                'is_ofw'                     => $seeker->is_ofw,
                'ofw_country'                => $seeker->ofw_country,
                'is_former_ofw'              => $seeker->is_former_ofw,
                'former_ofw_country'         => $seeker->former_ofw_country,
                'former_ofw_return_date'     => $seeker->former_ofw_return_date?->format('Y-m-d'),
                'work_type_preference'       => $seeker->work_type_preference,
                'preferred_work_location'    => $seeker->preferred_work_location,
                'preferred_locations_details' => $seeker->preferred_locations_details,
                'occupations'                => $seeker->occupations,
                'languages'                  => $seeker->languages,
            ]),
        ]);
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
        if ($seeker instanceof JsonResponse) return $seeker;

        $validated = $request->validate([
            'first_name'                => ['required', 'string', 'max:100'],
            'middle_name'               => ['nullable', 'string', 'max:100'],
            'last_name'                 => ['required', 'string', 'max:100'],
            'suffix'                    => ['nullable', 'string', 'in:,Jr.,Sr.,II,III,IV,V'],
            'date_of_birth'             => ['required', 'date', 'before:today'],
            'sex'                       => ['required', 'in:male,female'],
            'civil_status'              => ['required', 'in:single,married,widowed,separated'],
            'religion'                  => ['required', 'string', 'in:roman_catholic,islam,iglesia_ni_cristo,aglipayan,evangelical,seventh_day_adventist,jehovah_witness,buddhist,hindu,jewish,agnostic_atheist,declined,other'],
            'religion_other'            => ['nullable', 'string', 'max:100', 'required_if:religion,other'],
            'height_ft'                 => ['required', 'numeric', 'between:2.5,8.5'],
            'tin'                       => ['nullable', 'string', 'max:20'],
            'educ_attainment'           => ['required', 'string', 'max:100'],
            'address_province'          => ['required', 'string', 'max:100'],
            'address_municipality_city' => ['required', 'string', 'max:100'],
            'address_barangay'          => ['required', 'string', 'max:100'],
            'address_house_street'      => ['required', 'string', 'max:255'],
            // Disability: array of types, at least one must be selected
            'disabilities'              => ['nullable', 'array'],
            'disabilities.*'            => ['string', 'in:visual,hearing,speech,mental,physical,others,none'],
            'disability_specification'  => ['nullable', 'string', 'max:255'],
        ]);

        // ── Save main seeker fields ──
        $seeker->forceFill([
            'first_name'                => $validated['first_name'],
            'middle_name'               => $validated['middle_name'] ?? null,
            'last_name'                 => $validated['last_name'],
            'suffix'                    => $validated['suffix'] ?? null,
            'date_of_birth'             => $validated['date_of_birth'],
            'sex'                       => $validated['sex'],
            'civil_status'              => $validated['civil_status'],
            'religion'                  => $validated['religion'] === 'other'
                ? ($validated['religion_other'] ?? null)
                : $validated['religion'],
            'height_ft'                 => $validated['height_ft'],
            'tin'                       => $validated['tin'] ?? null,
            'educ_attainment'           => $validated['educ_attainment'],
            'address_province'          => $validated['address_province'],
            'address_municipality_city' => $validated['address_municipality_city'],
            'address_barangay'          => $validated['address_barangay'],
            'address_house_street'      => $validated['address_house_street'],
        ])->save();

        // ── Save disability records ──
        $seeker->disabilities()->delete();

        $selected = $validated['disabilities'] ?? [];
        // Only insert if not 'none'
        if (!empty($selected) && !in_array('none', $selected)) {
            foreach ($selected as $type) {
                SeekerDisability::create([
                    'seeker_id'              => $seeker->getKey(),
                    'disability_type'        => $type,
                    'disability_specification' => ($type === 'others')
                        ? ($validated['disability_specification'] ?? null)
                        : null,
                ]);
            }
        }

        $this->markStepComplete($seeker, 'step1');

        return response()->json([
            'message' => 'Personal information saved.',
            'user'    => $this->buildPayload($seeker),
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
        if ($seeker instanceof JsonResponse) return $seeker;

        $validated = $request->validate([
            'employment_status'               => ['required', 'in:employed,unemployed'],
            // Employed sub-fields
            'employment_type'                 => ['nullable', 'in:wage_employed,self_employed'],
            'self_employed_type'              => ['nullable', 'string', 'max:100'],
            'self_employed_type_others'       => ['nullable', 'string', 'max:255'],
            // Unemployed sub-fields
            'unemployment_months'             => ['nullable', 'integer', 'min:0', 'max:999'],
            'unemployment_reason'             => ['nullable', 'string', 'max:100'],
            'unemployment_reason_others'      => ['nullable', 'string', 'max:255'],
            'unemployment_terminated_country' => ['nullable', 'string', 'max:100'],
            // OFW
            'is_ofw'                          => ['required', 'boolean'],
            'ofw_country'                     => ['nullable', 'string', 'max:100'],
            'is_former_ofw'                   => ['required', 'boolean'],
            'former_ofw_country'              => ['nullable', 'string', 'max:100'],
            'former_ofw_return_date'          => ['nullable', 'date'],
            // 4Ps
            'is_4ps_beneficiary'              => ['required', 'boolean'],
            'household_id_4ps'                => ['nullable', 'string', 'max:50'],
        ]);

        $seeker->forceFill([
            'employment_status'               => $validated['employment_status'],
            'employment_type'                 => $validated['employment_type'] ?? null,
            'self_employed_type'              => $validated['self_employed_type'] ?? null,
            'self_employed_type_others'       => $validated['self_employed_type_others'] ?? null,
            'unemployment_months'             => $validated['unemployment_months'] ?? null,
            'unemployment_reason'             => $validated['unemployment_reason'] ?? null,
            'unemployment_reason_others'      => $validated['unemployment_reason_others'] ?? null,
            'unemployment_terminated_country' => $validated['unemployment_terminated_country'] ?? null,
            'is_ofw'                          => $validated['is_ofw'],
            'ofw_country'                     => $validated['is_ofw'] ? ($validated['ofw_country'] ?? null) : null,
            'is_former_ofw'                   => $validated['is_former_ofw'],
            'former_ofw_country'              => $validated['is_former_ofw'] ? ($validated['former_ofw_country'] ?? null) : null,
            'former_ofw_return_date'          => $validated['is_former_ofw'] ? ($validated['former_ofw_return_date'] ?? null) : null,
            'is_4ps_beneficiary'              => $validated['is_4ps_beneficiary'],
            'household_id_4ps'                => $validated['is_4ps_beneficiary'] ? ($validated['household_id_4ps'] ?? null) : null,
        ])->save();

        $this->markStepComplete($seeker, 'step2');

        return response()->json([
            'message' => 'Employment information saved.',
            'user'    => $this->buildPayload($seeker),
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
        if ($seeker instanceof JsonResponse) return $seeker;

        $validated = $request->validate([
            'work_type_preference'       => ['required', 'in:part_time,full_time'],
            'preferred_work_location'    => ['required', 'in:local,overseas'],
            'preferred_locations_details' => ['nullable', 'array', 'max:3'],
            'preferred_locations_details.*' => ['string', 'max:255'],
            // At least 1 occupation required, up to 3
            'occupations'                => ['required', 'array', 'min:1', 'max:3'],
            'occupations.*'              => ['required', 'string', 'max:255'],
        ]);

        $seeker->forceFill([
            'work_type_preference'       => $validated['work_type_preference'],
            'preferred_work_location'    => $validated['preferred_work_location'],
            'preferred_locations_details' => $validated['preferred_locations_details'] ?? [],
        ])->save();

        // ── Sync occupations (delete + re-insert) ──
        $seeker->occupations()->delete();
        foreach (array_filter($validated['occupations']) as $index => $name) {
            SeekerOccupation::create([
                'seeker_id'        => $seeker->getKey(),
                'occupation_title' => $name,
                'preference_order' => $index + 1,
            ]);
        }

        $this->markStepComplete($seeker, 'step3');

        return response()->json([
            'message' => 'Job preferences saved.',
            'user'    => $this->buildPayload($seeker),
        ]);
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
        if ($seeker instanceof JsonResponse) return $seeker;

        $validated = $request->validate([
            'languages'                  => ['required', 'array', 'min:1'],
            'languages.*.language'       => ['required', 'string', 'max:100'],
            'languages.*.language_other' => ['nullable', 'string', 'max:100'],
            'languages.*.can_read'       => ['boolean'],
            'languages.*.can_write'      => ['boolean'],
            'languages.*.can_speak'      => ['boolean'],
            'languages.*.can_understand' => ['boolean'],
        ]);

        // ── Sync languages (delete + re-insert) ──
        $seeker->languages()->delete();
        foreach ($validated['languages'] as $lang) {
            // Only save if at least one proficiency is marked
            $hasAny = ($lang['can_read'] ?? false)
                   || ($lang['can_write'] ?? false)
                   || ($lang['can_speak'] ?? false)
                   || ($lang['can_understand'] ?? false);

            if ($hasAny) {
                SeekerLanguage::create([
                    'seeker_id'       => $seeker->getKey(),
                    'language'        => $lang['language'],
                    'language_other'  => $lang['language_other'] ?? null,
                    'can_read'        => $lang['can_read'] ?? false,
                    'can_write'       => $lang['can_write'] ?? false,
                    'can_speak'       => $lang['can_speak'] ?? false,
                    'can_understand'  => $lang['can_understand'] ?? false,
                ]);
            }
        }

        $this->markStepComplete($seeker, 'step4');

        // ── Mark profile as fully complete ──
        $seeker->forceFill([
            'profile_completed'    => true,
            'profile_completed_at' => Carbon::now(),
        ])->save();

        return response()->json([
            'message' => 'Profile completed! Welcome to i-PESO.',
            'user'    => $this->buildPayload($seeker),
        ]);
    }
}
