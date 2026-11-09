<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdminRole extends Model
{
    /**
     * Fixed catalog of gate-able admin modules, one per sidebar category
     * that isn't visible to every signed-in administrator by default
     * (Dashboard/Overview has no entry — every admin account can see it).
     */
    public const MODULES = [
        'constituent_crm' => 'Constituent CRM',
        'employment_hub' => 'Employment Hub',
        'government_dole' => 'Government & DOLE',
        'system_reports' => 'System & Reports',
        'activity_logs' => 'Activity Logs',
        'configuration' => 'Configuration',
    ];

    public const VIEW = 'view';

    public const MANAGE = 'manage';

    public const NONE = 'none';

    /** "view" lets an account open and export; "manage" also lets it save, change and delete. */
    public const LEVELS = [
        self::VIEW => 'View only',
        self::MANAGE => 'Full access',
    ];

    protected $fillable = ['name', 'slug', 'permissions', 'is_system'];

    protected $casts = [
        'permissions' => 'array',
        'is_system' => 'boolean',
    ];

    public function administrators(): HasMany
    {
        return $this->hasMany(Administrator::class, 'admin_role_id');
    }

    /** 'none', 'view' or 'manage'. The system administrator role always manages everything. */
    public function accessLevel(string $module): string
    {
        if ($this->slug === 'administrator') {
            return self::MANAGE;
        }

        return self::normalizePermissions($this->permissions)[$module] ?? self::NONE;
    }

    public function hasModule(string $module): bool
    {
        return $this->accessLevel($module) !== self::NONE;
    }

    /** Every module with its level, for the Roles screen. */
    public function accessMap(): array
    {
        $map = [];
        foreach (array_keys(self::MODULES) as $module) {
            $map[$module] = $this->accessLevel($module);
        }

        return $map;
    }

    /**
     * Accepts the current {module: level} format and the original plain list
     * of module keys (each meaning full access), and drops unknown modules,
     * unknown levels and "none" entries.
     */
    public static function normalizePermissions(?array $permissions): array
    {
        $normalized = [];

        foreach ($permissions ?? [] as $key => $value) {
            [$module, $level] = is_int($key) ? [$value, self::MANAGE] : [$key, $value];

            if (is_string($module) && isset(self::MODULES[$module]) && isset(self::LEVELS[$level])) {
                $normalized[$module] = $level;
            }
        }

        return $normalized;
    }
}
