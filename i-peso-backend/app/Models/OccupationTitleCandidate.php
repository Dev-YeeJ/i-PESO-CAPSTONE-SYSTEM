<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OccupationTitleCandidate extends Model
{
    protected $fillable = [
        'suggested_occupation_id',
        'raw_title',
        'normalized_title',
        'source',
        'status',
        'match_reason',
        'match_confidence',
        'occurrences',
        'sample_company',
        'metadata',
        'first_seen_at',
        'last_seen_at',
        'reviewed_at',
    ];

    protected $casts = [
        'match_confidence' => 'float',
        'occurrences' => 'integer',
        'metadata' => 'array',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function suggestedOccupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class, 'suggested_occupation_id');
    }
}
