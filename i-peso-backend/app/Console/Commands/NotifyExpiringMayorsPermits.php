<?php

namespace App\Console\Commands;

use App\Models\EmployerDocument;
use App\Notifications\MayorsPermitExpiring;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class NotifyExpiringMayorsPermits extends Command
{
    protected $signature = 'permits:notify-expiring';

    protected $description = "Notify employers whose Mayor's Permit is about to expire (or has expired).";

    public function handle(): int
    {
        $today = Carbon::today();
        $sent = 0;

        // Day-offsets from expiry (config/permits.php, overridable in System Settings).
        // Fixed offsets keep the job idempotent without a "notified_at" column.
        $thresholds = collect((array) config('permits.reminder_days', [30, 14, 7, 1, 0]))->map(fn ($d) => (int) $d)->unique();

        foreach ($thresholds as $daysLeft) {
            $targetDate = $today->copy()->addDays($daysLeft)->toDateString();

            $documents = EmployerDocument::with('employer')
                ->where('document_type', 'mayors_permit')
                ->whereDate('expiration_date', $targetDate)
                ->get();

            foreach ($documents as $document) {
                $employer = $document->employer;

                // Skip soft-deleted / missing employer accounts.
                if (! $employer) {
                    continue;
                }

                try {
                    $employer->notify(new MayorsPermitExpiring(
                        $daysLeft,
                        optional($document->expiration_date)->toDateString(),
                    ));
                    $sent++;
                } catch (\Throwable $exception) {
                    report($exception);
                    $this->warn("Failed to notify employer #{$employer->getKey()}: {$exception->getMessage()}");
                }
            }
        }

        $this->info("Mayor's Permit expiry reminders queued: {$sent}");

        return self::SUCCESS;
    }
}
