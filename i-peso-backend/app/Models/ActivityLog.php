<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ActivityLog extends Model
{
    /**
     * Actor classes that may appear in the polymorphic user_type column,
     * mapped to the label shown in the admin audit trail.
     */
    public const ACTOR_TYPES = [
        Administrator::class => 'Administrator',
        Employer::class => 'Employer',
        JobSeeker::class => 'Job Seeker',
    ];

    /** Recorded when the event has no authenticated actor (e.g. a failed login). */
    public const TYPE_GUEST = 'guest';

    protected $primaryKey = 'log_id';

    protected $fillable = [
        'user_type',
        'user_id',
        'action',
        'description',
        'ip_address',
    ];

    protected $appends = [
        'user_type_label',
        'severity',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ── SCOPES ───────────────────────────────────────────────────────────────

    public function scopeForAction(Builder $query, ?string $action): Builder
    {
        return $query->when($action, fn (Builder $builder) => $builder->where('action', $action));
    }

    /** Accepts either a fully qualified actor class or a short alias ("employer", "seeker"). */
    public function scopeForUserType(Builder $query, ?string $userType): Builder
    {
        return $query->when(
            $userType,
            fn (Builder $builder) => $builder->where('user_type', self::resolveUserType($userType))
        );
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (blank($term)) {
            return $query;
        }

        // Escape LIKE wildcards so a literal "%" typed by an admin stays literal.
        $needle = '%'.addcslashes(trim($term), '%_\\').'%';

        return $query->where(function (Builder $builder) use ($needle) {
            $builder->where('description', 'like', $needle)
                ->orWhere('action', 'like', $needle)
                ->orWhere('ip_address', 'like', $needle);
        });
    }

    public function scopeLoggedBetween(Builder $query, ?string $from, ?string $to): Builder
    {
        return $query
            ->when($from, fn (Builder $builder) => $builder->whereDate('created_at', '>=', $from))
            ->when($to, fn (Builder $builder) => $builder->whereDate('created_at', '<=', $to));
    }

    // ── ACCESSORS ────────────────────────────────────────────────────────────

    public function getUserTypeLabelAttribute(): string
    {
        return self::ACTOR_TYPES[$this->user_type] ?? 'Guest';
    }

    /**
     * Coarse classification used by the audit UI to colour-code rows. Keyword
     * based so newly added actions are grouped sensibly without a lookup table.
     */
    public function getSeverityAttribute(): string
    {
        return match (true) {
            (bool) preg_match('/(failed|rejected|deleted|revoked|suspended|cancelled)/', $this->action) => 'critical',
            (bool) preg_match('/(login|logout|registered|password|verified|downloaded)/', $this->action) => 'security',
            (bool) preg_match('/(approved|created|posted|applied|submitted|finalized)/', $this->action) => 'success',
            default => 'normal',
        };
    }

    // ── ACTOR RESOLUTION ─────────────────────────────────────────────────────

    /**
     * Attach a human readable actor_name to each log. The user_type column is a
     * plain string rather than a real morph, so actors are resolved in one query
     * per distinct type instead of one per row.
     */
    public static function hydrateActorNames(Collection $logs): void
    {
        foreach ($logs->groupBy('user_type') as $userType => $group) {
            $names = self::resolveNames((string) $userType, $group->pluck('user_id')->unique()->all());

            foreach ($group as $log) {
                $log->setAttribute(
                    'actor_name',
                    $names[$log->user_id] ?? self::fallbackName((string) $userType, $log->user_id)
                );
            }
        }
    }

    /** @return array<int, string> */
    private static function resolveNames(string $userType, array $ids): array
    {
        if ($ids === [] || ! array_key_exists($userType, self::ACTOR_TYPES)) {
            return [];
        }

        return $userType::query()
            ->whereIn((new $userType)->getKeyName(), $ids)
            ->get()
            ->mapWithKeys(fn (Model $actor) => [$actor->getKey() => self::labelFor($actor)])
            ->all();
    }

    private static function labelFor(Model $actor): string
    {
        $name = $actor instanceof Employer
            ? (string) $actor->company_name
            : trim("{$actor->first_name} {$actor->last_name}");

        return $name !== '' ? $name : (string) $actor->email;
    }

    private static function fallbackName(string $userType, ?int $userId): string
    {
        if ($userType === self::TYPE_GUEST) {
            return 'Unauthenticated visitor';
        }

        // The actor row was deleted after the event was logged — keep the audit trail readable.
        return sprintf('%s #%s (deleted)', self::ACTOR_TYPES[$userType] ?? 'Unknown', $userId ?? '?');
    }

    public static function resolveUserType(string $value): string
    {
        return match (Str::lower(trim($value))) {
            'administrator', 'admin' => Administrator::class,
            'employer' => Employer::class,
            'seeker', 'jobseeker', 'job seeker' => JobSeeker::class,
            'guest' => self::TYPE_GUEST,
            default => $value,
        };
    }
}
