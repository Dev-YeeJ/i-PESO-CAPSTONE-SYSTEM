<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One version of a policy page. Published versions are never edited; a
 * change is a new draft that is published with its own effective date, so
 * anyone can still read the exact text they agreed to.
 */
class PolicyVersion extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';

    protected $fillable = [
        'policy', 'version', 'status', 'is_builtin', 'effective_at', 'summary', 'sections',
        'change_note', 'created_by', 'updated_by', 'published_by', 'published_at',
    ];

    protected $casts = [
        'version' => 'integer',
        'is_builtin' => 'boolean',
        'effective_at' => 'date',
        'summary' => 'array',
        'sections' => 'array',
        'published_at' => 'datetime',
    ];

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'published_by', 'admin_id');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'updated_by', 'admin_id');
    }

    public function scopeFor(Builder $query, string $policy): Builder
    {
        return $query->where('policy', $policy);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    /** Newest effective first; a later version wins a tie on the same day. */
    public function scopeNewestFirst(Builder $query): Builder
    {
        return $query->orderByDesc('effective_at')->orderByDesc('version');
    }
}
