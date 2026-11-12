<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A PESO announcement (docs/announcement-module-plan.md).
 *
 * Stored status is draft / published / archived; the state readers and the
 * admin list see (scheduled, live, expired) is derived from it plus
 * publish_at / expires_at, so a scheduled announcement goes live — and an
 * expiring one disappears — on time without any job having to run.
 */
class Announcement extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    public const STATE_DRAFT = 'draft';
    public const STATE_SCHEDULED = 'scheduled';
    public const STATE_LIVE = 'live';
    public const STATE_EXPIRED = 'expired';
    public const STATE_ARCHIVED = 'archived';

    public const AUDIENCE_PUBLIC = 'public';
    public const AUDIENCE_ALL = 'all';
    public const AUDIENCE_SEEKERS = 'seekers';
    public const AUDIENCE_EMPLOYERS = 'employers';

    public const CATEGORIES = [
        'general' => 'General update',
        'job_fair' => 'Job fairs & events',
        'program' => 'Programs & services',
        'advisory' => 'Office advisory',
        'system' => 'System notice',
    ];

    public const PRIORITIES = [
        'normal' => 'Normal',
        'important' => 'Important',
        'urgent' => 'Urgent',
    ];

    public const AUDIENCES = [
        self::AUDIENCE_PUBLIC => 'Public (everyone, including the landing page)',
        self::AUDIENCE_ALL => 'All signed-in users',
        self::AUDIENCE_SEEKERS => 'Job seekers',
        self::AUDIENCE_EMPLOYERS => 'Employers',
    ];

    public const STATE_LABELS = [
        self::STATE_DRAFT => 'Draft',
        self::STATE_SCHEDULED => 'Scheduled',
        self::STATE_LIVE => 'Live',
        self::STATE_EXPIRED => 'Ended',
        self::STATE_ARCHIVED => 'Archived',
    ];

    protected $fillable = [
        'title',
        'body',
        'category',
        'priority',
        'audience',
        'status',
        'is_pinned',
        'publish_at',
        'expires_at',
        'first_published_at',
        'link_label',
        'link_url',
        'attachment_path',
        'attachment_name',
        'attachment_mime',
        'notify_users',
        'notified_at',
        'notified_count',
        'created_by',
        'updated_by',
        'published_by',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'notify_users' => 'boolean',
        'notified_count' => 'integer',
        'publish_at' => 'datetime',
        'expires_at' => 'datetime',
        'first_published_at' => 'datetime',
        'notified_at' => 'datetime',
    ];

    protected $hidden = ['attachment_path'];

    // ── Relations ───────────────────────────────────────────────────────

    public function reads(): HasMany
    {
        return $this->hasMany(AnnouncementRead::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'created_by', 'admin_id');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'updated_by', 'admin_id');
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'published_by', 'admin_id');
    }

    // ── Visibility ──────────────────────────────────────────────────────

    /** Published, publish time reached, not expired. */
    public function scopeLive(Builder $query): Builder
    {
        $now = now();

        return $query->where('status', self::STATUS_PUBLISHED)
            ->whereNotNull('publish_at')
            ->where('publish_at', '<=', $now)
            ->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now));
    }

    /** Restrict to what $reader may see; null = a signed-out visitor. */
    public function scopeVisibleTo(Builder $query, ?Model $reader): Builder
    {
        return $query->whereIn('audience', self::audiencesFor($reader));
    }

    /** Pinned first, then most recently published. */
    public function scopeFeedOrder(Builder $query): Builder
    {
        return $query->orderByDesc('is_pinned')->orderByDesc('publish_at')->orderByDesc('id');
    }

    /** @return list<string> the audience values $reader belongs to */
    public static function audiencesFor(?Model $reader): array
    {
        return match (true) {
            $reader instanceof JobSeeker => [self::AUDIENCE_PUBLIC, self::AUDIENCE_ALL, self::AUDIENCE_SEEKERS],
            $reader instanceof Employer => [self::AUDIENCE_PUBLIC, self::AUDIENCE_ALL, self::AUDIENCE_EMPLOYERS],
            default => [self::AUDIENCE_PUBLIC],
        };
    }

    public function isVisibleTo(?Model $reader): bool
    {
        return $this->isLive() && in_array($this->audience, self::audiencesFor($reader), true);
    }

    // ── State ───────────────────────────────────────────────────────────

    public function state(): string
    {
        if ($this->status === self::STATUS_ARCHIVED) {
            return self::STATE_ARCHIVED;
        }

        if ($this->status !== self::STATUS_PUBLISHED || ! $this->publish_at) {
            return self::STATE_DRAFT;
        }

        if ($this->publish_at->isFuture()) {
            return self::STATE_SCHEDULED;
        }

        if ($this->expires_at && ! $this->expires_at->isFuture()) {
            return self::STATE_EXPIRED;
        }

        return self::STATE_LIVE;
    }

    public function isLive(): bool
    {
        return $this->state() === self::STATE_LIVE;
    }

    /** Anything a reader may have seen stays on record — only never-published drafts can be deleted. */
    public function canBeDeleted(): bool
    {
        return $this->first_published_at === null;
    }

    /** Apply a state filter (as used by the admin list tabs) to a query. */
    public static function applyStateFilter(Builder $query, string $state): Builder
    {
        $now = now();

        return match ($state) {
            self::STATE_DRAFT => $query->where(fn (Builder $q) => $q->where('status', self::STATUS_DRAFT)
                ->orWhere(fn (Builder $q) => $q->where('status', self::STATUS_PUBLISHED)->whereNull('publish_at'))),
            self::STATE_SCHEDULED => $query->where('status', self::STATUS_PUBLISHED)->where('publish_at', '>', $now),
            self::STATE_LIVE => $query->live(),
            self::STATE_EXPIRED => $query->where('status', self::STATUS_PUBLISHED)
                ->where('publish_at', '<=', $now)
                ->whereNotNull('expires_at')->where('expires_at', '<=', $now),
            self::STATE_ARCHIVED => $query->where('status', self::STATUS_ARCHIVED),
            default => $query,
        };
    }
}
