<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A snapshot of a section or FAQ taken right after it was saved. */
class SiteContentRevision extends Model
{
    public const UPDATED_AT = null;

    public const TYPE_SECTION = 'section';
    public const TYPE_FAQ = 'faq';

    /** How many snapshots are kept per section / FAQ. */
    public const KEEP = 20;

    protected $fillable = ['content_type', 'content_key', 'value', 'changed_fields', 'action', 'changed_by'];

    protected $casts = [
        'value' => 'array',
        'changed_fields' => 'array',
    ];

    public function author(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'changed_by', 'admin_id');
    }
}
