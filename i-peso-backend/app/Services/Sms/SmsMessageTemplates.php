<?php

namespace App\Services\Sms;

use Carbon\CarbonInterface;
use Illuminate\Support\Str;

class SmsMessageTemplates
{
    public static function applicationStatus(string $jobTitle, string $status): string
    {
        return self::limit(sprintf(
            'i-PESO: Your application for %s was updated to %s. Check your account for details.',
            self::short($jobTitle, 42),
            Str::headline($status),
        ));
    }

    public static function interviewScheduled(string $jobTitle, string $company, ?CarbonInterface $schedule): string
    {
        return self::limit(sprintf(
            'i-PESO: Interview for %s at %s is scheduled on %s. Check your account for details.',
            self::short($jobTitle, 30),
            self::short($company, 28),
            self::dateTime($schedule),
        ));
    }

    public static function interviewReminder(string $jobTitle, string $company, ?CarbonInterface $schedule): string
    {
        return self::limit(sprintf(
            'i-PESO Reminder: Your interview for %s at %s is on %s. Please prepare your documents.',
            self::short($jobTitle, 28),
            self::short($company, 25),
            self::dateTime($schedule),
        ));
    }

    public static function interviewRescheduled(string $jobTitle, string $company, ?CarbonInterface $schedule): string
    {
        return self::limit(sprintf(
            'i-PESO: Your interview for %s at %s was rescheduled to %s. Check your account.',
            self::short($jobTitle, 28),
            self::short($company, 25),
            self::dateTime($schedule),
        ));
    }

    public static function interviewCancelled(string $jobTitle, string $company): string
    {
        return self::limit(sprintf(
            'i-PESO: Your interview for %s at %s has been cancelled. Check your account for details.',
            self::short($jobTitle, 38),
            self::short($company, 30),
        ));
    }

    public static function employerVerification(string $status): string
    {
        return self::limit(sprintf(
            'i-PESO: Your employer account verification status is %s. Check your account for details.',
            Str::headline($status),
        ));
    }

    public static function limit(string $message): string
    {
        $message = preg_replace('/\s+/', ' ', trim($message));

        return Str::limit($message, 160, '');
    }

    private static function short(string $value, int $length): string
    {
        return Str::limit(trim($value) ?: 'the position', $length, '...');
    }

    private static function dateTime(?CarbonInterface $schedule): string
    {
        return $schedule?->format('M j, Y g:i A') ?? 'a date to be confirmed';
    }
}
