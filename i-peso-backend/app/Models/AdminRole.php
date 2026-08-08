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
        'configuration' => 'Configuration',
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

    public function hasModule(string $module): bool
    {
        return $this->slug === 'administrator' || in_array($module, $this->permissions ?? [], true);
    }
}
