<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Occupation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OccupationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $search = trim($validated['search'] ?? '');
        $limit = $validated['limit'] ?? 20;

        $occupations = Occupation::query()
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';
                $query->where(function ($nested) use ($like) {
                    $nested
                        ->where('title', 'like', $like)
                        ->orWhere('psoc_code', 'like', $like)
                        ->orWhere('search_terms', 'like', $like);
                });
            })
            ->orderByRaw('CASE WHEN title LIKE ? THEN 0 ELSE 1 END', [$search.'%'])
            ->orderBy('title')
            ->limit($limit)
            ->get(['id', 'psoc_code', 'title']);

        return response()->json(['data' => $occupations]);
    }
}
