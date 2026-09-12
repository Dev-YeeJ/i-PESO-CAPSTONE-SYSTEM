<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobFairConfirmationVacancy extends Model
{
    protected $fillable = [
        'confirmation_slip_id', 'job_vacancy_id', 'number_needed',
        'position_title', 'qualifications', 'place_of_work',
    ];
    protected $casts = ['number_needed' => 'integer'];

    public function confirmationSlip(): BelongsTo { return $this->belongsTo(JobFairConfirmationSlip::class, 'confirmation_slip_id'); }
    public function jobVacancy(): BelongsTo { return $this->belongsTo(JobVacancy::class, 'job_vacancy_id', 'post_id'); }
}
