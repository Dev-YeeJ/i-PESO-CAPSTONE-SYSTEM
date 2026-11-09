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
use App\Services\ActivityLogger;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();

        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $filters = $this->filters($request);
        $matching = $this->matching($filters);

        $logs = (clone $matching)
            ->latest('created_at')
            ->latest('log_id') // stable ordering for events logged within the same second
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        ActivityLog::hydrateActorNames($logs->getCollection());

        return response()->json([
            'actor' => $this->actorFilterLabel($filters),
            'logs' => $logs,
            'summary' => $this->summary($matching),
            'filters' => [
                'actions' => $this->actionOptions(),
                'user_types' => $this->userTypeOptions(),
            ],
        ]);
    }

    private const EXPORT_LIMIT = 20000;

    /**
     * Every event matching the filters as a CSV file (not just the page on
     * screen), capped so a careless export can't exhaust the server.
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);
        $matching = $this->matching($filters);
        $total = (clone $matching)->count();

        ActivityLogger::log('exported_activity_log', sprintf(
            'Exported %s activity log %s%s.',
            number_format(min($total, self::EXPORT_LIMIT)),
            $total === 1 ? 'entry' : 'entries',
            $this->describeFilters($filters)
        ));

        $filename = 'activity-log-'.now()->timezone('Asia/Manila')->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($matching) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // so Excel opens it as UTF-8
            fputcsv($out, ['Date and time (PH)', 'User type', 'Name', 'Position / role', 'Action', 'Description', 'IP address']);

            (clone $matching)
                ->latest('created_at')
                ->latest('log_id')
                ->limit(self::EXPORT_LIMIT)
                ->get()
                ->chunk(500)
                ->each(function ($logs) use ($out) {
                    ActivityLog::hydrateActorNames($logs);
                    foreach ($logs as $log) {
                        fputcsv($out, [
                            $log->created_at?->timezone('Asia/Manila')->format('Y-m-d h:i:s A'),
                            $log->user_type_label,
                            $log->actor_name,
                            $log->actor_role,
                            Str::of($log->action)->replace('_', ' ')->title()->toString(),
                            $log->description,
                            $log->ip_address,
                        ]);
                    }
                });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function filters(Request $request): array
    {
        return $request->validate([
            'action' => ['nullable', 'string', 'max:100'],
            'user_type' => ['nullable', 'string', 'max:255'],
            'user_id' => ['nullable', 'integer', 'min:1'],
            'search' => ['nullable', 'string', 'max:255'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);
    }

    private function matching(array $filters): Builder
    {
        return ActivityLog::query()
            ->forAction($filters['action'] ?? null)
            ->forUserType($filters['user_type'] ?? null)
            ->when(
                isset($filters['user_id'], $filters['user_type']),
                fn (Builder $query) => $query->where('user_id', $filters['user_id'])
            )
            ->search($filters['search'] ?? null)
            ->loggedBetween($filters['date_from'] ?? null, $filters['date_to'] ?? null);
    }

    /** "Showing activity for Maria Santos" when the list is narrowed to one person. */
    private function actorFilterLabel(array $filters): ?array
    {
        if (! isset($filters['user_id'], $filters['user_type'])) {
            return null;
        }

        $log = new ActivityLog([
            'user_type' => ActivityLog::resolveUserType($filters['user_type']),
            'user_id' => $filters['user_id'],
        ]);
        ActivityLog::hydrateActorNames(collect([$log]));

        return ['name' => $log->actor_name, 'role' => $log->actor_role, 'type' => $log->user_type_label];
    }

    private function describeFilters(array $filters): string
    {
        $parts = [];
        if ($actor = $this->actorFilterLabel($filters)) {
            $parts[] = "for {$actor['name']}";
        }
        if (! empty($filters['action'])) {
            $parts[] = 'action "'.$filters['action'].'"';
        }
        if (! empty($filters['date_from']) || ! empty($filters['date_to'])) {
            $parts[] = 'from '.($filters['date_from'] ?? 'the start').' to '.($filters['date_to'] ?? 'today');
        }

        return $parts === [] ? '' : ' ('.implode(', ', $parts).')';
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
