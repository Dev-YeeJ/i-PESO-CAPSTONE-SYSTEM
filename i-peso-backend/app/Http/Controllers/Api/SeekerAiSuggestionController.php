<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use App\Services\VertexAiSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class SeekerAiSuggestionController extends Controller
{
    public function classifyOccupation(Request $request, VertexAiSuggestionService $suggestions): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof JobSeeker) {
            return response()->json(['message' => 'Job seeker account required.'], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:150'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:5'],
        ]);

        try {
            return response()->json([
                'data' => $suggestions->classifyOccupationTitle(
                    $validated['title'],
                    $validated['limit'] ?? 5,
                ),
                'message' => 'Occupation broad fields generated.',
            ]);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
                'data' => [],
            ], 503);
        }
    }

    public function suggest(Request $request, VertexAiSuggestionService $suggestions): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof JobSeeker) {
            return response()->json(['message' => 'Job seeker account required.'], 403);
        }

        $validated = $request->validate([
            'context' => ['nullable', 'array'],
            'context.employment_status' => ['nullable', 'string', 'max:100'],
            'context.target_job_description' => ['nullable', 'string', 'max:300'],
            'context.work_type_preference' => ['nullable', 'string', 'max:100'],
            'context.educ_attainment' => ['nullable', 'string', 'max:100'],
            'context.preferred_occupations' => ['nullable', 'array', 'max:3'],
            'context.preferred_occupations.*.title' => ['nullable', 'string', 'max:150'],
            'context.preferred_occupations.*.general_term' => ['nullable', 'string', 'max:150'],
            'context.technical_skills' => ['nullable', 'array', 'max:20'],
            'context.technical_skills.*' => ['string', 'max:100'],
            'context.soft_skills' => ['nullable', 'array', 'max:20'],
            'context.soft_skills.*' => ['string', 'max:100'],
            'context.trainings' => ['nullable', 'array', 'max:10'],
            'context.trainings.*.course' => ['nullable', 'string', 'max:150'],
            'context.trainings.*.skills_acquired' => ['nullable', 'string', 'max:255'],
            'context.work_experiences' => ['nullable', 'array', 'max:10'],
            'context.work_experiences.*.position' => ['nullable', 'string', 'max:150'],
            'context.work_experiences.*.employment_status' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            return response()->json([
                'data' => $suggestions->suggest($user, $validated['context'] ?? []),
                'message' => 'AI suggestions generated.',
            ]);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
                'data' => [
                    'occupations' => [],
                    'technical_skills' => [],
                    'soft_skills' => [],
                ],
            ], 503);
        }
    }

    public function professionalSummary(Request $request, VertexAiSuggestionService $suggestions): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof JobSeeker) {
            return response()->json(['message' => 'Job seeker account required.'], 403);
        }

        $validated = $request->validate([
            'existing_summary' => ['nullable', 'string', 'max:1200'],
        ]);

        try {
            return response()->json([
                'data' => $suggestions->generateProfessionalSummary($user, $validated['existing_summary'] ?? null),
                'message' => 'Professional summary generated from your verified profile.',
            ]);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
                'data' => null,
            ], 503);
        }
    }

    public function parseMapQuery(Request $request, VertexAiSuggestionService $suggestions): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof JobSeeker) {
            return response()->json(['message' => 'Job seeker account required.'], 403);
        }

        $validated = $request->validate([
            'query' => ['required', 'string', 'max:200'],
        ]);

        try {
            return response()->json([
                'data' => $suggestions->parseMapQuery($validated['query']),
                'message' => 'Map query parsed.',
            ]);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
                'data' => [],
            ], 503);
        }
    }
}
