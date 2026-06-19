<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewSchedule extends Model
{
    protected $table = 'interview_schedules';

    protected $primaryKey = 'interview_id';

    protected $fillable = [
        'apply_id',
        'mode_of_interview',
        'schedule',
        'venue_or_link',
        'instructions',
        'status',
    ];

    protected $casts = [
        'schedule' => 'datetime',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class, 'apply_id', 'apply_id');
    }
}
