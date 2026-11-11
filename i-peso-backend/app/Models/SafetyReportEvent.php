<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One entry in a case's history: submission, reporter updates, status and
 * priority changes, internal notes and recorded actions. Internal entries are
 * shown to authorized PESO staff only — the reporter's own view is built from
 * the case status and their own updates, never from this table's notes.
 */
class SafetyReportEvent extends Model
{
    protected $table = 'safety_report_events';

    public const KIND_SUBMITTED = 'submitted';

    public const KIND_REPORTER_UPDATE = 'reporter_update';

    public const KIND_STATUS = 'status_changed';

    public const KIND_PRIORITY = 'priority_changed';

    public const KIND_ASSIGNED = 'assigned';

    public const KIND_NOTE = 'note';

    public const KIND_ACTION = 'action';

    protected $fillable = [
        'report_id',
        'actor_type',
        'actor_admin_id',
        'kind',
        'from_value',
        'to_value',
        'body',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(SafetyReport::class, 'report_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'actor_admin_id', 'admin_id');
    }
}
