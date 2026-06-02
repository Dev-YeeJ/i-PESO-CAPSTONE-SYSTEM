<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerDisability extends Model
{
    protected $table    = 'seeker_disabilities';
    protected $fillable = ['seeker_id', 'disability_type', 'disability_specification'];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}