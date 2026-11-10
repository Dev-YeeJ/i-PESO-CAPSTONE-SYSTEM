<?php

namespace App\Console\Commands;

use App\Models\Application;
use App\Services\Feedback\ReviewInvitations;
use App\Support\FeedbackAspects;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Invites hired job seekers to review the workplace once their start date
 * arrives. Only looks back LOOKBACK_DAYS, so the first run doesn't message
 * everyone ever hired through i-PESO.
 */
class SendEmploymentReviewInvitations extends Command
{
    protected $signature = 'reviews:invite-employment';

    protected $description = 'Invite hired job seekers to leave an Employment Experience review once they start';

    private const LOOKBACK_DAYS = 30;

    public function handle(ReviewInvitations $invitations): int
    {
        $today = Carbon::now('Asia/Manila')->toDateString();
        $sent = 0;

        Application::query()
            ->with(['jobSeeker', 'jobVacancy.employer'])
            ->where('status', 'hired')
            ->whereNotNull('placement_start_date')
            ->whereDate('placement_start_date', '<=', $today)
            ->whereDate('placement_start_date', '>=', Carbon::parse($today)->subDays(self::LOOKBACK_DAYS)->toDateString())
            ->chunkById(200, function ($applications) use ($invitations, &$sent) {
                foreach ($applications as $application) {
                    $sent += (int) $invitations->inviteForApplication($application, FeedbackAspects::EMPLOYMENT);
                }
            }, 'apply_id');

        $this->info("Sent {$sent} employment review invitation(s).");

        return self::SUCCESS;
    }
}
