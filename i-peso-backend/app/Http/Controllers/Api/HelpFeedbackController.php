<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Services\ContentInsightService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * What Help-page readers tell PESO (public, signed in or not): "Was this
 * helpful?" on an FAQ, and searches that found nothing. Feeds Content
 * Modules → Insights. Anonymous by design — see ContentInsightService.
 */
class HelpFeedbackController extends Controller
{
    public function __construct(private readonly ContentInsightService $insights)
    {
    }

    public function vote(Request $request, Faq $faq): JsonResponse
    {
        abort_unless($faq->is_published, 404);
        $helpful = (bool) $request->validate(['helpful' => ['required', 'boolean']])['helpful'];

        $this->insights->recordFeedback($faq, $helpful, $request);

        return response()->json(['message' => $helpful ? 'Thanks — glad it helped.' : 'Thanks — PESO will improve this answer.']);
    }

    public function searchMiss(Request $request): JsonResponse
    {
        $term = $request->validate(['term' => ['required', 'string', 'min:3', 'max:100']])['term'];

        $this->insights->recordSearchMiss($term, $request);

        // Always the same answer, so the endpoint reveals nothing about earlier reports.
        return response()->json(['message' => 'Noted.'], 202);
    }
}
