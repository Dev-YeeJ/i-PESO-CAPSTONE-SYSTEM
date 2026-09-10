<?php

namespace App\Console\Commands;

use App\Models\Occupation;
use Database\Seeders\OccupationSeeder;
use Illuminate\Console\Command;

/**
 * Populates the real ESCO/O*NET occupation catalog (and its O*NET skill
 * evidence) the first time this runs against a database that still only has
 * the ~49-row hardcoded fallback list — then no-ops on every later run.
 *
 * Meant to be called from the deploy script (see deployment/deploy.sh)
 * rather than scheduled — it's a one-time bootstrap, not a recurring sync.
 * PSOC is deliberately not included here since it calls a live external API
 * and needs a PSOC_API_TOKEN; run `occupations:sync-psoc` separately once
 * that credential exists.
 */
class BootstrapOccupationCatalog extends Command
{
    protected $signature = 'occupations:bootstrap-if-empty
        {--threshold=100 : Skip the import chain once Occupation count reaches this}';

    protected $description = 'Run the ESCO/O*NET occupation + skill import chain once, only if the catalog still looks unpopulated';

    public function handle(): int
    {
        $threshold = (int) $this->option('threshold');
        $existing = Occupation::count();

        if ($existing >= $threshold) {
            $this->info("Occupation catalog already has {$existing} rows (>= {$threshold}) — skipping import.");

            return self::SUCCESS;
        }

        $this->info("Occupation catalog has {$existing} rows (< {$threshold}) — running the full import chain. This may take a few minutes.");

        $this->call('db:seed', ['--class' => OccupationSeeder::class, '--force' => true]);
        $this->call('occupations:import-esco');
        $this->call('occupations:import-onet');
        $this->call('occupations:import-aliases');
        $this->call('occupations:import-general-terms');
        $this->call('skills:import-onet');

        $this->info('Occupation catalog now has '.Occupation::count().' rows.');

        return self::SUCCESS;
    }
}
