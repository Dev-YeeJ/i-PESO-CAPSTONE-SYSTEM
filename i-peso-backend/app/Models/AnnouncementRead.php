<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/** One reader (job seeker or employer) having opened and/or dismissed one announcement. */
class AnnouncementRead extends Model
{
    protected $fillable = [
        'announcement_id',
        'reader_type',
        'reader_id',
        'read_at',
        'dismissed_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'dismissed_at' => 'datetime',
    ];

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function reader(): MorphTo
    {
        return $this->morphTo();
    }
}
