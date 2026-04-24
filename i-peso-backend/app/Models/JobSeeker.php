<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class JobSeeker extends Authenticatable
{
    use HasApiTokens;

    protected $table      = 'job_seekers';
    protected $primaryKey = 'seeker_id';

    protected $fillable = [
        'first_name',
        'last_name',
        'mobile_number',
        'email',
        'password',
        'complete_address',
        'educ_attainment',
        'skills',
        'resume_path',
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
        'skills'            => 'array',
    ];
}