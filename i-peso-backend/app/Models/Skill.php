<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Skill extends Model
{
    protected $table = 'skill_catalog_entries';

    protected $fillable = [
        'name',
        'normalized_name',
        'search_terms',
        'category',
        'source',
        'element_id',
        'occupation_count',
        'is_hot',
        'is_in_demand',
        'version',
    ];

    protected $casts = [
        'occupation_count' => 'integer',
        'is_hot' => 'boolean',
        'is_in_demand' => 'boolean',
    ];

    public function aliases(): HasMany
    {
        return $this->hasMany(SkillAlias::class, 'skill_id');
    }

    public function outgoingRelationships(): HasMany
    {
        return $this->hasMany(SkillRelationship::class, 'parent_skill_id');
    }

    public function incomingRelationships(): HasMany
    {
        return $this->hasMany(SkillRelationship::class, 'related_skill_id');
    }

    public function relatedSkills(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'skill_relationships',
            'parent_skill_id',
            'related_skill_id'
        )->withPivot([
            'relationship_type',
            'match_weight',
            'reverse_match_weight',
            'source',
            'external_code',
            'metadata',
        ])->withTimestamps();
    }

    public function seekerSkills(): HasMany
    {
        return $this->hasMany(SeekerSkill::class, 'skill_id');
    }

    public function vacancySkills(): HasMany
    {
        return $this->hasMany(JobVacancySkill::class, 'skill_id');
    }

    public function occupationEvidence(): HasMany
    {
        return $this->hasMany(SkillOccupationEvidence::class, 'skill_id');
    }
}
