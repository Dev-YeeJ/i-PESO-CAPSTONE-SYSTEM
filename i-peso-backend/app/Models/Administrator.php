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
     * True for the legacy full-access 'administrator' role (no adminRole
     * row required — keeps accounts created before roles existed working),
     * or when the assigned AdminRole grants the given module.
     */
    public function hasModule(string $module): bool
    {
        if ($this->role === 'administrator' && ! $this->admin_role_id) {
            return true;
        }

        return (bool) $this->adminRole?->hasModule($module);
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
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
    ];
}
