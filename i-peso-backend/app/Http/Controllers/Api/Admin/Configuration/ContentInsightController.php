<?php

namespace App\Http\Controllers\Api\Admin\Configuration;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Services\ContentAiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

/**
 * Content Modules → the AI writing helper used by the FAQ editor (draft an
 * answer, simplify, translate). Needs Configuration access.
 */
class ContentInsightController extends Controller
{
    public function assist(Request $request, ContentAiService $ai): JsonResponse
    {
        $data = $request->validate([
            'task' => ['required', Rule::in(ContentAiService::TASKS)],
            'question' => ['required_if:task,draft_answer', 'nullable', 'string', 'max:200'],
            'audience' => ['nullable', Rule::in(['everyone', 'seekers', 'employers'])],
            'text' => ['required_unless:task,draft_answer', 'nullable', 'string', 'max:8000'],
        ]);

        try {
            return response()->json($ai->assist($data['task'], $data));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 503);
        }
    }

    private function admin(Request $request): Administrator
    {
        $admin = $request->user();
        abort_unless($admin instanceof Administrator, 403, 'Administrator account required.');

        return $admin;
    }
}
