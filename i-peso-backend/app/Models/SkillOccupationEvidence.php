<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SkillOccupationEvidence extends Model
{
    protected $table = 'skill_occupation_evidence';

    protected $fillable = [
        'skill_id',
        'occupation_id',
        'source',
        'external_occupation_code',
        'evidence_type',
        'element_id',
        'importance',
        'level',
        'is_hot',
        'is_in_demand',
        'version',
        'metadata',
    ];

    protected $casts = [
        'importance' => 'float',
        'level' => 'float',
        'is_hot' => 'boolean',
        'is_in_demand' => 'boolean',
        'metadata' => 'array',
    ];

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }

    public function occupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class);
    }
}
