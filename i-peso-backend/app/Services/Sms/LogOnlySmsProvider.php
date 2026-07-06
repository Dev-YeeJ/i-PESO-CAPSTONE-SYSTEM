<?php

namespace App\Services\Sms;

class LogOnlySmsProvider implements SmsProviderInterface
{
    public function name(): string
    {
        return 'log_only';
    }

    public function send(SmsMessage $message): SmsSendResult
    {
        return SmsSendResult::make('log_only', $this->name());
    }

    public function getStatus(string $referenceId): SmsSendResult
    {
        return SmsSendResult::make('log_only', $this->name(), $referenceId);
    }
}
