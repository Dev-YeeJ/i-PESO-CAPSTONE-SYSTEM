<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobFairResultEntry extends Model
{
    protected $fillable = ['result_report_id', 'applicant_name', 'gender', 'city_municipality', 'contact_number', 'age_group', 'highest_education', 'position_applied_for', 'status', 'mismatch_code', 'remarks'];
    public function report(): BelongsTo { return $this->belongsTo(JobFairResultReport::class, 'result_report_id'); }
}
