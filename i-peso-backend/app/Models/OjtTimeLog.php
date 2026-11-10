<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One intern's time in / time out for one day. Hours only count toward the
 * required total once the system administrator approves the entry.
 */
class OjtTimeLog extends Model
{
    /** PESO Urdaneta's clock: work dates and displayed times use Philippine time. */
    public const TIMEZONE = 'Asia/Manila';

    public const OPEN = 'open';

    public const PENDING = 'pending';

    public const APPROVED = 'approved';

    public const REJECTED = 'rejected';

    protected $fillable = [
        'admin_id', 'work_date', 'time_in', 'time_out', 'minutes', 'status',
        'corrected', 'note', 'reviewed_by', 'reviewed_at', 'time_in_ip', 'time_out_ip',
    ];

    protected $casts = [
        'work_date' => 'date:Y-m-d',
        'time_in' => 'datetime',
        'time_out' => 'datetime',
        'reviewed_at' => 'datetime',
        'corrected' => 'boolean',
        'minutes' => 'integer',
    ];

    public static function today(): string
    {
        return Carbon::now(self::TIMEZONE)->toDateString();
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'admin_id', 'admin_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'reviewed_by', 'admin_id');
    }

    /**
     * What to show: an open entry from an earlier day means they forgot to
     * time out, and the system administrator has to fill it in.
     */
    public function displayStatus(): string
    {
        if ($this->status === self::OPEN && $this->work_date->toDateString() < self::today()) {
            return 'incomplete';
        }

        return $this->status;
    }

    public static function minutesBetween(Carbon $timeIn, Carbon $timeOut): int
    {
        return max(0, (int) floor($timeIn->diffInMinutes($timeOut, false)));
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'work_date' => $this->work_date->toDateString(),
            'time_in' => $this->time_in?->toIso8601String(),
            'time_out' => $this->time_out?->toIso8601String(),
            'minutes' => $this->minutes,
            'hours' => $this->minutes !== null ? round($this->minutes / 60, 2) : null,
            'status' => $this->displayStatus(),
            'corrected' => $this->corrected,
            'note' => $this->note,
            'reviewed_by' => $this->reviewer ? trim("{$this->reviewer->first_name} {$this->reviewer->last_name}") : null,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
        ];
    }
}
