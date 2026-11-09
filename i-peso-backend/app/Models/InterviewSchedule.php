<?php

namespace App\Models;

use Carbon\CarbonInterface;
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

    /**
     * Employers only pick a start time, so the end is assumed. One hour is
     * long enough that "Call ended" never shows while a normal interview is
     * still running. The calendar draws its blocks with the same length.
     */
    public const ASSUMED_DURATION_MINUTES = 60;

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class, 'apply_id', 'apply_id');
    }

    public function endsAt(): ?CarbonInterface
    {
        return $this->schedule?->copy()->addMinutes(self::ASSUMED_DURATION_MINUTES);
    }

    /**
     * Where the interview stands right now: upcoming, in_progress, ended or cancelled.
     *
     * Older rows were marked "cancelled" when the employer hired or rejected
     * after the interview took place. If that update came after the interview
     * time, the interview did happen, so it counts as ended.
     */
    public function phase(?CarbonInterface $now = null): string
    {
        $now ??= now();
        $endsAt = $this->endsAt();

        if ($this->status === 'completed') {
            return 'ended';
        }

        if ($this->status === 'cancelled') {
            return $endsAt && $this->updated_at && $this->updated_at->gte($endsAt) ? 'ended' : 'cancelled';
        }

        if (! $this->schedule) {
            return 'upcoming';
        }

        if ($now->gte($endsAt)) {
            return 'ended';
        }

        return $now->gte($this->schedule) ? 'in_progress' : 'upcoming';
    }

    /**
     * Status to store when the application leaves the interview stage:
     * "completed" if the interview time has passed, otherwise "cancelled".
     */
    public function closingStatus(?CarbonInterface $now = null): string
    {
        $endsAt = $this->endsAt();

        return $endsAt && ($now ?? now())->gte($endsAt) ? 'completed' : 'cancelled';
    }
}
