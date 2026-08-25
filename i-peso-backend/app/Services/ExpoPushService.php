<?php

namespace App\Services;

use App\Models\PushToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    /** Expo caps a single batch request at 100 messages. */
    private const BATCH_SIZE = 100;

    public function sendToNotifiable(object $notifiable, string $title, string $body, array $data = []): void
    {
        if (! method_exists($notifiable, 'pushTokens')) {
            return;
        }

        $tokens = $notifiable->pushTokens()->get(['id', 'token']);
        if ($tokens->isEmpty()) {
            return;
        }

        foreach ($tokens->chunk(self::BATCH_SIZE) as $chunk) {
            $this->sendBatch($chunk, $title, $body, $data);
        }
    }

    private function sendBatch($tokens, string $title, string $body, array $data): void
    {
        $messages = $tokens->map(fn (PushToken $pushToken) => [
            'to' => $pushToken->token,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'sound' => 'default',
            'priority' => 'high',
        ])->values()->all();

        try {
            $tickets = $this->client()->post(self::ENDPOINT, $messages)->throw()->json('data', []);
        } catch (\Throwable $exception) {
            Log::warning('Expo push batch send failed safely.', [
                'token_count' => $tokens->count(),
                'error_type' => class_basename($exception),
            ]);

            return;
        }

        $this->pruneUnregisteredTokens($tokens, (array) $tickets);
    }

    /** A ticket's position in the response matches the request order. */
    private function pruneUnregisteredTokens($tokens, array $tickets): void
    {
        $tokenList = $tokens->values();

        foreach ($tickets as $index => $ticket) {
            $isUnregistered = ($ticket['status'] ?? null) === 'error'
                && ($ticket['details']['error'] ?? null) === 'DeviceNotRegistered';

            if (! $isUnregistered) {
                continue;
            }

            $pushToken = $tokenList->get($index);
            if ($pushToken) {
                $pushToken->delete();
            }
        }
    }

    private function client()
    {
        $headers = ['Accept' => 'application/json', 'Content-Type' => 'application/json'];
        $accessToken = config('services.expo.access_token');

        if (filled($accessToken)) {
            $headers['Authorization'] = "Bearer {$accessToken}";
        }

        return Http::withHeaders($headers)->timeout(10);
    }
}
