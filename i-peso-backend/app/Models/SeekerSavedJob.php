<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerSavedJob extends Model
{
    protected $table = 'seeker_saved_jobs';

    protected $fillable = [
        'seeker_id',
        'vacancy_id',
    ];

    public function jobSeeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function jobVacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'vacancy_id', 'post_id');
    }
}
