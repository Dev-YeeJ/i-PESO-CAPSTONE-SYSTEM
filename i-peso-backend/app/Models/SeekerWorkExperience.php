<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerWorkExperience extends Model
{
    protected $table      = 'seeker_work_experiences';
    protected $primaryKey = 'id';
    protected $keyType    = 'int';
    public $timestamps    = true;

    protected $fillable = [
        'seeker_id',
        'company_name',
        'company_address',
        'position',
        'number_of_months',
        'employment_status',
    ];

    protected $casts = [
        'number_of_months' => 'integer',
    ];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}
