<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use App\Services\SkillRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SkillRecommendationController
 * Provides skill recommendations and gap analysis
 */
class SkillRecommendationController extends Controller
{
    public function __construct(
        private readonly SkillRecommendationService $recommendations
    ) {}

    /**
     * GET /api/seeker/skill-recommendations   [auth:sanctum]
     * Get personalized skill recommendations
     */
    public function getRecommendations(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user instanceof JobSeeker) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user->load('occupations', 'seekerSkills');

        $recommendations = $this->recommendations->getRecommendations($user, limit: 15);

        return response()->json([
            'data' => $recommendations,
            'message' => 'Skill recommendations generated',
        ]);
    }

    /**
     * POST /api/seeker/skill-gap-analysis   [auth:sanctum]
     * Analyze skill gaps for a specific job
     */
    public function analyzeGaps(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user instanceof JobSeeker) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'required_skills' => ['required', 'array', 'min:1'],
            'required_skills.*' => ['string', 'max:255'],
        ]);

        $user->load('seekerSkills');

        $gaps = $this->recommendations->getSkillGaps($user, $validated['required_skills']);

        return response()->json([
            'data' => $gaps,
            'learning_resources' => collect($gaps['gaps'])
                ->take(3)
                ->mapWithKeys(
                    fn ($skill) => [$skill => $this->recommendations->getLearningResources($skill)]
                )
                ->all(),
        ]);
    }

    /**
     * GET /api/seeker/learning-resources/{skill}   [auth:sanctum]
     * Get learning resources for a specific skill
     */
    public function getLearningResources(Request $request, string $skill): JsonResponse
    {
        if (!$request->user() instanceof JobSeeker) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $resources = $this->recommendations->getLearningResources($skill);

        return response()->json([
            'skill' => $skill,
            'resources' => $resources,
        ]);
    }
}
