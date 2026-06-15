<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OccupationAlias extends Model
{
    protected $fillable = [
        'occupation_id',
        'alias',
        'normalized_alias',
        'language',
        'source',
        'confidence',
    ];

    protected $casts = [
        'confidence' => 'float',
    ];

    public function occupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class);
    }
}
