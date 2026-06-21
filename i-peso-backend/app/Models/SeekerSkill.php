<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerSkill extends Model
{
    protected $table = 'seeker_skills';

    protected $fillable = [
        'seeker_id',
        'skill_id',
        'skill_name',
        'normalized_skill_name',
        'skill_type',
        'source',
        'is_official',
        'is_recommended',
        'priority_score',
        'proficiency',
        'years_of_experience',
        'endorsement_count',
        'relevance_score',
        'is_verified',
    ];

    /**
     * Cast attributes to native types
     */
    protected $casts = [
        'skill_type' => 'string', // enum values are strings (dole_standard, technical, soft)
        'is_official' => 'boolean',
        'is_recommended' => 'boolean',
        'priority_score' => 'decimal:2',
        'proficiency' => 'string', // enum values (beginner, intermediate, advanced, expert)
        'years_of_experience' => 'integer',
        'endorsement_count' => 'integer',
        'relevance_score' => 'integer',
        'is_verified' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: A skill belongs to a job seeker
     */
    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }
}
