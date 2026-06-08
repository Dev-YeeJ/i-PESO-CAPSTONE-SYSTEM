<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobVacancy extends Model
{
    protected $table = 'job_vacancies';

    protected $primaryKey = 'post_id';

    protected $fillable = [
        'employer_id',
        'job_title',
        'employment_type',
        'location',
        'job_description',
        'vacancies_count',
        'salary_min',
        'salary_max',
        'required_skills',
        'status',
    ];

    protected $casts = [
        'required_skills' => 'array',
        'salary_min' => 'decimal:2',
        'salary_max' => 'decimal:2',
    ];

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }
}
