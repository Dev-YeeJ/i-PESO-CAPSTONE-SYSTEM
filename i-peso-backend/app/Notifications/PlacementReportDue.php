<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PlacementReportDue extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $coverageLabel,
        public int $coverageMonth,
        public int $coverageYear,
        public string $dueDate,
        /** Days remaining until the deadline; negative once it has passed. */
        public int $daysLeft,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $overdue = $this->daysLeft < 0;

        $mail = (new MailMessage)
            ->subject($overdue
                ? "Overdue: {$this->coverageLabel} placement report"
                : "Reminder: {$this->coverageLabel} placement report is due")
            ->greeting('Hello '.($notifiable->company_name ?: 'Employer').',')
            ->line($overdue
                ? "PESO Urdaneta City has not yet received your placement report for {$this->coverageLabel}. It was due on {$this->dueDate}."
                : "Your placement report for {$this->coverageLabel} is due on {$this->dueDate}.");

        return $mail
            ->line('Upload your usual hired-applicants spreadsheet — any column layout works, you map the columns after uploading.')
            ->line('If you did not hire anyone during this period, you can record that in one click instead of uploading a file.')
            ->action('Submit your placement report', rtrim(config('app.frontend_url', config('app.url')), '/').'/employer/reports/placement-report')
            ->line('Thank you for helping PESO keep its employment records accurate.');
    }

    public function toArray(object $notifiable): array
    {
        $overdue = $this->daysLeft < 0;

        return [
            'title' => $overdue ? 'Placement report overdue' : 'Placement report due soon',
            'message' => $overdue
                ? "Your {$this->coverageLabel} placement report was due on {$this->dueDate} and has not been received."
                : "Your {$this->coverageLabel} placement report is due on {$this->dueDate}.",
            'coverage_month' => $this->coverageMonth,
            'coverage_year' => $this->coverageYear,
            'due_date' => $this->dueDate,
            'days_left' => $this->daysLeft,
            'action_url' => '/employer/reports/placement-report',
            'employer_id' => $notifiable->getKey(),
        ];
    }
}
