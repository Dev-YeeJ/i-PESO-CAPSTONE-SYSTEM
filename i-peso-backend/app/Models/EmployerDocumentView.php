<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

/**
 * One staff account having opened one employer document. See the
 * create_employer_document_views_table migration for why this is per-account.
 */
class EmployerDocumentView extends Model
{
    protected $table = 'employer_document_views';

    protected $fillable = [
        'document_id',
        'administrator_id',
        'viewed_at',
    ];

    protected $casts = [
        'viewed_at' => 'datetime',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(EmployerDocument::class, 'document_id', 'document_id');
    }

    public function administrator(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'administrator_id', 'admin_id');
    }

    /**
     * Record that $administratorId opened $documentId. Keeps the first view
     * time and is safe against two tabs opening the same file at once (the
     * unique index absorbs the race instead of throwing).
     */
    public static function record(int $documentId, int $administratorId): void
    {
        $now = now();

        DB::table('employer_document_views')->insertOrIgnore([
            'document_id' => $documentId,
            'administrator_id' => $administratorId,
            'viewed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * Per-document view state for the admin review screen, keyed by document_id:
     *   - viewed_by_me_at: when $viewer opened it (null = this account hasn't)
     *   - viewed_by:       the other staff accounts that opened it, for context only
     *
     * @param  iterable<int>  $documentIds
     * @return array<int, array{viewed_by_me_at: ?string, viewed_by: array<int, array{admin_id: int, name: string, viewed_at: ?string}>}>
     */
    public static function summarizeFor(iterable $documentIds, mixed $viewer): array
    {
        $documentIds = collect($documentIds)->filter()->unique()->values();
        $summary = $documentIds->mapWithKeys(fn ($id) => [
            (int) $id => ['viewed_by_me_at' => null, 'viewed_by' => []],
        ])->all();

        if ($documentIds->isEmpty()) {
            return $summary;
        }

        $viewerId = $viewer instanceof Administrator ? (int) $viewer->getKey() : null;

        static::query()
            ->with('administrator:admin_id,first_name,last_name')
            ->whereIn('document_id', $documentIds)
            ->orderBy('viewed_at')
            ->get()
            ->each(function (self $view) use (&$summary, $viewerId) {
                $documentId = (int) $view->document_id;

                if ($viewerId !== null && (int) $view->administrator_id === $viewerId) {
                    $summary[$documentId]['viewed_by_me_at'] = $view->viewed_at?->toISOString();

                    return;
                }

                $summary[$documentId]['viewed_by'][] = [
                    'admin_id' => (int) $view->administrator_id,
                    'name' => trim(($view->administrator?->first_name ?? '').' '.($view->administrator?->last_name ?? '')) ?: 'PESO staff',
                    'viewed_at' => $view->viewed_at?->toISOString(),
                ];
            });

        return $summary;
    }
}
