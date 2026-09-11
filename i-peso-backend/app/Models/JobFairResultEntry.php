<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobFairResultEntry extends Model
{
    protected $fillable = ['result_report_id', 'seeker_id', 'applicant_name', 'gender', 'city_municipality', 'contact_number', 'age_group', 'highest_education', 'classification_codes', 'position_applied_for', 'status', 'mismatch_code', 'remarks'];
    protected $casts = ['classification_codes' => 'array'];
    public function report(): BelongsTo { return $this->belongsTo(JobFairResultReport::class, 'result_report_id'); }
    public function seeker(): BelongsTo { return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id'); }
}
