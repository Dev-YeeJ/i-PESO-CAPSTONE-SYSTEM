<?php

namespace App\Services\Chatbot;

use RuntimeException;

/**
 * Raised when the assistant cannot answer for an infrastructure reason
 * (quota exhausted, upstream down, misconfiguration).
 *
 * Carries a message that is already safe to show a visitor, so the controller
 * never has to decide what is safe to leak from an upstream error body.
 */
class ChatbotUnavailableException extends RuntimeException
{
    public function __construct(
        public readonly string $userMessage,
        public readonly int $status = 503,
        string $internalMessage = '',
    ) {
        parent::__construct($internalMessage ?: $userMessage);
    }

    public static function rateLimited(): self
    {
        return new self(
            userMessage: 'Marami pong gumagamit ngayon. Pakisubukan ulit sa ilang sandali. '
                . '(The assistant is busy right now — please try again in a moment.)',
            status: 429,
            internalMessage: 'Gemini returned 429 (free tier quota exceeded).',
        );
    }

    public static function misconfigured(): self
    {
        return new self(
            userMessage: 'Hindi po available ang assistant ngayon. '
                . '(The assistant is temporarily unavailable.)',
            status: 503,
            internalMessage: 'GEMINI_API_KEY is not set in .env.',
        );
    }

    public static function upstreamFailure(int $status, string $body): self
    {
        return new self(
            userMessage: 'Hindi po ako makasagot ngayon. Pakisubukan ulit mamaya, o bisitahin '
                . 'ang PESO office. (I could not answer just now — please try again later.)',
            status: 503,
            internalMessage: "Gemini HTTP {$status}: " . mb_substr($body, 0, 300),
        );
    }
}
