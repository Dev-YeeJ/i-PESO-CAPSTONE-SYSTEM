<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsNotification extends Model
{
    protected $primaryKey = 'notification_id';

    protected $fillable = [
        'recipient_type',
        'recipient_id',
        'phone_number',
        'normalized_phone_number',
        'message_type',
        'purpose',
        'content',
        'status',
        'gateway_status',
        'provider',
        'provider_message_id',
        'provider_reference_id',
        'provider_error',
        'error_message',
        'metadata',
        'sent_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'sent_at' => 'datetime',
    ];
}
