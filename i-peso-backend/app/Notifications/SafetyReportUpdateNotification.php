<?php

namespace App\Notifications;

use App\Models\Employer;
use App\Models\SafetyReport;
use App\Notifications\Channels\ExpoPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Keeps a reporter informed about their own case: received, being reviewed,
 * closed. Deliberately says nothing about evidence, internal notes, what
 * action was taken or who was involved beyond the name they reported.
 */
class SafetyReportUpdateNotification extends Notification
{
    use Queueable;

    public function __construct(
        public SafetyReport $report,
        public string $event, // submitted | under_review | resolved | dismissed
    ) {}

    public function via(object $notifiable): array
    {
        return $notifiable instanceof Employer ? ['database'] : ['database', ExpoPushChannel::class];
    }

    public function toArray(object $notifiable): array
    {
        [$title, $message] = $this->content();

        return [
            'type' => 'safety_report_update',
            'title' => $title,
            'message' => $message,
            'report_id' => $this->report->id,
            'case_number' => $this->report->case_number,
            'status' => $this->report->status,
            'action_url' => ($notifiable instanceof Employer ? '/employer' : '/seeker').'/safety-reports?case='.$this->report->id,
        ];
    }

    public function toExpoPush(object $notifiable): array
    {
        [$title, $message] = $this->content();

        return [
            'title' => $title,
            'body' => $message,
            'data' => ['type' => 'safety_report_update', 'report_id' => $this->report->id],
        ];
    }

    private function content(): array
    {
        $case = $this->report->case_number;
        $name = $this->report->subjectName();

        return match ($this->event) {
            'submitted' => [
                'Report received',
                "Your report about {$name} was received as case {$case}. An authorized PESO administrator will review it.",
            ],
            'under_review' => [
                'Your report is being reviewed',
                "PESO is now reviewing case {$case}. We will let you know when the review is complete.",
            ],
            'resolved' => [
                'Your report has been resolved',
                "PESO has completed its review of case {$case} and taken appropriate action. Thank you for helping keep i-PESO safe.",
            ],
            'dismissed' => [
                'Your report has been closed',
                "PESO reviewed case {$case} and closed it. If you have new information, you can file a new report.",
            ],
            default => ['Update on your report', "There is an update on case {$case}."],
        };
    }
}
