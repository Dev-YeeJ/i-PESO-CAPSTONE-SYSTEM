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
        'occupation_id',
        'job_title',
        'employment_type',
        'work_setup',
        'location',
        'region',
        'province',
        'province_code',
        'city_municipality',
        'city_code',
        'barangay',
        'barangay_code',
        'specific_address',
        'latitude',
        'longitude',
        'geoapify_place_id',
        'job_description',
        'vacancies_count',
        'minimum_education',
        'target_courses',
        'experience_level',
        'salary_min',
        'salary_max',
        'salary_type',
        'hide_salary',
        'benefits',
        'required_skills',
        'soft_skills',
        'required_certifications',
        'application_deadline',
        'open_to_pwds',
        'open_to_senior_citizens',
        'spes_tupad_eligible',
        'status',
    ];

    protected $casts = [
        'required_skills' => 'array',
        'target_courses' => 'array',
        'soft_skills' => 'array',
        'required_certifications' => 'array',
        'benefits' => 'array',
        'salary_min' => 'decimal:2',
        'salary_max' => 'decimal:2',
        'hide_salary' => 'boolean',
        'application_deadline' => 'date',
        'open_to_pwds' => 'boolean',
        'open_to_senior_citizens' => 'boolean',
        'spes_tupad_eligible' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }

    public function occupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class);
    }
}
