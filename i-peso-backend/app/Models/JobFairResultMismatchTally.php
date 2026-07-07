<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobFairResultMismatchTally extends Model
{
    protected $fillable = ['result_report_id', 'mismatch_code', 'count'];
    protected $casts = ['count' => 'integer'];
    public function report(): BelongsTo { return $this->belongsTo(JobFairResultReport::class, 'result_report_id'); }
}
