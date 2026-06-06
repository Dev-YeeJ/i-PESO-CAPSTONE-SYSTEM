<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerEducation extends Model
{
    protected $table      = 'seeker_educations';
    protected $primaryKey = 'id';
    protected $keyType    = 'int';
    public $timestamps    = true;

    protected $fillable = [
        'seeker_id',
        'level',
        'course_strand',
        'year_graduated',
        'undergrad_level_reached',
        'undergrad_year_last_attended',
    ];

    protected $casts = [
        'year_graduated'                => 'integer',
        'undergrad_year_last_attended'  => 'integer',
    ];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}
