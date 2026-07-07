<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobFairRequirementSubmission extends Model
{
    protected $fillable = [
        'job_fair_requirement_id', 'job_fair_employer_id', 'employer_id', 'employer_document_id',
        'document_path', 'original_filename', 'file_size', 'mime_type', 'status', 'admin_remarks',
        'submitted_at', 'reviewed_at', 'reviewed_by',
    ];
    protected $casts = ['file_size' => 'integer', 'submitted_at' => 'datetime', 'reviewed_at' => 'datetime'];

    public function requirement(): BelongsTo { return $this->belongsTo(JobFairRequirement::class, 'job_fair_requirement_id'); }
    public function participation(): BelongsTo { return $this->belongsTo(JobFairEmployer::class, 'job_fair_employer_id'); }
    public function employer(): BelongsTo { return $this->belongsTo(Employer::class, 'employer_id', 'employer_id'); }
}
