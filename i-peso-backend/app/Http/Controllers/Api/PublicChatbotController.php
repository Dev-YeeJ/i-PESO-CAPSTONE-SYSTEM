<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Chatbot\ChatbotUnavailableException;
use App\Services\Chatbot\GeminiChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public assistant endpoint — landing page, login, and registration screens.
 *
 * Unauthenticated by design: a visitor deciding whether to sign up has no
 * account yet. That also makes this the most exposed route in the API, so the
 * limits below are load-bearing rather than defensive habit:
 *
 *  - `throttle` on the route caps how fast one IP can burn the Gemini quota.
 *  - The validation caps stop a caller from stuffing a huge conversation into
 *    the payload and using i-PESO as a free Gemini proxy.
 */
class PublicChatbotController extends Controller
{
    /** Visitor turns retained for context. Enough to follow up, cheap to send. */
    private const MAX_HISTORY_TURNS = 12;

    public function __invoke(Request $request, GeminiChatService $chat): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:500'],
            'history' => ['sometimes', 'array', 'max:' . self::MAX_HISTORY_TURNS],
            'history.*.role' => ['required', 'string', 'in:user,model'],
            'history.*.text' => ['required', 'string', 'max:2000'],
        ]);

        $history = $data['history'] ?? [];
        $history[] = ['role' => 'user', 'text' => $data['message']];

        try {
            return response()->json([
                'reply' => $chat->reply($history),
            ]);
        } catch (ChatbotUnavailableException $exception) {
            // The exception already carries a visitor-safe message; the
            // internal detail stays in the log, never in the response.
            return response()->json([
                'reply' => $exception->userMessage,
                'retryable' => $exception->status === 429,
            ], $exception->status);
        }
    }
}
