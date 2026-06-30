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
