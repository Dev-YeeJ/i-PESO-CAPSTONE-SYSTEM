<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobFairAttendee extends Model
{
    protected $fillable = [
        'job_fair_id',
        'seeker_id',
        'qr_code_uuid',
        'scanned_at',
        'is_attended',
        'guest_name',
        'guest_mobile_number',
        'guest_email',
        'guest_educ_attainment',
        'guest_preferred_job',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
        'is_attended' => 'boolean',
    ];

    public function jobFair(): BelongsTo
    {
        return $this->belongsTo(JobFair::class, 'job_fair_id', 'job_fair_id');
    }

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}
