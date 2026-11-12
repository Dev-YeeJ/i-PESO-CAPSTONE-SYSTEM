<?php

namespace App\Console\Commands;

use App\Services\ContentInsightService;
use App\Services\SiteContentService;
use Illuminate\Console\Command;

/** Keeps the newest 20 saved versions of each section and FAQ, and drops reader insights after 90 days. */
class PruneSiteContentHistory extends Command
{
    protected $signature = 'site-content:prune-history';

    protected $description = 'Remove Content Modules history beyond the newest 20 versions, and reader insights older than 90 days';

    public function handle(SiteContentService $content, ContentInsightService $insights): int
    {
        $removed = $content->pruneRevisions();
        $expired = $insights->prune();
        $this->info("Removed {$removed} old version(s) and {$expired} expired insight record(s).");

        return self::SUCCESS;
    }
}
