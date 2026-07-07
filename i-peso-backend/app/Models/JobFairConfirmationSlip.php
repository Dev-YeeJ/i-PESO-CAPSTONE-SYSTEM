<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobFairConfirmationSlip extends Model
{
    protected $fillable = [
        'job_fair_id', 'job_fair_employer_id', 'employer_id', 'company_name',
        'representative_1_name', 'representative_1_contact', 'representative_2_name',
        'representative_2_contact', 'email', 'number_of_job_vacancies',
        'will_conduct_onsite_interview', 'logistics_requests', 'source', 'dedupe_key',
        'submitted_by', 'submitted_at',
    ];
    protected $casts = ['number_of_job_vacancies' => 'integer', 'will_conduct_onsite_interview' => 'boolean', 'submitted_at' => 'datetime'];

    public function jobFair(): BelongsTo { return $this->belongsTo(JobFair::class, 'job_fair_id', 'job_fair_id'); }
    public function employer(): BelongsTo { return $this->belongsTo(Employer::class, 'employer_id', 'employer_id'); }
    public function participation(): BelongsTo { return $this->belongsTo(JobFairEmployer::class, 'job_fair_employer_id'); }
}
