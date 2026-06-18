<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerEducation extends Model
{
    protected $table = 'seeker_educations';

    protected $primaryKey = 'id';

    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'seeker_id',
        'level',
        'course_strand',
        'normalized_course_strand',
        'completion_status',
        'year_started',
        'year_graduated',
        'undergrad_level_reached',
        'undergrad_year_last_attended',
        'current_level',
        'gpa',
        'academic_honors',
        'completed_courses',
        'is_verified',
        'institution_name',
    ];

    protected $casts = [
        'year_graduated' => 'integer',
        'year_started' => 'integer',
        'undergrad_year_last_attended' => 'integer',
        'gpa' => 'float',
        'completed_courses' => 'array',
        'is_verified' => 'boolean',
    ];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}
