<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Occupation;
use App\Services\LocalJobTermDictionary;
use App\Services\VertexAiSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;

class OccupationClassificationController extends Controller
{
    public function __construct(
        private readonly LocalJobTermDictionary $dictionary,
    ) {}

    /**
     * 3-layer classification: catalog → dictionary → AI.
     */
    public function classify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:150'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:8'],
        ]);

        $rawInput = trim($validated['title']);
        $limit = $validated['limit'] ?? 5;

        // ── Layer 0: Invalid / too-vague check via dictionary ──
        $dictResult = $this->dictionary->classify($rawInput);

        if (! $dictResult['is_valid_job_input']) {
            return response()->json([
                'raw_input' => $rawInput,
                'is_valid_job_input' => false,
                'needs_clarification' => false,
                'suggestions' => [],
                'invalid_reason' => $dictResult['invalid_reason'],
            ]);
        }

        $suggestions = [];

        // ── Layer 1: Catalog search ──
        $catalogSuggestions = $this->searchCatalog($rawInput, $limit);
        $suggestions = array_merge($suggestions, $catalogSuggestions);

        // ── Layer 2: Local dictionary ──
        if (! empty($dictResult['suggestions'])) {
            // Merge dictionary results, avoiding duplicates by title
            $existingTitles = collect($suggestions)->pluck('occupation_title')->map(fn ($t) => Str::lower($t))->all();
            foreach ($dictResult['suggestions'] as $dictSuggestion) {
                if (! in_array(Str::lower($dictSuggestion['occupation_title']), $existingTitles, true)) {
                    $suggestions[] = $dictSuggestion;
                }
            }
        }

        // ── Layer 3: AI classification (only if layers 1–2 have < 2 high-confidence results) ──
        $highConfidenceCount = collect($suggestions)->where('confidence', '>=', 75)->count();

        if ($highConfidenceCount < 2) {
            try {
                $aiSuggestions = app(VertexAiSuggestionService::class)->classifyOccupationTitleEnhanced($rawInput, $limit);
                $existingTitles = collect($suggestions)->pluck('occupation_title')->map(fn ($t) => Str::lower($t))->all();

                foreach ($aiSuggestions as $aiSuggestion) {
                    if (! in_array(Str::lower($aiSuggestion['occupation_title']), $existingTitles, true)) {
                        $suggestions[] = $aiSuggestion;
                    }
                }
            } catch (RuntimeException) {
                // AI unavailable — continue with catalog + dictionary results
            }
        }

        // Sort by confidence desc and limit
        usort($suggestions, fn (array $a, array $b) => $b['confidence'] <=> $a['confidence']);
        $suggestions = array_values(array_slice($suggestions, 0, $limit));

        $needsClarification = $dictResult['needs_clarification']
            || (count($suggestions) > 1 && collect($suggestions)->max('confidence') < 80);

        return response()->json([
            'raw_input' => $rawInput,
            'is_valid_job_input' => true,
            'needs_clarification' => $needsClarification,
            'suggestions' => $suggestions,
            'invalid_reason' => null,
        ]);
    }

    private function searchCatalog(string $rawInput, int $limit): array
    {
        $normalizedSearch = Str::of($rawInput)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();

        if (strlen($normalizedSearch) < 2) {
            return [];
        }

        $like = '%'.$rawInput.'%';
        $normalizedLike = '%'.$normalizedSearch.'%';

        $occupations = Occupation::query()
            ->where('is_active', true)
            ->where(function ($nested) use ($like, $normalizedLike) {
                $nested
                    ->where('title', 'like', $like)
                    ->orWhere('search_terms', 'like', $like)
                    ->orWhereHas(
                        'aliases',
                        fn ($aliases) => $aliases->where('normalized_alias', 'like', $normalizedLike)
                    )
                    ->orWhereHas(
                        'generalTerms',
                        fn ($terms) => $terms->where('normalized_term', 'like', $normalizedLike)
                    );
            })
            ->with(['generalTerms' => fn ($terms) => $terms->orderBy('priority')])
            ->orderByRaw(
                'CASE WHEN LOWER(title) = ? THEN 0 WHEN LOWER(title) LIKE ? THEN 1 ELSE 2 END',
                [Str::lower($rawInput), Str::lower($rawInput).'%']
            )
            ->limit($limit)
            ->get(['id', 'psoc_code', 'classification_code', 'isco_group', 'title', 'source']);

        return $occupations->map(function (Occupation $occupation) {
            $generalTerm = $occupation->generalTerms->first();

            return [
                'occupation_title' => $occupation->title,
                'broad_field' => $this->broadFieldLabel($generalTerm?->term, $occupation->isco_group),
                'general_term' => $generalTerm?->normalized_term ?? $generalTerm?->term,
                'role_function' => $this->inferRoleFunction($occupation->title),
                'confidence' => 95,
                'source' => 'catalog',
                'reason' => 'Matched from the standard occupation catalog.',
                'occupation_id' => $occupation->id,
                'psoc_code' => $occupation->psoc_code,
            ];
        })->all();
    }

    private function broadFieldLabel(?string $generalTerm, ?string $iscoGroup): string
    {
        if (filled($generalTerm)) {
            $groups = config('job_preferences.generalized_groups', []);
            foreach ($groups as $group) {
                if (Str::lower($group['term']) === Str::lower($generalTerm)) {
                    return $group['label'];
                }
            }

            return Str::of($generalTerm)->replace(['-', '_'], ' ')->title()->toString();
        }

        $major = Str::of((string) $iscoGroup)->match('/\d/')->toString();

        return match ($major) {
            '0' => 'Armed Forces',
            '1' => 'Management and Business Operations',
            '2' => 'Professional Work',
            '3' => 'Technical Work',
            '4' => 'Office and Administration',
            '5' => 'Service and Sales',
            '6' => 'Agriculture and Farming',
            '7' => 'Skilled Trades and Repair',
            '8' => 'Manufacturing and Factory Work',
            '9' => 'General Labor',
            default => 'Other',
        };
    }

    private function inferRoleFunction(string $title): string
    {
        $lower = Str::lower($title);

        $mappings = [
            'developer' => 'Software Development',
            'programmer' => 'Software Development',
            'engineer' => 'Engineering',
            'teacher' => 'Teaching',
            'nurse' => 'Nursing',
            'driver' => 'Driving / Transportation',
            'cashier' => 'Cashiering',
            'clerk' => 'General Office Support',
            'technician' => 'Technical Support',
            'cook' => 'Cooking / Food Preparation',
            'guard' => 'Security / Protection',
            'accountant' => 'Accounting',
            'welder' => 'Welding',
            'mason' => 'Masonry',
            'electrician' => 'Electrical Work',
            'mechanic' => 'Automotive Repair',
            'caregiver' => 'Caregiving',
            'salesperson' => 'Sales',
            'manager' => 'Management',
            'supervisor' => 'Supervision',
            'assistant' => 'Administrative Support',
        ];

        foreach ($mappings as $keyword => $role) {
            if (Str::contains($lower, $keyword)) {
                return $role;
            }
        }

        return 'General';
    }
}
