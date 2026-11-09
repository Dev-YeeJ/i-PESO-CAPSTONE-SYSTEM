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

            // Each window is bounded on both sides, so only the one we're in can
            // fire. A late-scheduled interview (say, booked 10 minutes ahead) gets
            // the 15-minute reminder only, not a burst of all three at once.
            $window = match (true) {
                $minutesUntil <= 15 => '15m',
                $minutesUntil <= 60 => '1h',
                $minutesUntil <= 24 * 60 => '24h',
                default => null,
            };

            $column = $window ? "interview_reminder_{$window}_sent_at" : null;

            if (! $column || ! is_null($interview->{$column})) {
                continue;
            }

            Notification::send($application->jobSeeker, new InterviewReminderNotification($application, $window));
            Notification::send($application->jobVacancy?->employer, new InterviewReminderNotification($application, $window));

            $interview->forceFill([$column => $now])->save();
            $sent++;
        }

        $this->info("Sent {$sent} interview reminder notification(s).");

        return self::SUCCESS;
    }
}
