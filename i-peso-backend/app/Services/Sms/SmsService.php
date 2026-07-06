<?php

namespace App\Services\Sms;

use App\Models\SmsNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class SmsService
{
    public function __construct(
        private readonly SmsProviderInterface $provider,
        private readonly PhoneNumberNormalizer $normalizer,
    ) {
    }

    public function send(
        object $recipient,
        ?string $phoneNumber,
        string $content,
        string $purpose,
        array $metadata = [],
    ): SmsSendResult {
        $content = SmsMessageTemplates::limit($content);
        $normalized = $this->normalizer->normalize($phoneNumber);
        $providerName = $this->provider->name();
        $recipientType = $recipient::class;
        $recipientId = method_exists($recipient, 'getKey') ? $recipient->getKey() : null;
        $safeMetadata = [
            ...$metadata,
            'source' => 'i-peso',
            'purpose' => $purpose,
            'recipient_type' => class_basename($recipientType),
            'recipient_id' => $recipientId,
        ];

        $record = $this->createRecord([
            'recipient_type' => $recipientType,
            'recipient_id' => $recipientId ?? 0,
            'phone_number' => (string) ($phoneNumber ?? ''),
            'normalized_phone_number' => $normalized,
            'message_type' => $purpose,
            'purpose' => $purpose,
            'content' => $content,
            'status' => 'pending',
            'gateway_status' => 'pending',
            'provider' => $providerName,
            'metadata' => $safeMetadata,
        ]);

        if ($providerName === 'unisms' && ! $record) {
            return $this->finish(null, SmsSendResult::make(
                'skipped',
                $providerName,
                error: 'SMS audit storage is unavailable; live sending was skipped.',
            ));
        }

        if (! filled($phoneNumber)) {
            return $this->finish($record, SmsSendResult::make('skipped', $providerName, error: 'Recipient has no phone number.'));
        }

        if (! $normalized) {
            return $this->finish($record, SmsSendResult::make('skipped', $providerName, error: 'Recipient phone number is invalid.'));
        }

        try {
            return $this->finish(
                $record,
                $this->provider->send(new SmsMessage($normalized, $content, $purpose, $safeMetadata)),
            );
        } catch (\Throwable) {
            return $this->finish($record, SmsSendResult::make('failed', $providerName, error: 'SMS provider processing failed safely.'));
        }
    }

    private function createRecord(array $attributes): ?SmsNotification
    {
        if (! Schema::hasTable('sms_notifications')) {
            return null;
        }

        try {
            return SmsNotification::create($attributes);
        } catch (\Throwable $exception) {
            Log::warning('SMS audit record could not be created.', [
                'provider' => $attributes['provider'],
                'purpose' => $attributes['purpose'],
                'error_type' => class_basename($exception),
            ]);

            return null;
        }
    }

    private function finish(?SmsNotification $record, SmsSendResult $result): SmsSendResult
    {
        if ($record) {
            try {
                $record->update([
                    'status' => $this->legacyStatus($result->status),
                    'gateway_status' => $result->status,
                    'provider' => $result->provider,
                    'provider_message_id' => $result->referenceId,
                    'provider_reference_id' => $result->referenceId,
                    'provider_error' => $result->error,
                    'error_message' => $result->error,
                    'sent_at' => $result->status === 'sent' ? now() : null,
                ]);
            } catch (\Throwable $exception) {
                Log::warning('SMS audit record could not be updated.', [
                    'sms_notification_id' => $record->getKey(),
                    'gateway_status' => $result->status,
                    'error_type' => class_basename($exception),
                ]);
            }
        }

        Log::info('SMS gateway processed a message.', [
            'sms_notification_id' => $record?->getKey(),
            'provider' => $result->provider,
            'gateway_status' => $result->status,
            'purpose' => $record?->purpose,
            'recipient' => $this->normalizer->mask($record?->normalized_phone_number),
        ]);

        return $result;
    }

    private function legacyStatus(string $gatewayStatus): string
    {
        return match ($gatewayStatus) {
            'sent' => 'sent',
            'failed' => 'failed',
            default => 'pending',
        };
    }
}
