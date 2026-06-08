<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $primaryKey = 'log_id';

    protected $fillable = [
        'user_type',
        'user_id',
        'action',
        'description',
        'ip_address',
    ];
}
