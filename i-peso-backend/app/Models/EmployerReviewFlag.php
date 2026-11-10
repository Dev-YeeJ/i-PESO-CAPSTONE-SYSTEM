<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Something PESO needs to look at about a review: an employer's dispute,
 * another job seeker's report, or the automatic content check.
 */
class EmployerReviewFlag extends Model
{
    public const BY_EMPLOYER = 'employer';

    public const BY_SEEKER = 'seeker';

    public const BY_SYSTEM = 'system';

    public const OPEN = 'open';

    protected $fillable = [
        'review_id', 'reporter_type', 'reporter_id', 'reason', 'details',
        'status', 'resolution_note', 'resolved_by', 'resolved_at',
    ];

    protected $casts = ['resolved_at' => 'datetime'];

    public function review(): BelongsTo
    {
        return $this->belongsTo(EmployerReview::class, 'review_id');
    }
}
