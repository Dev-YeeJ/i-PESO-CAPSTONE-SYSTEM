<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Application extends Model
{
    protected $table = 'applications';

    protected $primaryKey = 'apply_id';

    protected $fillable = [
        'post_id',
        'seeker_id',
        'job_fair_id',
        'is_hots',
        'dole_mismatch_code',
        'employer_mismatch_reason_code',
        'seeker_mismatch_reason_code',
        'mismatch_reason_details',
        'match_percentage',
        'status',
        'status_changed_at',
        'status_changed_by',
        'employer_remarks',
        'placement_start_date',
        'placement_salary',
        'placement_employment_type',
        'placement_captured_at',
        'submitted_documents',
    ];

    protected $casts = [
        'match_percentage' => 'decimal:2',
        'is_hots' => 'boolean',
        'status_changed_at' => 'datetime',
        'placement_start_date' => 'date',
        'placement_salary' => 'decimal:2',
        'placement_captured_at' => 'datetime',
        'submitted_documents' => 'array',
    ];

    public function jobVacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'post_id', 'post_id');
    }

    public function jobSeeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function jobFair(): BelongsTo
    {
        return $this->belongsTo(JobFair::class, 'job_fair_id', 'job_fair_id');
    }

    public function interviewSchedule(): HasOne
    {
        return $this->hasOne(InterviewSchedule::class, 'apply_id', 'apply_id');
    }
}
