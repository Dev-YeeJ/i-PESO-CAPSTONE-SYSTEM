<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobVacancySkill extends Model
{
    protected $fillable = [
        'post_id',
        'skill_id',
        'skill_type',
        'original_name',
        'weight',
    ];

    protected $casts = [
        'weight' => 'float',
    ];

    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'post_id', 'post_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }
}
