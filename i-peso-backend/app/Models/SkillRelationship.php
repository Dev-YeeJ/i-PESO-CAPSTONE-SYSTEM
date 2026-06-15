<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SkillRelationship extends Model
{
    protected $fillable = [
        'parent_skill_id',
        'related_skill_id',
        'relationship_type',
        'match_weight',
        'reverse_match_weight',
        'source',
        'external_code',
        'metadata',
    ];

    protected $casts = [
        'match_weight' => 'float',
        'reverse_match_weight' => 'float',
        'metadata' => 'array',
    ];

    public function parentSkill(): BelongsTo
    {
        return $this->belongsTo(Skill::class, 'parent_skill_id');
    }

    public function relatedSkill(): BelongsTo
    {
        return $this->belongsTo(Skill::class, 'related_skill_id');
    }
}
