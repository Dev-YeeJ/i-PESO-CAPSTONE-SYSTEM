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
        'skill_type',
    ];

    /**
     * Cast attributes to native types
     */
    protected $casts = [
        'skill_type' => 'string', // enum values are strings
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
