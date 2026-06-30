<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobFairEmployer extends Model
{
    protected $fillable = [
        'job_fair_id',
        'employer_id',
        'joined_at',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
    ];

    public function jobFair(): BelongsTo
    {
        return $this->belongsTo(JobFair::class, 'job_fair_id', 'job_fair_id');
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }
}
