<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A frequently asked question shown on /help, the seeker and employer Help
 * pages, the landing page (featured ones) and in the assistant's reference
 * text. New FAQs start unpublished so half-written answers never go live.
 */
class Faq extends Model
{
    public const AUDIENCE_EVERYONE = 'everyone';
    public const AUDIENCE_SEEKERS = 'seekers';
    public const AUDIENCE_EMPLOYERS = 'employers';

    public const AUDIENCES = [
        self::AUDIENCE_EVERYONE => 'Everyone',
        self::AUDIENCE_SEEKERS => 'Job seekers',
        self::AUDIENCE_EMPLOYERS => 'Employers',
    ];

    /** In display order. */
    public const TOPICS = [
        'account' => 'Registration & account',
        'jobs' => 'Jobs & applications',
        'verification' => 'Employer verification',
        'job_fairs' => 'Job fairs',
        'programs' => 'Government programs',
        'reports' => 'Employer reports',
        'office' => 'Office & services',
    ];

    /** The landing page shows at most this many featured FAQs. */
    public const MAX_FEATURED = 5;

    protected $fillable = [
        'question', 'answer', 'audience', 'topic', 'link_label', 'link_url',
        'is_published', 'is_featured', 'sort_order', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'is_featured' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'created_by', 'admin_id');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'updated_by', 'admin_id');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    /** Audiences a reader of the given role sees: Everyone plus their own. */
    public static function audiencesFor(?string $role): array
    {
        return match ($role) {
            'seeker' => [self::AUDIENCE_EVERYONE, self::AUDIENCE_SEEKERS],
            'employer' => [self::AUDIENCE_EVERYONE, self::AUDIENCE_EMPLOYERS],
            default => [self::AUDIENCE_EVERYONE],
        };
    }

    /** Topic order first, then the order staff dragged them into. */
    public static function sortForDisplay(Collection|\Illuminate\Support\Collection $faqs): \Illuminate\Support\Collection
    {
        $topicOrder = array_flip(array_keys(self::TOPICS));

        return collect($faqs)->sortBy([
            fn ($a, $b) => ($topicOrder[$a->topic] ?? 99) <=> ($topicOrder[$b->topic] ?? 99),
            fn ($a, $b) => $a->sort_order <=> $b->sort_order,
            fn ($a, $b) => $a->id <=> $b->id,
        ])->values();
    }

    /** What a reader (public, seeker, employer, mobile) receives. */
    public function toReaderArray(): array
    {
        return [
            'id' => $this->id,
            'question' => $this->question,
            'answer' => $this->answer,
            'audience' => $this->audience,
            'topic' => $this->topic,
            'topic_label' => self::TOPICS[$this->topic] ?? $this->topic,
            'link_label' => $this->link_label,
            'link_url' => $this->link_url,
            'is_featured' => $this->is_featured,
            'sort_order' => $this->sort_order,
        ];
    }

    /** The fields a revision snapshot keeps (publish state is not restored). */
    public function snapshot(): array
    {
        return $this->only(['question', 'answer', 'audience', 'topic', 'link_label', 'link_url']);
    }
}
