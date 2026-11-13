<?php

namespace App\Services;

use App\Models\Administrator;
use App\Support\SystemSettingsRegistry;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Reads and saves System Settings (docs/system-settings.md).
 *
 * Saved values are cached forever and flushed on save, so a switch takes
 * effect on the very next request. Reads fail safe: if the table is missing
 * (fresh install, tests that don't create it) every setting is its default.
 */
class SystemSettings
{
    private const CACHE_KEY = 'system-settings:saved';

    /** @var array<string, mixed>|null per-request memo */
    private ?array $memo = null;

    /** Only the settings someone changed: key => value. */
    public function saved(): array
    {
        if ($this->memo !== null) {
            return $this->memo;
        }

        try {
            return $this->memo = Cache::rememberForever(self::CACHE_KEY, function () {
                return DB::table('system_settings')->pluck('value', 'key')
                    ->map(fn ($value) => json_decode($value, true))
                    ->all();
            });
        } catch (\Throwable) {
            // No table yet: defaults everywhere, and try again next request.
            return [];
        }
    }

    public function get(string $key): mixed
    {
        $saved = $this->saved();

        return array_key_exists($key, $saved) ? $saved[$key] : (SystemSettingsRegistry::defaults()[$key] ?? null);
    }

    public function bool(string $key): bool
    {
        return (bool) $this->get($key);
    }

    /** Every setting with its effective value. */
    public function all(): array
    {
        return array_replace(SystemSettingsRegistry::defaults(), array_intersect_key($this->saved(), SystemSettingsRegistry::definitions()));
    }

    /**
     * Save several settings at once. Returns [key => [before, after]] for the
     * ones that actually changed.
     */
    public function save(array $values, Administrator $admin): array
    {
        $changes = [];

        DB::transaction(function () use ($values, $admin, &$changes) {
            foreach ($values as $key => $value) {
                $value = SystemSettingsRegistry::cast($key, $value);
                $before = $this->get($key);
                if ($before === $value) {
                    continue;
                }

                DB::table('system_settings')->updateOrInsert(
                    ['key' => $key],
                    ['value' => json_encode($value), 'updated_by' => $admin->admin_id, 'updated_at' => now(), 'created_at' => now()]
                );
                $changes[$key] = [$before, $value];
            }
        });

        $this->flush();
        $this->applyToConfig();

        return $changes;
    }

    /** Put saved values over the config they replace (called at boot). */
    public function applyToConfig(): void
    {
        $saved = $this->saved();
        foreach (SystemSettingsRegistry::definitions() as $key => $definition) {
            if (isset($definition['config']) && array_key_exists($key, $saved)) {
                config([$definition['config'] => $saved[$key]]);
            }
        }
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
        $this->memo = null;
    }

    /** Who last changed each setting, for the settings screen. */
    public function audit(): array
    {
        try {
            return DB::table('system_settings')
                ->leftJoin('administrators', 'administrators.admin_id', '=', 'system_settings.updated_by')
                ->get(['system_settings.key', 'system_settings.updated_at', 'administrators.first_name', 'administrators.last_name'])
                ->mapWithKeys(fn ($row) => [$row->key => [
                    'updated_at' => $row->updated_at ? \Illuminate\Support\Carbon::parse($row->updated_at)->toIso8601String() : null,
                    'updated_by' => trim(($row->first_name ?? '').' '.($row->last_name ?? '')) ?: null,
                ]])
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    // ── Rules other code asks about ───────────────────────────────────────

    public function maintenanceOn(): bool
    {
        return $this->bool('maintenance.enabled');
    }

    public function registrationOpen(string $role): bool
    {
        return $this->bool($role === 'employer' ? 'registration.employers_open' : 'registration.seekers_open');
    }

    /**
     * Why an SMS with this purpose must not go out right now, or null if it may.
     * `$sentThisMonth` is only counted when a cap is set.
     */
    public function smsBlockReason(string $purpose, callable $sentThisMonth): ?string
    {
        if ($purpose === 'system_test') {
            return null;
        }
        if (! $this->bool('sms.enabled')) {
            return 'SMS is switched off in System Settings.';
        }

        $type = SystemSettingsRegistry::smsTypeFor($purpose);
        if ($type && ! $this->bool("sms.types.{$type}")) {
            return SystemSettingsRegistry::SMS_TYPES[$type]['label'].' are switched off in System Settings.';
        }

        $cap = (int) $this->get('sms.monthly_cap');
        if ($cap > 0 && $sentThisMonth() >= $cap) {
            return "This month's SMS limit ({$cap}) has been reached.";
        }

        return null;
    }
}
