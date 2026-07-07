<?php

namespace App\Notifications\Channels;

use App\Services\Sms\LogOnlySmsProvider;
use App\Services\Sms\PhoneNumberNormalizer;
use App\Services\Sms\SmsService;
use Illuminate\Notifications\Notification;

class JobFairLogOnlySmsChannel
{
    public function __construct(private readonly PhoneNumberNormalizer $normalizer) {}

    public function send(object $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toSms')) return;
        $message = (array) $notification->toSms($notifiable);
        (new SmsService(new LogOnlySmsProvider(), $this->normalizer))->send(
            $notifiable,
            $message['phone_number'] ?? null,
            (string) ($message['content'] ?? ''),
            (string) ($message['purpose'] ?? 'job_fair_notification'),
            (array) ($message['metadata'] ?? []),
        );
    }
}
