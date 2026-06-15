<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OccupationGeneralTerm extends Model
{
    protected $fillable = [
        'occupation_id',
        'term',
        'normalized_term',
        'language',
        'source',
        'priority',
    ];

    protected $casts = [
        'priority' => 'integer',
    ];

    public function occupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class);
    }
}
