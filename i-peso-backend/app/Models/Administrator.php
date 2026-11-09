<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Administrator extends Authenticatable
{
    use HasApiTokens, Notifiable;

    public function governmentPrograms(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(GovernmentProgram::class, 'admin_id', 'admin_id');
    }

    public function adminRole(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(AdminRole::class, 'admin_role_id');
    }

    /**
     * 'none', 'view' or 'manage'. The legacy full-access 'administrator' role
     * needs no adminRole row (keeps accounts created before roles existed
     * working); everyone else gets what their assigned role grants.
     */
    public function accessLevel(string $module): string
    {
        if ($this->role === 'administrator' && ! $this->admin_role_id) {
            return AdminRole::MANAGE;
        }

        return $this->adminRole?->accessLevel($module) ?? AdminRole::NONE;
    }

    /** Can open the module (view-only or full access). */
    public function hasModule(string $module): bool
    {
        return $this->accessLevel($module) !== AdminRole::NONE;
    }

    /** Can save, change and delete in the module. */
    public function canManageModule(string $module): bool
    {
        return $this->accessLevel($module) === AdminRole::MANAGE;
    }

    /**
     * The office's system administrator (the Special Law Enforcement Officer
     * in PESO Urdaneta's org chart): the only tier that may create, change or
     * deactivate staff accounts and roles.
     */
    public function isSystemAdministrator(): bool
    {
        return $this->role === 'administrator';
    }

    public function temporaryPasswordExpired(): bool
    {
        return $this->must_change_password
            && $this->temporary_password_expires_at !== null
            && $this->temporary_password_expires_at->isPast();
    }

    /**
     * Gives the account a fresh temporary password that must be replaced on
     * next sign-in, and returns it (plain) so it can be emailed once.
     */
    public function issueTemporaryPassword(): string
    {
        $password = \Illuminate\Support\Str::password(12, symbols: false);

        $this->forceFill([
            'password' => $password,
            'must_change_password' => true,
            'temporary_password_expires_at' => now()->addDays(self::TEMPORARY_PASSWORD_DAYS),
        ])->save();

        return $password;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /** Module keys this account can open — sent to the frontend to shape the sidebar. */
    public function grantedModules(): array
    {
        return array_values(array_filter(
            array_keys(AdminRole::MODULES),
            fn (string $module) => $this->hasModule($module)
        ));
    }

    /** {module: 'view'|'manage'} for every module this account can open. */
    public function accessMap(): array
    {
        $map = [];
        foreach ($this->grantedModules() as $module) {
            $map[$module] = $this->accessLevel($module);
        }

        return $map;
    }

    protected $table      = 'administrators';
    protected $primaryKey = 'admin_id';

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'mobile_number',
        'password',
        'role',
        'status',
        'admin_role_id',
        'department',
        'position',
        'middle_name',
        'suffix',
        'employee_no',
        'employment_type',
        'date_started',
        'email_verified_at',
    ];

    /** How long an emailed temporary password stays usable. */
    public const TEMPORARY_PASSWORD_DAYS = 3;

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'date_started'      => 'date',
        'must_change_password'          => 'boolean',
        'temporary_password_expires_at' => 'datetime',
        'invited_at'                    => 'datetime',
        'password_changed_at'           => 'datetime',
        'last_login_at'                 => 'datetime',
        'password'          => 'hashed',
    ];
}
