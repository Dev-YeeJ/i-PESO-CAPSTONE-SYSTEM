<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Services\VertexAiSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class EmployerAiSuggestionController extends Controller
{
    public function suggestJobPosting(Request $request, VertexAiSuggestionService $suggestions): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof Employer) {
            return response()->json(['message' => 'Employer account required.'], 403);
        }

        $validated = $request->validate([
            'job_title' => ['required', 'string', 'min:2', 'max:150'],
            'vacancy_anchor' => ['nullable', 'string', 'max:150'],
            'additional_context' => ['nullable', 'string', 'max:1000'],
            'existing_technical_skills' => ['nullable', 'array', 'max:20'],
            'existing_technical_skills.*' => ['string', 'max:100'],
            'existing_soft_skills' => ['nullable', 'array', 'max:20'],
            'existing_soft_skills.*' => ['string', 'max:100'],
        ]);

        try {
            return response()->json([
                'data' => $suggestions->suggestJobPosting(
                    $validated['job_title'],
                    $validated['vacancy_anchor'] ?? null,
                    $validated['additional_context'] ?? null,
                    $validated['existing_technical_skills'] ?? [],
                    $validated['existing_soft_skills'] ?? [],
                ),
                'message' => 'Job posting draft generated.',
            ]);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
                'data' => null,
            ], 503);
        }
    }
}
