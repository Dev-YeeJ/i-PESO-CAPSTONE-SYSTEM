<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GovernmentProgramSkill extends Model
{
    protected $fillable = [
        'government_program_id',
        'skill_id',
        'skill_name',
        'type',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(GovernmentProgram::class, 'government_program_id', 'program_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }
}
