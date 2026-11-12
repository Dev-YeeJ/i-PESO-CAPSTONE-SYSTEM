<?php

namespace App\Console\Commands;

use App\Services\SiteContentService;
use Illuminate\Console\Command;

/** Keeps the newest 20 saved versions of each Site Content section and FAQ. */
class PruneSiteContentHistory extends Command
{
    protected $signature = 'site-content:prune-history';

    protected $description = 'Remove Site Content history beyond the newest 20 versions per section and FAQ';

    public function handle(SiteContentService $content): int
    {
        $removed = $content->pruneRevisions();
        $this->info("Removed {$removed} old Site Content version(s).");

        return self::SUCCESS;
    }
}
