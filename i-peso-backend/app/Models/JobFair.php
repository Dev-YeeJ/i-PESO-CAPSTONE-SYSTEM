<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobFair extends Model
{
    protected $table = 'job_fairs';

    protected $primaryKey = 'job_fair_id';

    protected $fillable = [
        'admin_id',
        'created_by',
        'title',
        'description',
        'start_date',
        'end_date',
        'venue',
        'province',
        'province_code',
        'city_municipality',
        'city_code',
        'barangay',
        'barangay_code',
        'specific_address',
        'latitude',
        'longitude',
        'google_place_id',
        'sector',
        'target_sector',
        'partner_agencies',
        'event_date',
        'start_time',
        'end_time',
        'submission_deadline',
        'contact_email',
        'maximum_representatives',
        'status',
        'is_public',
        'published_at',
        'published_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'event_date' => 'date',
        'latitude' => 'float',
        'longitude' => 'float',
        'partner_agencies' => 'array',
        'submission_deadline' => 'datetime',
        'maximum_representatives' => 'integer',
        'is_public' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function administrator(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'admin_id', 'admin_id');
    }

    public function employerJoins(): HasMany
    {
        return $this->hasMany(JobFairEmployer::class, 'job_fair_id', 'job_fair_id');
    }

    public function vacancyLinks(): HasMany
    {
        return $this->hasMany(JobFairVacancy::class, 'job_fair_id', 'job_fair_id');
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(JobFairAttendee::class, 'job_fair_id', 'job_fair_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'job_fair_id', 'job_fair_id');
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(JobFairRequirement::class, 'job_fair_id', 'job_fair_id');
    }

    public function confirmationSlips(): HasMany
    {
        return $this->hasMany(JobFairConfirmationSlip::class, 'job_fair_id', 'job_fair_id');
    }

    public function resultReports(): HasMany
    {
        return $this->hasMany(JobFairResultReport::class, 'job_fair_id', 'job_fair_id');
    }
}
