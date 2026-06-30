<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployerSkillDemand extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'demand_id';

    protected $fillable = [
        'employer_id',
        'job_vacancy_id',
        'skill_id',
        'skill_name',
        'occupation_id',
        'linked_program_id',
        'workers_needed',
        'reason',
        'preferred_training_timeline',
        'status',
        'remarks',
        'admin_remarks',
        'reviewed_by_admin_id',
        'reviewed_at',
    ];

    protected $casts = [
        'workers_needed' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }

    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'job_vacancy_id', 'post_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }

    public function occupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class);
    }

    public function linkedProgram(): BelongsTo
    {
        return $this->belongsTo(GovernmentProgram::class, 'linked_program_id', 'program_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'reviewed_by_admin_id', 'admin_id');
    }
}
