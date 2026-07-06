<?php

namespace App\Services\Sms;

readonly class SmsMessage
{
    public function __construct(
        public string $recipient,
        public string $content,
        public string $purpose,
        public array $metadata = [],
    ) {
    }
}
