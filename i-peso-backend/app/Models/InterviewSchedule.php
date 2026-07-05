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
        'interview_reminder_24h_sent_at',
        'interview_reminder_1h_sent_at',
        'interview_reminder_15m_sent_at',
    ];

    protected $casts = [
        'schedule' => 'datetime',
        'interview_reminder_24h_sent_at' => 'datetime',
        'interview_reminder_1h_sent_at' => 'datetime',
        'interview_reminder_15m_sent_at' => 'datetime',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class, 'apply_id', 'apply_id');
    }
}
