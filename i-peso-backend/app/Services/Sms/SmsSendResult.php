<?php

namespace App\Services\Sms;

readonly class SmsSendResult
{
    public const ALLOWED_STATUSES = ['pending', 'sent', 'failed', 'skipped', 'log_only', 'retrying'];

    public function __construct(
        public string $status,
        public string $provider,
        public ?string $referenceId = null,
        public ?string $error = null,
        public array $metadata = [],
    ) {
    }

    public static function make(string $status, string $provider, ?string $referenceId = null, ?string $error = null, array $metadata = []): self
    {
        return new self(
            in_array($status, self::ALLOWED_STATUSES, true) ? $status : 'failed',
            $provider,
            $referenceId,
            $error,
            $metadata,
        );
    }
}
