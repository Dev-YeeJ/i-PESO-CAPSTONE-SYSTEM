<?php

namespace App\Console\Commands;

use App\Models\Administrator;
use App\Services\ActivityLogger;
use App\Support\StaffPositions;
use Illuminate\Console\Command;

/**
 * Closes OJT intern and GIP beneficiary accounts once their end date has passed:
 * they can no longer sign in and are signed out. The system administrator can
 * extend the end date and reactivate them.
 */
class EndFinishedInternships extends Command
{
    protected $signature = 'ojt:end-internships';

    protected $description = 'Close OJT intern and GIP beneficiary accounts whose end date has passed';

    public function handle(): int
    {
        $interns = Administrator::query()
            ->whereIn('position', array_keys(StaffPositions::FIXED_TERM)) // OJT interns and GIP beneficiaries
            ->where('status', 'active')
            ->whereNotNull('ojt_end_date')
            ->whereDate('ojt_end_date', '<', Administrator::internshipToday())
            ->get();

        foreach ($interns as $intern) {
            $intern->forceFill(['status' => 'inactive', 'deactivated_reason' => 'internship_ended'])->save();
            $intern->tokens()->delete();

            ActivityLogger::logAs($intern, 'internship_ended', $intern->isGipBeneficiary()
                ? sprintf('GIP placement ended on %s; the account was closed automatically.', $intern->ojt_end_date->format('M j, Y'))
                : sprintf('Internship ended on %s; the intern account was closed automatically.', $intern->ojt_end_date->format('M j, Y')));
        }

        $this->info("Closed {$interns->count()} finished internship(s).");

        return self::SUCCESS;
    }
}
