<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SkillCatalogEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SkillCatalogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['required', 'in:technical,soft'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $search = Str::of((string) ($validated['search'] ?? ''))->squish()->toString();
        $normalizedSearch = Str::of($search)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();

        $skills = SkillCatalogEntry::query()
            ->where('category', $validated['category'])
            ->when($normalizedSearch !== '', fn ($query) => $query->where(function ($query) use ($normalizedSearch) {
                $query->where('normalized_name', 'like', '%'.$normalizedSearch.'%')
                    ->orWhere('search_terms', 'like', '%'.$normalizedSearch.'%')
                    ->orWhereHas(
                        'aliases',
                        fn ($aliases) => $aliases->where(
                            'normalized_alias',
                            'like',
                            '%'.$normalizedSearch.'%'
                        )
                    );
            }))
            ->orderByRaw(
                'CASE
                    WHEN normalized_name = ? THEN 0
                    ELSE 1
                END',
                [$normalizedSearch]
            )
            ->orderByDesc('is_in_demand')
            ->orderByDesc('is_hot')
            ->orderByDesc('occupation_count')
            ->orderByRaw('CASE WHEN normalized_name LIKE ? THEN 0 ELSE 1 END', [$normalizedSearch.'%'])
            ->orderByRaw('CASE WHEN search_terms LIKE ? THEN 0 ELSE 1 END', ['%'.$normalizedSearch.'%'])
            ->orderBy('name')
            ->limit($validated['limit'] ?? 15)
            ->get(['id', 'name', 'category', 'source', 'occupation_count', 'is_hot', 'is_in_demand']);

        return response()->json(['data' => $skills]);
    }
}
