<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerOccupation extends Model
{
    protected $table    = 'seeker_occupations';
    protected $fillable = ['seeker_id', 'occupation_title', 'preference_order'];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}