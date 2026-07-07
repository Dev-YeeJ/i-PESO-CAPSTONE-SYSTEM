<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobFairEmployer extends Model
{
    protected $fillable = [
        'job_fair_id',
        'employer_id',
        'participation_status',
        'source',
        'confirmation_channel',
        'joined_at',
        'invited_at',
        'responded_at',
        'reviewed_at',
        'approved_at',
        'attended_at',
        'no_show_at',
        'encoded_results_at',
        'report_generated_at',
        'remarks',
        'reviewed_by',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
        'invited_at' => 'datetime',
        'responded_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'attended_at' => 'datetime',
        'no_show_at' => 'datetime',
        'encoded_results_at' => 'datetime',
        'report_generated_at' => 'datetime',
    ];

    public function jobFair(): BelongsTo
    {
        return $this->belongsTo(JobFair::class, 'job_fair_id', 'job_fair_id');
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }

    public function requirementSubmissions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(JobFairRequirementSubmission::class, 'job_fair_employer_id');
    }

    public function confirmationSlip(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(JobFairConfirmationSlip::class, 'job_fair_employer_id');
    }

    public function resultReport(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(JobFairResultReport::class, 'job_fair_employer_id');
    }
}
