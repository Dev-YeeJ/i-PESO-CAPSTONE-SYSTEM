<?php

namespace App\Models;

use App\Models\Concerns\HasAccountRestriction;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Employer extends Authenticatable
{
    use HasAccountRestriction, HasApiTokens, Notifiable, SoftDeletes;

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
                $employer->jobFairJoins()->forceDelete();
            } else {
                $employer->documents()->delete();
                $employer->vacancies()->delete();
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

    public function jobFairJoins(): HasMany
    {
        return $this->hasMany(JobFairEmployer::class, 'employer_id', 'employer_id');
    }

    public function jobFairVacancies(): HasMany
    {
        return $this->hasMany(JobFairVacancy::class, 'employer_id', 'employer_id');
    }

    /**
     * Document types collected by the representative step (Step 4) rather than
     * the company Legal Documents step (Step 3), yet still required of every
     * employer regardless of company type.
     */
    public const IDENTITY_DOCUMENTS = ['government_id'];

    /**
     * Every document an employer must have on file to be accredited: the
     * company documents for its type plus the representative's Government ID.
     * This is the set the admin review, the finalize/approve verdict, the
     * verification queue and the employer's own dashboard all work from.
     */
    public function getRequiredDocuments(): array
    {
        return array_values(array_unique(array_merge(
            $this->getRequiredCompanyDocuments(),
            self::IDENTITY_DOCUMENTS,
        )));
    }

    /**
     * Only the company documents uploaded on the Legal Documents step (Step 3)
     * for this employer's company type — the Government ID is uploaded with the
     * representative details on Step 4, so the Step 3 checklist excludes it.
     */
    public function getRequiredCompanyDocuments(): array
    {
        $required = [
            'mayors_permit',
            'bir_certificate',
            'philJobnet_proof',
            'affidavit_of_undertaking',
            'no_pending_case_certificate',
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
                break;
            case 'overseas_recruitment_agency':
                $required[] = 'sec_certificate';
                $required[] = 'dme_poea_license';
                break;
            case 'government_agency':
                // Not a DTI/SEC-registered business and not a recruitment
                // agency — no extra accreditation document beyond the base
                // requirements every employer type already carries.
                break;
        }

        return $required;
    }

    /**
     * No document is optional anymore — the affidavit of undertaking and
     * the no-pending-case certificate (the last two that used to be
     * optional outside the recruitment-agency types) are now required for
     * every company type, see getRequiredCompanyDocuments(). Kept as a method
     * returning an empty array so existing callers (the Step 3 upload UI,
     * the required-documents API response) keep working unchanged.
     */
    public function getOptionalDocuments(): array
    {
        return [];
    }

    /**
     * Check if every required document (company documents + Government ID) is uploaded.
     */
    public function hasAllRequiredDocuments(): bool
    {
        return $this->hasUploadedAll($this->getRequiredDocuments());
    }

    /**
     * Check if every Step 3 company document is uploaded — the gate for
     * moving on to (and submitting) the representative step.
     */
    public function hasAllRequiredCompanyDocuments(): bool
    {
        return $this->hasUploadedAll($this->getRequiredCompanyDocuments());
    }

    private function hasUploadedAll(array $required): bool
    {
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
