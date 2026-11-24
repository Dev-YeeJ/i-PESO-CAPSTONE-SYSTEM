<?php

namespace App\Services;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * What is left of Content Modules' "insights" side.
 *
 * The Health check and Assistant insights modules were removed on 2026-11-25,
 * and the assistant no longer records questions it could not answer. Rows
 * already stored in chatbot_gaps (and help_search_misses, from the old Help
 * page) are aged out by prune(), run from site-content:prune-history, so
 * nothing older than RETENTION_DAYS is kept.
 */
class ContentInsightService
{
    public const RETENTION_DAYS = 90;

    public function prune(): int
    {
        $cutoff = now()->subDays(self::RETENTION_DAYS);

        try {
            return DB::table('help_search_misses')->where('created_at', '<', $cutoff)->delete()
                + DB::table('chatbot_gaps')->where('created_at', '<', $cutoff)->delete();
        } catch (QueryException) {
            return 0;
        }
    }
}
