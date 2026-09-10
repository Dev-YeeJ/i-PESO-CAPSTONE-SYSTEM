<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Employer extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

    // Mirrors the fixed option list in Step2CompanyProfile.jsx — keep both in sync.
    public const INDUSTRIES = [
        'Agriculture & Fishing',
        'Construction',
        'Education & Training',
        'Finance & Banking',
        'Food & Beverage',
        'Healthcare & Medical',
        'Information Technology',
        'Manufacturing',
        'Real Estate',
        'Retail & Commerce',
        'Transportation & Logistics',
        'Tourism & Hospitality',
        'Government & Public Sector',
        'Other',
    ];

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($employer) {
            if ($employer->isForceDeleting()) {
                $employer->documents()->forceDelete();
                $employer->vacancies()->forceDelete();
                $employer->reports()->forceDelete();
                $employer->jobFairJoins()->forceDelete();
            } else {
                $employer->documents()->delete();
                $employer->vacancies()->delete();
                $employer->reports()->delete();
                $employer->jobFairJoins()->delete();
            }
        });
    }

    protected $table = 'employers';

    protected $primaryKey = 'employer_id';

    protected $fillable = [
        // Basic account info
        'email',
        'password',

        // Step 1: Company Type
        'company_type',

        // Step 2: Company Profile
        'company_name',
        'tin',
        'trade_name',
        'industry',
        'company_size',
        'province',
        'province_code',
        'city_municipality',
        'city_code',
        'barangay',
        'barangay_code',
        'house_unit_street',
        'latitude',
        'longitude',
        'location_accuracy',
        'google_place_id',
        'complete_address',
        'full_address',
        'region_code',
        'location_verified_at',
        'company_description',
        'company_logo',
        'industry_type',

        // Step 4: Representative Details
        'representative_name',
        'representative_first_name',
        'representative_middle_name',
        'representative_last_name',
        'representative_designation',
        'mobile_number',
        'representative_contact_number',
        'representative_is_owner',
        'profile_image',

        // Verification & Admin
        'verification_status',
        'registration_submitted_at',
        'verified_at',
        'rejection_reason',
        'verified_by_admin_id',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'verified_at' => 'datetime',
        'registration_submitted_at' => 'datetime',
        'password' => 'hashed',
        'representative_is_owner' => 'boolean',
        'industry' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
        'location_accuracy' => 'integer',
        'location_verified_at' => 'datetime',
        'google_token_expires_at' => 'datetime',
        'google_access_token' => 'encrypted',
        'google_refresh_token' => 'encrypted',
    ];

    /**
     * Get all documents uploaded by this employer.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(EmployerDocument::class, 'employer_id', 'employer_id');
    }

    public function vacancies(): HasMany
    {
        return $this->hasMany(JobVacancy::class, 'employer_id', 'employer_id');
    }

    /**
     * Seeker-filed reports about this employer.
     */
    public function reports(): HasMany
    {
        return $this->hasMany(EmployerReport::class, 'employer_id', 'employer_id');
    }

    public function jobFairJoins(): HasMany
    {
        return $this->hasMany(JobFairEmployer::class, 'employer_id', 'employer_id');
    }

    public function jobFairVacancies(): HasMany
    {
        return $this->hasMany(JobFairVacancy::class, 'employer_id', 'employer_id');
    }

    /**
     * Get only required documents for this employer's company type
     */
    public function getRequiredDocuments()
    {
        $required = [
            'mayors_permit',
            'bir_certificate',
            'philJobnet_proof',
        ];

        switch ($this->company_type) {
            case 'sole_proprietorship':
                $required[] = 'dti_certificate';
                break;
            case 'corporation_partnership':
                $required[] = 'sec_certificate';
                break;
            case 'local_recruitment_agency':
                $required[] = 'sec_certificate';
                $required[] = 'prpa_license';
                $required[] = 'affidavit_of_undertaking';
                $required[] = 'no_pending_case_certificate';
                break;
            case 'overseas_recruitment_agency':
                $required[] = 'sec_certificate';
                $required[] = 'dme_poea_license';
                $required[] = 'affidavit_of_undertaking';
                $required[] = 'no_pending_case_certificate';
                break;
            case 'government_agency':
                // Not a DTI/SEC-registered business and not a recruitment
                // agency — no extra accreditation document beyond the two
                // base requirements every employer type already carries.
                break;
        }

        return $required;
    }

    /**
     * The affidavit and no-pending-case certificate are required for
     * recruitment agencies (see getRequiredDocuments()) but only ever
     * optional — PESO may still ask a regular employer for one — for
     * every other company type, so they don't double up in the Step 3 UI.
     * PhilJobNet proof is required for every company type (see
     * getRequiredDocuments()), so it no longer appears here.
     */
    public function getOptionalDocuments(): array
    {
        $optional = [];

        if (! in_array($this->company_type, ['local_recruitment_agency', 'overseas_recruitment_agency'], true)) {
            $optional[] = 'affidavit_of_undertaking';
            $optional[] = 'no_pending_case_certificate';
        }

        return $optional;
    }

    /**
     * Check if all required documents are uploaded
     */
    public function hasAllRequiredDocuments(): bool
    {
        $required = $this->getRequiredDocuments();
        $uploaded = $this->documents()
            ->whereIn('document_type', $required)
            ->pluck('document_type')
            ->toArray();

        return count(array_diff($required, $uploaded)) === 0;
    }

    /**
     * Check if employer can post jobs
     */
    public function canPostJobs(): bool
    {
        return $this->verification_status === 'verified';
    }
}
