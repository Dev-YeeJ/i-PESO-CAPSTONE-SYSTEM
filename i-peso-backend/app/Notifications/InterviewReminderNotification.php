<?php

namespace App\Notifications;

class InterviewReminderNotification extends InterviewBaseNotification
{
    protected function buildTitle(bool $isEmployer): string
    {
        return 'Interview Reminder';
    }

    protected function buildSubject(bool $isEmployer, string $jobTitle): string
    {
        return $isEmployer ? "Reminder: interview for {$jobTitle}" : "Reminder: interview for {$jobTitle}";
    }

    protected function buildMessage(bool $isEmployer, string $companyName, string $jobTitle, string $applicantName, string $scheduledAt, string $location, string $recipientName): string
    {
        $window = $this->reminderWindow === '1h' ? '1 hour' : '24 hours';

        if ($isEmployer) {
            return "Reminder: your interview with {$applicantName} for {$jobTitle} is coming up in {$window}.";
        }

        return "Reminder: your interview for {$jobTitle} at {$companyName} is coming up in {$window}.";
    }

    protected function notificationType(): string
    {
        return 'reminder';
    }
}
