<?php

namespace App\Console\Commands;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Services\SkillTaxonomyService;
use Illuminate\Console\Command;

class SyncSkillTaxonomyLinks extends Command
{
    protected $signature = 'skills:sync-taxonomy-links';

    protected $description = 'Resolve stored seeker and vacancy skill names to the canonical skill taxonomy';

    public function handle(SkillTaxonomyService $taxonomy): int
    {
        $seekerLinks = 0;
        $vacancyLinks = 0;

        JobSeeker::query()->chunkById(200, function ($seekers) use ($taxonomy, &$seekerLinks) {
            foreach ($seekers as $seeker) {
                $seekerLinks += $taxonomy->syncSeeker($seeker);
            }
        }, column: 'seeker_id');

        JobVacancy::query()->chunkById(200, function ($vacancies) use ($taxonomy, &$vacancyLinks) {
            foreach ($vacancies as $vacancy) {
                $vacancyLinks += $taxonomy->syncVacancy($vacancy);
            }
        }, column: 'post_id');

        $this->info("Linked {$seekerLinks} seeker skills and {$vacancyLinks} vacancy requirements.");

        return self::SUCCESS;
    }
}
