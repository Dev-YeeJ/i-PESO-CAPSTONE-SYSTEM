<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class JobSeeker extends Authenticatable
{
    use HasApiTokens;

    // We will assign `seeker_id` manually to support gap-filling
    // and predictable sequential IDs. Disable auto-incrementing.

    protected $table = 'job_seekers';

    protected $primaryKey = 'seeker_id';

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'mobile_number',
        'email',
        'password',
        'complete_address',
        'educ_attainment',
        'skills',
        'resume_path',
        'profile_image',
        'email_verified_at',
        'is_verified',
        'verification_status',
        'verified_at',
        'verified_by',
        'verification_remarks',
        // === STEP 1: PERSONAL INFORMATION ===
        'date_of_birth',
        'sex',
        'civil_status',
        'religion',
        'height_ft',
        'tin',
        // === STEP 1: ADDRESS (4 components) ===
        'address_house_street',
        'address_barangay',
        'address_municipality_city',
        'address_province',
        // === STEP 2: EDUCATION & DEMOGRAPHICS ===
        'is_4ps_beneficiary',
        'household_id_4ps',
        // === STEP 3: EMPLOYMENT STATUS ===
        'employment_status',
        'employment_type',
        'self_employed_type',
        'self_employed_type_others',
        'unemployment_months',
        'unemployment_reason',
        'unemployment_reason_others',
        'unemployment_terminated_country',
        'is_ofw',
        'ofw_country',
        'is_former_ofw',
        'former_ofw_country',
        'former_ofw_return_date',
        // === STEP 4: JOB PREFERENCES ===
        'work_type_preference',
        'preferred_work_location',
        'preferred_locations_details',
        // === STEP 5: EDUCATION & OTHER SKILLS ===
        'currently_in_school',
        'other_skills',
        // === TRACKING ===
        'profile_completed',
        'profile_completed_at',
        'form_validation_state',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'profile_completed_at' => 'datetime',
        'date_of_birth' => 'date',
        'former_ofw_return_date' => 'date',
        'password' => 'hashed',
        'skills' => 'array',
        'is_4ps_beneficiary' => 'boolean',
        'is_ofw' => 'boolean',
        'is_former_ofw' => 'boolean',
        'profile_completed' => 'boolean',
        'unemployment_months' => 'integer',
        'preferred_locations_details' => 'array',
        'form_validation_state' => 'array',
        'currently_in_school' => 'boolean',
        'other_skills' => 'array',
    ];

    // === RELATIONSHIPS ===

    public function disabilities(): HasMany
    {
        return $this->hasMany(SeekerDisability::class, 'seeker_id', 'seeker_id');
    }

    public function occupations(): HasMany
    {
        return $this->hasMany(SeekerOccupation::class, 'seeker_id', 'seeker_id')
            ->orderBy('preference_order');
    }

    public function workLocations(): HasMany
    {
        return $this->hasMany(SeekerWorkLocation::class, 'seeker_id', 'seeker_id');
    }

    public function languages(): HasMany
    {
        return $this->hasMany(SeekerLanguage::class, 'seeker_id', 'seeker_id');
    }

    public function educations(): HasMany
    {
        return $this->hasMany(SeekerEducation::class, 'seeker_id', 'seeker_id');
    }

    public function trainings(): HasMany
    {
        return $this->hasMany(SeekerTraining::class, 'seeker_id', 'seeker_id');
    }

    public function eligibilities(): HasMany
    {
        return $this->hasMany(SeekerEligibility::class, 'seeker_id', 'seeker_id');
    }

    public function workExperiences(): HasMany
    {
        return $this->hasMany(SeekerWorkExperience::class, 'seeker_id', 'seeker_id');
    }

    public function skills(): HasMany
    {
        return $this->hasMany(SeekerSkill::class, 'seeker_id', 'seeker_id');
    }

    public function seekerSkills(): HasMany
    {
        return $this->hasMany(SeekerSkill::class, 'seeker_id', 'seeker_id');
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(SeekerCertificate::class, 'seeker_id', 'seeker_id')
            ->latest();
    }

    // ===== HELPER METHODS =====

    /**
     * Get full formatted address
     */
    public function getFullAddress(): string
    {
        return collect([
            $this->address_house_street,
            $this->address_barangay,
            $this->address_municipality_city,
            $this->address_province,
        ])->filter()->join(', ');
    }

    /**
     * Check if all required steps are completed
     */
    public function isProfileComplete(): bool
    {
        return $this->profile_completed &&
               $this->form_validation_state &&
               isset($this->form_validation_state['step1'],
                   $this->form_validation_state['step2'],
                   $this->form_validation_state['step3'],
                   $this->form_validation_state['step4'],
                   $this->form_validation_state['step5'],
                   $this->form_validation_state['step6'],
                   $this->form_validation_state['step7']);
    }

    /**
     * Format religion for display (converts enum values to readable format)
     * Examples: 'roman_catholic' → 'Roman Catholic', 'Custom Religion' → 'Custom Religion'
     */
    public function getFormattedReligion(): string
    {
        if (! $this->religion) {
            return 'N/A';
        }

        // Enum value mapping for standardized religions
        $enumMap = [
            'roman_catholic' => 'Roman Catholic',
            'islam' => 'Islam',
            'iglesia_ni_cristo' => 'Iglesia ni Cristo',
            'aglipayan' => 'Aglipayan',
            'evangelical' => 'Evangelical / Born Again',
            'seventh_day_adventist' => 'Seventh-day Adventist',
            'jehovah_witness' => 'Jehovah\'s Witness',
            'buddhist' => 'Buddhist',
            'hindu' => 'Hindu',
            'jewish' => 'Jewish',
            'agnostic_atheist' => 'Agnostic / Atheist',
            'declined' => 'Declined to answer',
        ];

        // Return mapped value or custom value as-is
        return $enumMap[$this->religion] ?? $this->religion;
    }
}
