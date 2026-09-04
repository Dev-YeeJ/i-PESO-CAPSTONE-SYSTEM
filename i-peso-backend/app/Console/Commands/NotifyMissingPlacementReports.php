<?php

namespace App\Console\Commands;

use App\Models\Employer;
use App\Notifications\PlacementReportDue;
use App\Services\PlacementComplianceService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Chases employers who have not yet submitted a monthly placement report.
 *
 * PESO does this by phone today. Reminders fire at fixed offsets around the
 * deadline (see config/placement_reports.php), which keeps the command
 * idempotent without a "last notified" column — running it twice in one day
 * hits the same date window and re-queues nothing new.
 */
class NotifyMissingPlacementReports extends Command
{
    /** How many recent coverage periods to consider when matching offsets. */
    private const PERIODS_TO_SCAN = 3;

    protected $signature = 'placements:notify-missing {--date= : Treat this date as today (Y-m-d), for testing}';

    protected $description = 'Remind employers whose monthly placement report is due or overdue.';

    public function __construct(private readonly PlacementComplianceService $compliance)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $today = $this->option('date') ? Carbon::parse($this->option('date'))->startOfDay() : Carbon::today();
        $offsets = (array) config('placement_reports.reminder_offsets', [3, 0, -7]);
        $sent = 0;

        foreach ($this->recentPeriods($today) as $period) {
            $dueDate = $this->compliance->dueDate($period['year'], $period['month']);

            // Positive offsets are days before the deadline, negative after it.
            $matches = collect($offsets)->first(
                fn ($offset) => $dueDate->copy()->subDays((int) $offset)->isSameDay($today)
            );

            if ($matches === null) {
                continue;
            }

            $label = Carbon::create($period['year'], $period['month'], 1)->format('F Y');
            $employers = $this->compliance->employersMissingReport($period['year'], $period['month']);

            foreach ($employers as $employer) {
                if ($this->notify($employer, $label, $period, $dueDate, (int) $matches)) {
                    $sent++;
                }
            }

            $this->line("{$label}: {$employers->count()} employer(s) with no report, due {$dueDate->toDateString()}.");
        }

        $this->info("Placement report reminders queued: {$sent}");

        return self::SUCCESS;
    }

    private function notify(Employer $employer, string $label, array $period, Carbon $dueDate, int $offset): bool
    {
        try {
            $employer->notify(new PlacementReportDue(
                $label,
                $period['month'],
                $period['year'],
                $dueDate->toDateString(),
                $offset,
            ));

            return true;
        } catch (\Throwable $exception) {
            report($exception);
            $this->warn("Failed to notify employer #{$employer->getKey()}: {$exception->getMessage()}");

            return false;
        }
    }

    /**
     * The last few closed coverage periods, newest first.
     *
     * Scanning a window rather than assuming "last month" keeps a late offset
     * (say 7 days after a deadline late in the month) attached to the period it
     * actually belongs to.
     *
     * @return array<int, array{year: int, month: int}>
     */
    private function recentPeriods(Carbon $today): array
    {
        $periods = [];
        $cursor = $today->copy()->startOfMonth()->subMonth();

        for ($i = 0; $i < self::PERIODS_TO_SCAN; $i++) {
            $periods[] = ['year' => $cursor->year, 'month' => $cursor->month];
            $cursor->subMonth();
        }

        return $periods;
    }
}
