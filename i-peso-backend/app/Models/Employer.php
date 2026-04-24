<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Employer extends Authenticatable
{
    use HasApiTokens;

    protected $table      = 'employers';
    protected $primaryKey = 'employer_id';

    protected $fillable = [
        'company_name',
        'representative_name',
        'email',
        'password',
        'mobile_number',
        'complete_address',
        'industry_type',
        'profile_image',
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