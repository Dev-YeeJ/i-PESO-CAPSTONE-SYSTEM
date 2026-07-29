<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployerReport extends Model
{
    protected $table = 'employer_reports';

    /** Reasons a seeker can pick when reporting an employer. */
    public const REASONS = [
        'fake_job',
        'misleading',
        'abusive',
        'discrimination',
        'illegal_fees',
        'other',
    ];

    /** Lifecycle statuses an administrator moves a report through. */
    public const STATUSES = [
        'pending',
        'investigating',
        'resolved',
        'dismissed',
    ];

    /** Statuses that count as "closed" and stamp the resolver + resolved_at. */
    public const RESOLVED_STATUSES = ['resolved', 'dismissed'];

    protected $fillable = [
        'employer_id',
        'seeker_id',
        'reason',
        'description',
        'status',
        'admin_notes',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'resolved_by', 'admin_id');
    }
}
