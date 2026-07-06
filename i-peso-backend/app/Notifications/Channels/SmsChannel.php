<?php

namespace App\Notifications\Channels;

use App\Services\Sms\SmsService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class SmsChannel
{
    public function __construct(private readonly SmsService $sms)
    {
    }

    public function send(object $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toSms')) {
            return;
        }

        try {
            $message = (array) $notification->toSms($notifiable);
            $this->sms->send(
                $notifiable,
                $message['phone_number'] ?? null,
                (string) ($message['content'] ?? ''),
                (string) ($message['purpose'] ?? 'system_notification'),
                (array) ($message['metadata'] ?? []),
            );
        } catch (\Throwable $exception) {
            Log::warning('SMS notification channel failed safely.', [
                'notification' => $notification::class,
                'recipient_type' => $notifiable::class,
                'recipient_id' => method_exists($notifiable, 'getKey') ? $notifiable->getKey() : null,
                'error_type' => class_basename($exception),
            ]);
        }
    }
}
