<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerWorkExperience extends Model
{
    protected $table = 'seeker_work_experiences';

    protected $primaryKey = 'id';

    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'seeker_id',
        'occupation_id',
        'company_name',
        'company_address',
        'position',
        'normalized_position',
        'number_of_months',
        'start_date',
        'end_date',
        'currently_employed',
        'employment_status',
    ];

    protected $casts = [
        'number_of_months' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
        'currently_employed' => 'boolean',
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
