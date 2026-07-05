<?php

namespace App\Notifications;

class InterviewUpdatedNotification extends InterviewBaseNotification
{
    protected function buildTitle(bool $isEmployer): string
    {
        return 'Interview Updated';
    }

    protected function buildSubject(bool $isEmployer, string $jobTitle): string
    {
        return $isEmployer ? "Interview updated for {$jobTitle}" : "Interview updated for {$jobTitle}";
    }

    protected function buildMessage(bool $isEmployer, string $companyName, string $jobTitle, string $applicantName, string $scheduledAt, string $location, string $recipientName): string
    {
        if ($isEmployer) {
            return "You updated the interview with {$applicantName} for {$jobTitle} to {$scheduledAt}.";
        }

        return "The interview for {$jobTitle} at {$companyName} was updated to {$scheduledAt}.";
    }

    protected function notificationType(): string
    {
        return 'updated';
    }
}
