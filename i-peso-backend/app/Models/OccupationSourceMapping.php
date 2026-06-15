<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OccupationSourceMapping extends Model
{
    protected $fillable = [
        'occupation_id',
        'source',
        'external_code',
        'external_uri',
        'version',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function occupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class);
    }
}
