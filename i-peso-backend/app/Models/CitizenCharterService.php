<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CitizenCharterService extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'service_id';

    protected $fillable = [
        'service_name',
        'description',
        'requirements',
        'processing_time',
        'fees',
        'responsible_office',
        'steps',
        'contact_info',
        'status',
        'display_order',
        'created_by_admin_id',
    ];

    protected $casts = [
        'requirements' => 'array',
        'steps' => 'array',
        'display_order' => 'integer',
    ];

    public function administrator(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'created_by_admin_id', 'admin_id');
    }
}
