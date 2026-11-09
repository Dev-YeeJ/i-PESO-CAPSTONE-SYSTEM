<?php

namespace App\Console\Commands;

use App\Models\Administrator;
use App\Models\OjtTimeLog;
use App\Services\ActivityLogger;
use App\Support\StaffPositions;
use Illuminate\Console\Command;

/**
 * Closes intern accounts once the internship end date has passed: they can
 * no longer sign in and are signed out. Their time record is kept, and the
 * system administrator can extend the end date and reactivate them.
 */
class EndFinishedInternships extends Command
{
    protected $signature = 'ojt:end-internships';

    protected $description = 'Close OJT intern accounts whose internship end date has passed';

    public function handle(): int
    {
        $interns = Administrator::query()
            ->where('position', StaffPositions::OJT_INTERN)
            ->where('status', 'active')
            ->whereNotNull('ojt_end_date')
            ->whereDate('ojt_end_date', '<', OjtTimeLog::today())
            ->get();

        foreach ($interns as $intern) {
            $intern->forceFill(['status' => 'inactive', 'deactivated_reason' => 'internship_ended'])->save();
            $intern->tokens()->delete();

            ActivityLogger::logAs($intern, 'internship_ended', sprintf(
                'Internship ended on %s; the intern account was closed automatically.',
                $intern->ojt_end_date->format('M j, Y')
            ));
        }

        $this->info("Closed {$interns->count()} finished internship(s).");

        return self::SUCCESS;
    }
}
