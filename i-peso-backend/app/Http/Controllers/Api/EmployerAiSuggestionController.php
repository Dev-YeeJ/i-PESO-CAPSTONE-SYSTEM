<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Services\SkillRecommendationService;
use App\Services\VertexAiSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;

class EmployerAiSuggestionController extends Controller
{
    public function suggestJobPosting(
        Request $request,
        VertexAiSuggestionService $suggestions,
        SkillRecommendationService $skillRecommendations,
    ): JsonResponse {
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

        // Deterministic, catalog-grounded floor — resolves the typed job
        // title against the same occupation catalog + skill_occupation_evidence
        // data the seeker side uses, so suggestions are tied to a real
        // occupation and drawn from the same vocabulary seekers pick from,
        // rather than depending entirely on the LLM call below.
        $catalogSkills = $skillRecommendations->suggestSkillsForJobTitle($validated['job_title']);

        try {
            $data = $suggestions->suggestJobPosting(
                $validated['job_title'],
                $validated['vacancy_anchor'] ?? null,
                $validated['additional_context'] ?? null,
                $validated['existing_technical_skills'] ?? [],
                $validated['existing_soft_skills'] ?? [],
            );

            $data['suggested_technical_skills'] = $this->mergeSkillNames($catalogSkills['technical'], $data['suggested_technical_skills'], 10);
            $data['suggested_soft_skills'] = $this->mergeSkillNames($catalogSkills['soft'], $data['suggested_soft_skills'], 6);

            return response()->json(['data' => $data, 'message' => 'Job posting draft generated.']);
        } catch (RuntimeException $exception) {
            report($exception);

            // This same endpoint backs two different callers: the skills
            // step only reads suggested_*_skills, but the "Draft with AI"
            // button (a different wizard step) reads job_summary/
            // responsibilities and writes them straight into the job
            // description field. Returning 200 here would make that second
            // caller silently blank the description instead of showing its
            // existing "AI could not draft a posting" error — so this stays
            // a failure response; catalog_skills rides along on it purely
            // for the skills step to pick up, not as a full success.
            return response()->json([
                'message' => $exception->getMessage(),
                'data' => null,
                'catalog_skills' => $catalogSkills,
            ], 503);
        }
    }

    /** @param string[] $catalogNames @param string[] $aiNames */
    private function mergeSkillNames(array $catalogNames, array $aiNames, int $limit): array
    {
        $seen = [];
        $merged = [];

        foreach ([...$catalogNames, ...$aiNames] as $name) {
            $key = Str::lower(trim($name));
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $merged[] = $name;
        }

        return array_slice($merged, 0, $limit);
    }
}
