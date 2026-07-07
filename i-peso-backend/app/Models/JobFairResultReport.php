<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobFairResultReport extends Model
{
    protected $fillable = [
        'job_fair_id', 'job_fair_employer_id', 'employer_id', 'company_name', 'normalized_company_name',
        'dedupe_key', 'employer_type', 'source', 'contact_person', 'contact_number', 'total_male',
        'total_female', 'total_applicants', 'total_hots', 'total_near_hired', 'total_rejected',
        'total_vacancies_solicited', 'total_vacancies_offered', 'remarks', 'encoded_by_admin_id',
        'submitted_by_employer_id', 'submitted_at', 'report_generated_at',
    ];
    protected $casts = [
        'total_male' => 'integer', 'total_female' => 'integer', 'total_applicants' => 'integer',
        'total_hots' => 'integer', 'total_near_hired' => 'integer', 'total_rejected' => 'integer',
        'total_vacancies_solicited' => 'integer', 'total_vacancies_offered' => 'integer',
        'submitted_at' => 'datetime', 'report_generated_at' => 'datetime',
    ];

    public function jobFair(): BelongsTo { return $this->belongsTo(JobFair::class, 'job_fair_id', 'job_fair_id'); }
    public function employer(): BelongsTo { return $this->belongsTo(Employer::class, 'employer_id', 'employer_id'); }
    public function participation(): BelongsTo { return $this->belongsTo(JobFairEmployer::class, 'job_fair_employer_id'); }
    public function entries(): HasMany { return $this->hasMany(JobFairResultEntry::class, 'result_report_id'); }
    public function mismatchTallies(): HasMany { return $this->hasMany(JobFairResultMismatchTally::class, 'result_report_id'); }
}
