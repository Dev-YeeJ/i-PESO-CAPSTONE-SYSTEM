<?php

namespace App\Models;

use App\Support\FeedbackAspects;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A job seeker's review of an employer, tied to a verified interaction.
 * The public sees it as "Verified applicant" / "Verified employee" only.
 */
class EmployerReview extends Model
{
    public const PUBLISHED = 'published';

    /** Waiting for PESO: failed the automatic checks, or was edited after being hidden. */
    public const HELD = 'held';

    /** Hidden by PESO, with a note the reviewer can read. */
    public const HIDDEN = 'hidden';

    protected $fillable = [
        'employer_id', 'seeker_id', 'application_id', 'placement_record_id', 'type',
        'ratings', 'recommend', 'comment', 'limited', 'status', 'hold_reason',
        'moderation_note', 'moderated_by', 'moderated_at', 'edited_at', 'submitted_ip',
    ];

    protected $casts = [
        'ratings' => 'array',
        'recommend' => 'boolean',
        'limited' => 'boolean',
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

    public function placementRecord(): BelongsTo
    {
        return $this->belongsTo(PlacementRecord::class, 'placement_record_id');
    }

    public function reply(): HasOne
    {
        return $this->hasOne(EmployerReviewReply::class, 'review_id');
    }

    public function flags(): HasMany
    {
        return $this->hasMany(EmployerReviewFlag::class, 'review_id');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::PUBLISHED);
    }

    public function aspects(): array
    {
        return FeedbackAspects::forReview($this->type, $this->limited);
    }

    /** Average of this review's own stars. */
    public function averageRating(): ?float
    {
        $values = array_values(array_filter($this->ratings ?? [], 'is_numeric'));

        return $values === [] ? null : round(array_sum($values) / count($values), 1);
    }
}
