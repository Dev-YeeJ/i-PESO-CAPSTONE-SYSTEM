<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\EmployerDocument;
use App\Models\JobVacancy;
use App\Models\Application;

class CleanupOrphanedData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:cleanup-orphaned-data';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cleans up orphaned data that points to soft-deleted or non-existent employers and seekers';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting orphaned data cleanup...');

        // 1. Delete documents for employers that are soft-deleted or hard-deleted
        // Note: employers use SoftDeletes, so we must check if employer exists and is NOT soft-deleted
        $deletedDocuments = DB::table('employer_documents')
            ->leftJoin('employers', 'employer_documents.employer_id', '=', 'employers.employer_id')
            ->whereNull('employers.employer_id')
            ->orWhereNotNull('employers.deleted_at')
            ->delete();

        $this->info("Deleted {$deletedDocuments} orphaned employer documents.");

        // 2. Delete job vacancies for non-existent/soft-deleted employers
        $deletedVacancies = DB::table('job_vacancies')
            ->leftJoin('employers', 'job_vacancies.employer_id', '=', 'employers.employer_id')
            ->whereNull('employers.employer_id')
            ->orWhereNotNull('employers.deleted_at')
            ->delete();

        $this->info("Deleted {$deletedVacancies} orphaned job vacancies.");

        // 3. Delete applications for non-existent/soft-deleted job seekers
        // JobSeekers do not use soft deletes, so just check for null
        $deletedApplications = DB::table('applications')
            ->leftJoin('job_seekers', 'applications.seeker_id', '=', 'job_seekers.seeker_id')
            ->whereNull('job_seekers.seeker_id')
            ->delete();

        $this->info("Deleted {$deletedApplications} orphaned applications (from non-existent seekers).");
        
        // 4. Delete applications for non-existent job vacancies
        $deletedApplicationsFromVacancies = DB::table('applications')
            ->leftJoin('job_vacancies', 'applications.post_id', '=', 'job_vacancies.post_id')
            ->whereNull('job_vacancies.post_id')
            ->delete();

        $this->info("Deleted {$deletedApplicationsFromVacancies} orphaned applications (from non-existent vacancies).");

        $this->info('Cleanup complete!');
    }
}
