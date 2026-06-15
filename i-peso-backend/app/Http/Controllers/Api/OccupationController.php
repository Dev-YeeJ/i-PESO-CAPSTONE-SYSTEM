<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Occupation;
use App\Models\OccupationGeneralTerm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OccupationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'mode' => ['nullable', 'in:catalog,general'],
        ]);

        $search = trim($validated['search'] ?? '');
        $normalizedSearch = Str::of($search)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
        $isExactGeneralTerm = $normalizedSearch !== ''
            && OccupationGeneralTerm::query()
                ->where('normalized_term', $normalizedSearch)
                ->exists();
        $limit = $validated['limit'] ?? 20;

        if (($validated['mode'] ?? 'catalog') === 'general') {
            return response()->json([
                'data' => $this->generalizedGroups($search, $normalizedSearch, $limit),
            ]);
        }

        $occupations = Occupation::query()
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search, $normalizedSearch, $isExactGeneralTerm) {
                $like = '%'.$search.'%';
                $normalizedLike = '%'.$normalizedSearch.'%';

                if ($isExactGeneralTerm) {
                    $query->whereHas(
                        'generalTerms',
                        fn ($terms) => $terms->where('normalized_term', $normalizedSearch)
                    );
                } else {
                    $query->where(function ($nested) use ($like, $normalizedLike) {
                        $nested
                            ->where('title', 'like', $like)
                            ->orWhere('psoc_code', 'like', $like)
                            ->orWhere('classification_code', 'like', $like)
                            ->orWhere('isco_group', 'like', $like)
                            ->orWhere('search_terms', 'like', $like)
                            ->orWhereHas(
                                'aliases',
                                fn ($aliases) => $aliases->where('normalized_alias', 'like', $normalizedLike)
                            )
                            ->orWhereHas(
                                'generalTerms',
                                fn ($terms) => $terms->where('normalized_term', 'like', $normalizedLike)
                            )
                            ->orWhereHas(
                                'sourceMappings',
                                fn ($mappings) => $mappings->where('external_code', 'like', $like)
                            );
                    });
                    $query->with(['aliases' => fn ($aliases) => $aliases
                        ->where('normalized_alias', 'like', $normalizedLike)
                        ->orderByDesc('confidence')]);
                }

                $query->with(['generalTerms' => fn ($terms) => $terms
                    ->where(
                        'normalized_term',
                        $isExactGeneralTerm ? '=' : 'like',
                        $isExactGeneralTerm ? $normalizedSearch : $normalizedLike
                    )
                    ->orderBy('priority')]);
            })
            ->with(['sourceMappings' => fn ($mappings) => $mappings
                ->whereIn('source', ['onet'])
                ->orderBy('source')
                ->orderBy('external_code')])
            ->orderByRaw(
                'CASE
                    WHEN LOWER(title) = ? THEN 0
                    WHEN LOWER(title) LIKE ? THEN 1
                    WHEN EXISTS (
                        SELECT 1 FROM occupation_aliases
                        WHERE occupation_aliases.occupation_id = occupations.id
                        AND occupation_aliases.normalized_alias = ?
                    ) THEN 2
                    WHEN EXISTS (
                        SELECT 1 FROM occupation_general_terms
                        WHERE occupation_general_terms.occupation_id = occupations.id
                        AND occupation_general_terms.normalized_term = ?
                    ) THEN 3
                    ELSE 4
                END',
                [Str::lower($search), Str::lower($search).'%', $normalizedSearch, $normalizedSearch]
            )
            ->orderByRaw(
                "CASE source
                    WHEN 'psa' THEN 0
                    WHEN 'esco' THEN 1
                    WHEN 'fallback' THEN 3
                    ELSE 2
                END"
            )
            ->orderByRaw(
                'COALESCE((
                    SELECT MIN(priority) FROM occupation_general_terms
                    WHERE occupation_general_terms.occupation_id = occupations.id
                    AND occupation_general_terms.normalized_term LIKE ?
                ), 999)',
                ['%'.$normalizedSearch.'%']
            )
            ->orderBy('title')
            ->limit($limit)
            ->get([
                'id',
                'psoc_code',
                'classification_code',
                'isco_group',
                'title',
                'source',
            ])
            ->map(function (Occupation $occupation) {
                $matchedAliasRecord = $occupation->relationLoaded('aliases')
                    ? $occupation->aliases->first()
                    : null;
                $matchedAlias = $matchedAliasRecord?->alias;
                $matchedGeneralTerm = $occupation->relationLoaded('generalTerms')
                    ? $occupation->generalTerms->first()?->term
                    : null;
                if ($matchedGeneralTerm) {
                    $matchedAlias = null;
                }

                return [
                    'id' => $occupation->id,
                    'psoc_code' => $occupation->psoc_code,
                    'code' => $occupation->classification_code ?: $occupation->psoc_code,
                    'isco_group' => $occupation->isco_group,
                    'title' => $occupation->title,
                    'source' => $occupation->source,
                    'sources' => $this->occupationSources($occupation, $matchedAliasRecord?->source),
                    'source_codes' => [
                        'psoc' => $occupation->source === 'psa' ? $occupation->psoc_code : null,
                        'esco' => $occupation->source === 'esco'
                            ? ($occupation->classification_code ?: $occupation->psoc_code)
                            : null,
                        'onet' => $occupation->sourceMappings
                            ->where('source', 'onet')
                            ->pluck('external_code')
                            ->values()
                            ->all(),
                    ],
                    'matched_alias' => $matchedAlias,
                    'matched_alias_source' => $matchedAliasRecord?->source,
                    'matched_general_term' => $matchedGeneralTerm,
                    'match_type' => $matchedGeneralTerm
                        ? 'generalized'
                        : ($matchedAlias ? 'alias' : 'catalog'),
                ];
            });

        return response()->json(['data' => $occupations]);
    }

    private function occupationSources(Occupation $occupation, ?string $aliasSource): array
    {
        $hasOnet = Str::startsWith((string) $aliasSource, 'onet_')
            || $occupation->sourceMappings->contains('source', 'onet');

        return collect([
            $occupation->source === 'psa' ? 'PSOC' : null,
            $hasOnet ? 'O*NET' : null,
            $occupation->source === 'esco' ? 'ESCO' : null,
            $occupation->source === 'fallback' ? 'Local PESO' : null,
        ])->filter()->values()->all();
    }

    private function normalize(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }

    private function generalizedGroups(string $search, string $normalizedSearch, int $limit)
    {
        $groups = collect(config('job_preferences.generalized_groups', []))
            ->map(function (array $group, int $index) {
                $group['normalized_term'] = $this->normalize($group['term']);
                $group['index'] = $index;

                return $group;
            });

        if ($normalizedSearch === '') {
            return $groups
                ->take($limit)
                ->map(fn (array $group) => $this->generalizedGroupResponse($group))
                ->values();
        }

        $matches = collect();

        foreach ($groups as $group) {
            $score = $this->groupMatchScore($group, $normalizedSearch);
            if ($score > 0) {
                $matches->put($group['normalized_term'], [
                    'group' => $group,
                    'score' => $score,
                    'matched_job_title' => null,
                    'match_type' => 'generalized_group',
                ]);
            }
        }

        $like = '%'.$search.'%';
        $normalizedLike = '%'.$normalizedSearch.'%';
        $occupations = Occupation::query()
            ->where('is_active', true)
            ->where(function ($query) use ($like, $normalizedLike) {
                $query
                    ->where('title', 'like', $like)
                    ->orWhere('search_terms', 'like', $like)
                    ->orWhereHas(
                        'aliases',
                        fn ($aliases) => $aliases->where('normalized_alias', 'like', $normalizedLike)
                    );
            })
            ->with([
                'aliases' => fn ($aliases) => $aliases
                    ->where('normalized_alias', 'like', $normalizedLike)
                    ->orderByDesc('confidence'),
                'generalTerms' => fn ($terms) => $terms->orderBy('priority'),
            ])
            ->orderByRaw(
                'CASE
                    WHEN LOWER(title) = ? THEN 0
                    WHEN EXISTS (
                        SELECT 1 FROM occupation_aliases
                        WHERE occupation_aliases.occupation_id = occupations.id
                        AND occupation_aliases.normalized_alias = ?
                    ) THEN 1
                    WHEN LOWER(title) LIKE ? THEN 2
                    ELSE 3
                END',
                [Str::lower($search), $normalizedSearch, Str::lower($search).'%']
            )
            ->limit(15)
            ->get(['id', 'title', 'search_terms']);

        foreach ($occupations as $occupationIndex => $occupation) {
            $matchedAlias = $occupation->aliases->first()?->alias;
            $occupationText = $this->normalize(implode(' ', array_filter([
                $occupation->title,
                $occupation->search_terms,
                $matchedAlias,
            ])));

            foreach ($occupation->generalTerms as $term) {
                $group = $groups->firstWhere('normalized_term', $term->normalized_term);
                if ($group) {
                    $this->addGeneralizedMatch(
                        $matches,
                        $group,
                        3000 - ($occupationIndex * 10) - $term->priority,
                        $occupation->title,
                        'specific_job'
                    );
                }
            }

            foreach ($groups as $group) {
                $patternScore = $this->occupationPatternScore($group, $occupationText);
                if ($patternScore > 0) {
                    $this->addGeneralizedMatch(
                        $matches,
                        $group,
                        2000 - ($occupationIndex * 10) + $patternScore,
                        $occupation->title,
                        'specific_job'
                    );
                }
            }
        }

        return $matches
            ->sortByDesc('score')
            ->take($limit)
            ->map(fn (array $match) => $this->generalizedGroupResponse(
                $match['group'],
                $match['matched_job_title'],
                $match['match_type']
            ))
            ->values();
    }

    private function groupMatchScore(array $group, string $normalizedSearch): int
    {
        $label = $this->normalize($group['label']);
        $haystack = $this->normalize(
            $group['label'].' '.$group['term'].' '.($group['keywords'] ?? '').' '.str_replace('|', ' ', $group['patterns'] ?? '')
        );

        if ($normalizedSearch === $group['normalized_term'] || $normalizedSearch === $label) {
            return 1500;
        }

        if (Str::contains($haystack, $normalizedSearch)) {
            return 1200;
        }

        $tokens = collect(explode(' ', $normalizedSearch))
            ->filter(fn (string $token) => strlen($token) >= 3);
        $matchedTokens = $tokens->filter(
            fn (string $token) => preg_match('/\b'.preg_quote($token, '/').'\b/', $haystack) === 1
        )->count();

        return $matchedTokens > 0 ? 900 + ($matchedTokens * 10) : 0;
    }

    private function occupationPatternScore(array $group, string $occupationText): int
    {
        $patterns = collect(explode('|', (string) ($group['patterns'] ?? '')))
            ->map(fn (string $pattern) => $this->normalize($pattern))
            ->filter();

        $bestLength = $patterns
            ->filter(fn (string $pattern) => preg_match('/\b'.preg_quote($pattern, '/').'\b/', $occupationText) === 1)
            ->map(fn (string $pattern) => strlen($pattern))
            ->max();

        return $bestLength ? min(200, $bestLength) : 0;
    }

    private function addGeneralizedMatch(
        $matches,
        array $group,
        int $score,
        string $matchedJobTitle,
        string $matchType
    ): void {
        $existing = $matches->get($group['normalized_term']);
        if (! $existing || $score > $existing['score']) {
            $matches->put($group['normalized_term'], [
                'group' => $group,
                'score' => $score,
                'matched_job_title' => $matchedJobTitle,
                'match_type' => $matchType,
            ]);
        }
    }

    private function generalizedGroupResponse(
        array $group,
        ?string $matchedJobTitle = null,
        string $matchType = 'generalized_group'
    ): array {
        return [
            'id' => 'general:'.$group['normalized_term'],
            'title' => $group['label'],
            'general_term' => $group['normalized_term'],
            'source' => 'generalized',
            'is_general' => true,
            'matched_job_title' => $matchedJobTitle,
            'match_type' => $matchType,
        ];
    }
}
