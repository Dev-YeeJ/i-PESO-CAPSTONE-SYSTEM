<?php
// i-peso-backend/app/Http/Controllers/Api/Admin/SystemReports/ActivityController.php

namespace App\Http\Controllers\Api\Admin\SystemReports;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Administrator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();

        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $filters = $request->validate([
            'action' => ['nullable', 'string', 'max:100'],
            'user_type' => ['nullable', 'string', 'max:255'],
            'search' => ['nullable', 'string', 'max:255'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $matching = ActivityLog::query()
            ->forAction($filters['action'] ?? null)
            ->forUserType($filters['user_type'] ?? null)
            ->search($filters['search'] ?? null)
            ->loggedBetween($filters['date_from'] ?? null, $filters['date_to'] ?? null);

        $logs = (clone $matching)
            ->latest('created_at')
            ->latest('log_id') // stable ordering for events logged within the same second
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        ActivityLog::hydrateActorNames($logs->getCollection());

        return response()->json([
            'logs' => $logs,
            'summary' => $this->summary($matching),
            'filters' => [
                'actions' => $this->actionOptions(),
                'user_types' => $this->userTypeOptions(),
            ],
        ]);
    }

    /** Counts for the current filter selection, not the whole table. */
    private function summary(Builder $matching): array
    {
        return [
            'total' => (clone $matching)->count(),
            'today' => (clone $matching)->whereDate('created_at', today())->count(),
            // Counted through a derived table so it stays portable — "count(distinct a, b)"
            // is MySQL-only and breaks the sqlite-backed test suite.
            'actors' => DB::query()
                ->fromSub(
                    (clone $matching)->select('user_type', 'user_id')->distinct()->toBase(),
                    'distinct_actors'
                )
                ->count(),
            'critical' => (clone $matching)
                ->where(function (Builder $query) {
                    foreach (['failed', 'rejected', 'deleted'] as $keyword) {
                        $query->orWhere('action', 'like', "%{$keyword}%");
                    }
                })
                ->count(),
        ];
    }

    /** Distinct actions actually present in the table, for the filter dropdown. */
    private function actionOptions(): array
    {
        return ActivityLog::query()
            ->distinct()
            ->orderBy('action')
            ->pluck('action')
            ->map(fn (string $action) => [
                'value' => $action,
                'label' => Str::of($action)->replace('_', ' ')->title()->toString(),
            ])
            ->all();
    }

    private function userTypeOptions(): array
    {
        $present = ActivityLog::query()->distinct()->pluck('user_type');

        return $present
            ->map(fn (string $type) => [
                'value' => $type,
                'label' => ActivityLog::ACTOR_TYPES[$type] ?? 'Guest',
            ])
            ->sortBy('label')
            ->values()
            ->all();
    }
}
