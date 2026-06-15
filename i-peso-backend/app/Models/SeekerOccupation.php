<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerOccupation extends Model
{
    protected $table = 'seeker_occupations';

    protected $primaryKey = 'id';

    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'seeker_id',
        'occupation_id',
        'general_term',
        'occupation_title',
        'raw_job_title',
        'status',
        'mapped_at',
        'preference_order',
    ];

    protected $casts = [
        'mapped_at' => 'datetime',
    ];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function occupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class);
    }
}
