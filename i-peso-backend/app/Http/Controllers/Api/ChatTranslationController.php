<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Chatbot\ChatbotUnavailableException;
use App\Services\Chatbot\ChatTranslationService;
use App\Services\SystemSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * POST /api/chat/translate — the "Translate" button under ACE's replies.
 *
 * Public like the chat itself (visitors use ACE before they have an
 * account), so it carries the same guards: the System Settings switch, a
 * route throttle, and a length cap that keeps it from being a free
 * general-purpose translation proxy.
 */
class ChatTranslationController extends Controller
{
    public function __invoke(Request $request, ChatTranslationService $translator, SystemSettings $settings): JsonResponse
    {
        if (! $settings->bool('chatbot.enabled')) {
            return response()->json([
                'message' => 'The assistant is switched off right now.',
                'assistant_disabled' => true,
            ], 503);
        }

        $data = $request->validate([
            'text' => ['required', 'string', 'max:2000'],
            'language' => ['required', Rule::in(array_keys(ChatTranslationService::LANGUAGES))],
        ]);

        try {
            return response()->json([
                'translation' => $translator->translate($data['text'], $data['language']),
                'language' => $data['language'],
            ]);
        } catch (ChatbotUnavailableException $exception) {
            return response()->json([
                'message' => $exception->userMessage,
                'retryable' => $exception->status === 429,
            ], $exception->status);
        }
    }
}
