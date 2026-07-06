<?php

namespace App\Services\Sms;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class UniSmsProvider implements SmsProviderInterface
{
    public function name(): string
    {
        return 'unisms';
    }

    public function send(SmsMessage $message): SmsSendResult
    {
        if (! $this->configured()) {
            return SmsSendResult::make('skipped', $this->name(), error: 'UniSMS credentials or sender ID are not configured.');
        }

        try {
            $response = $this->client()->post($this->baseUrl().'/sms', [
                'recipient' => $message->recipient,
                'content' => $message->content,
                'sender_id' => config('services.sms.sender_id'),
                'metadata' => $message->metadata,
            ]);

            if (! $response->successful()) {
                return SmsSendResult::make('failed', $this->name(), error: 'UniSMS rejected the SMS request (HTTP '.$response->status().').');
            }

            $providerMessage = (array) $response->json('message', []);
            $status = $this->mapStatus((string) ($providerMessage['status'] ?? 'pending'));

            return SmsSendResult::make(
                $status,
                $this->name(),
                $providerMessage['reference_id'] ?? null,
                $providerMessage['fail_reason'] ?? null,
            );
        } catch (ConnectionException) {
            return SmsSendResult::make('failed', $this->name(), error: 'Unable to connect to the UniSMS service.');
        } catch (\Throwable) {
            return SmsSendResult::make('failed', $this->name(), error: 'Unexpected UniSMS provider error.');
        }
    }

    public function getStatus(string $referenceId): SmsSendResult
    {
        if (! $this->configured()) {
            return SmsSendResult::make('skipped', $this->name(), $referenceId, 'UniSMS credentials are not configured.');
        }

        try {
            $response = $this->client()->get($this->baseUrl().'/sms/'.rawurlencode($referenceId));
            if (! $response->successful()) {
                return SmsSendResult::make('failed', $this->name(), $referenceId, 'Unable to retrieve UniSMS status (HTTP '.$response->status().').');
            }

            $message = (array) $response->json('message', []);

            return SmsSendResult::make(
                $this->mapStatus((string) ($message['status'] ?? 'pending')),
                $this->name(),
                $message['reference_id'] ?? $referenceId,
                $message['fail_reason'] ?? null,
            );
        } catch (\Throwable) {
            return SmsSendResult::make('failed', $this->name(), $referenceId, 'Unable to retrieve UniSMS status.');
        }
    }

    private function configured(): bool
    {
        return filled(config('services.sms.secret_key')) && filled(config('services.sms.sender_id'));
    }

    private function client(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::acceptJson()
            ->asJson()
            ->withBasicAuth((string) config('services.sms.secret_key'), '')
            ->timeout((int) config('services.sms.timeout', 10));
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.sms.base_url', 'https://unismsapi.com/api'), '/');
    }

    private function mapStatus(string $status): string
    {
        return match ($status) {
            'sent' => 'sent',
            'retrying' => 'retrying',
            'failed' => 'failed',
            default => 'pending',
        };
    }
}
