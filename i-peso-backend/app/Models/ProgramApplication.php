<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProgramApplication extends Model
{
    protected $primaryKey = 'prog_apply_id';

    protected $fillable = [
        'program_id',
        'seeker_id',
        'status',
        'application_status',
        'submitted_files',
        'eligibility_snapshot',
        'eligibility_score',
        'admin_remarks',
        'reviewed_by_admin_id',
        'reviewed_at',
        'completed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'submitted_files' => 'array',
        'eligibility_snapshot' => 'array',
        'eligibility_score' => 'integer',
        'reviewed_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saving(function (ProgramApplication $application) {
            $application->status = match ($application->application_status) {
                'approved', 'completed' => $application->application_status,
                'rejected', 'cancelled' => 'rejected',
                default => 'pending',
            };
        });
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(GovernmentProgram::class, 'program_id', 'program_id');
    }

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'reviewed_by_admin_id', 'admin_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(GovernmentProgramApplicationDocument::class, 'application_id', 'prog_apply_id');
    }

    public function certificate(): HasOne
    {
        return $this->hasOne(SeekerCertificate::class, 'program_application_id', 'prog_apply_id');
    }
}
