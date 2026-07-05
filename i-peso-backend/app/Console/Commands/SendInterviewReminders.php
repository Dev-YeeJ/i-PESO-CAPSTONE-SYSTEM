<?php

namespace App\Console\Commands;

use App\Models\InterviewSchedule;
use App\Notifications\InterviewReminderNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class SendInterviewReminders extends Command
{
    protected $signature = 'interviews:send-reminders';

    protected $description = 'Send interview reminder notifications for upcoming interviews';

    public function handle(): int
    {
        $now = now();
        $sent = 0;

        $interviews = InterviewSchedule::query()
            ->where('status', 'scheduled')
            ->whereNotNull('schedule')
            ->where('schedule', '>=', $now)
            ->with(['application.jobVacancy.employer', 'application.jobSeeker'])
            ->get();

        foreach ($interviews as $interview) {
            $application = $interview->application;

            if (! $application || $application->status !== 'interview') {
                continue;
            }

            if ($interview->status !== 'scheduled') {
                continue;
            }

            $minutesUntil = (int) $now->diffInMinutes($interview->schedule, false);

            if ($minutesUntil < 0) {
                continue;
            }

            if ($minutesUntil <= 60 && is_null($interview->interview_reminder_1h_sent_at)) {
                Notification::send($application->jobSeeker, new InterviewReminderNotification($application, '1h'));
                Notification::send($application->jobVacancy?->employer, new InterviewReminderNotification($application, '1h'));

                $interview->forceFill(['interview_reminder_1h_sent_at' => $now])->save();
                $sent++;
                continue;
            }

            if ($minutesUntil <= 24 * 60 && $minutesUntil > 60 && is_null($interview->interview_reminder_24h_sent_at)) {
                Notification::send($application->jobSeeker, new InterviewReminderNotification($application, '24h'));
                Notification::send($application->jobVacancy?->employer, new InterviewReminderNotification($application, '24h'));

                $interview->forceFill(['interview_reminder_24h_sent_at' => $now])->save();
                $sent++;
            }
        }

        $this->info("Sent {$sent} interview reminder notification(s).");

        return self::SUCCESS;
    }
}
