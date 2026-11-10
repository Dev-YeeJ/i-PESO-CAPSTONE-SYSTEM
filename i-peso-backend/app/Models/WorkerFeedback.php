<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An employer's private feedback about someone they hired. Never public and
 * never shown to other employers: only PESO staff and the worker can read it.
 */
class WorkerFeedback extends Model
{
    protected $table = 'worker_feedback';

    protected $fillable = [
        'employer_id', 'seeker_id', 'application_id', 'placement_record_id',
        'ratings', 'would_rehire', 'comment', 'status',
        'moderation_note', 'moderated_by', 'moderated_at', 'edited_at',
    ];

    protected $casts = [
        'ratings' => 'array',
        'moderated_at' => 'datetime',
        'edited_at' => 'datetime',
    ];

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id')->withTrashed();
    }

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class, 'application_id', 'apply_id');
    }
}
