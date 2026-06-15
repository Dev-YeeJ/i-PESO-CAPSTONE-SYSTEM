<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerEligibility extends Model
{
    protected $table = 'seeker_eligibilities';

    protected $primaryKey = 'id';

    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'seeker_id',
        'type',
        'name',
        'normalized_name',
        'date_taken',
        'valid_until',
    ];

    protected $casts = [
        'date_taken' => 'date',
        'valid_until' => 'date',
    ];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}
