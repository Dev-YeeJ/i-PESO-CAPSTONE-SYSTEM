<?php

namespace App\Notifications\Channels;

use App\Services\ExpoPushService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class ExpoPushChannel
{
    public function __construct(private readonly ExpoPushService $push)
    {
    }

    public function send(object $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toExpoPush')) {
            return;
        }

        try {
            $message = (array) $notification->toExpoPush($notifiable);
            $this->push->sendToNotifiable(
                $notifiable,
                (string) ($message['title'] ?? 'i-PESO'),
                (string) ($message['body'] ?? ''),
                (array) ($message['data'] ?? []),
            );
        } catch (\Throwable $exception) {
            Log::warning('Expo push notification channel failed safely.', [
                'notification' => $notification::class,
                'recipient_type' => $notifiable::class,
                'recipient_id' => method_exists($notifiable, 'getKey') ? $notifiable->getKey() : null,
                'error_type' => class_basename($exception),
            ]);
        }
    }
}
