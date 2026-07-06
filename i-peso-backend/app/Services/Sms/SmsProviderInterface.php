<?php

namespace App\Services\Sms;

interface SmsProviderInterface
{
    public function name(): string;

    public function send(SmsMessage $message): SmsSendResult;

    public function getStatus(string $referenceId): SmsSendResult;
}
