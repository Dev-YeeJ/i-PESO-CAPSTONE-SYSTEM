<?php

namespace App\Notifications;

class InterviewCancelledNotification extends InterviewBaseNotification
{
    protected function buildTitle(bool $isEmployer): string
    {
        return 'Interview Cancelled';
    }

    protected function buildSubject(bool $isEmployer, string $jobTitle): string
    {
        return $isEmployer ? "Interview cancelled for {$jobTitle}" : "Interview cancelled for {$jobTitle}";
    }

    protected function buildMessage(bool $isEmployer, string $companyName, string $jobTitle, string $applicantName, string $scheduledAt, string $location, string $recipientName): string
    {
        if ($isEmployer) {
            return "You cancelled the interview with {$applicantName} for {$jobTitle}.";
        }

        return "The interview for {$jobTitle} at {$companyName} was cancelled.";
    }

    protected function notificationType(): string
    {
        return 'cancelled';
    }
}
