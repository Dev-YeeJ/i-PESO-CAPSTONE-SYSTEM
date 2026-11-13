<?php

namespace App\Support;

/**
 * Every setting on Configuration → System Settings: its group, label, help
 * text, type, allowed range and default.
 *
 * `config` names the Laravel config value the setting overrides at boot
 * (see SystemSettings::applyToConfig), so code that already reads that
 * config — the placement report deadline, the reminder commands, chatbot
 * gap logging — follows the setting with no further change.
 *
 * Deliberately NOT here: API keys and passwords (they stay in .env), and
 * rules the office decided on fairness grounds (the 3-review threshold,
 * the 14-day feedback reveal).
 */
final class SystemSettingsRegistry
{
    public const GROUPS = [
        'access' => 'Access',
        'sms' => 'SMS',
        'employer_rules' => 'Employer rules',
    ];

    /** SMS types staff can switch off, keyed by the message purposes they cover. */
    public const SMS_TYPES = [
        'application_status' => ['label' => 'Application status updates', 'help' => 'Sent to job seekers when an employer moves their application.', 'purposes' => ['application_status']],
        'interview' => ['label' => 'Interview messages', 'help' => 'Scheduled, rescheduled, cancelled, and the reminder before the interview.', 'purposes' => ['interview_scheduled', 'interview_rescheduled', 'interview_cancelled', 'interview_reminder']],
        'employer_verification' => ['label' => 'Employer verification results', 'help' => 'Sent to employers when PESO approves or returns their account.', 'purposes' => ['employer_verification']],
        'job_fair' => ['label' => 'Job fair messages', 'help' => 'Invitations, requirement reminders and participation updates for employers.', 'purposes' => ['job_fair_*']],
    ];

    /** @return array<string, array<string, mixed>> */
    public static function definitions(): array
    {
        $smsTypes = [];
        foreach (self::SMS_TYPES as $type => $meta) {
            $smsTypes["sms.types.{$type}"] = [
                'group' => 'sms', 'type' => 'bool', 'default' => true,
                'label' => $meta['label'], 'help' => $meta['help'],
            ];
        }

        return [
            // ── Access ──
            'maintenance.enabled' => [
                'group' => 'access', 'type' => 'bool', 'default' => false,
                'label' => 'Maintenance mode',
                'help' => 'Job seekers, employers and visitors see the message below instead of the portal and app. PESO staff can still sign in and work.',
            ],
            'maintenance.message' => [
                'group' => 'access', 'type' => 'text', 'max' => 300,
                'default' => 'i-PESO is being updated right now. Please try again in a little while — your account and applications are safe.',
                'label' => 'Maintenance message',
                'help' => 'Shown on every page while maintenance mode is on.',
            ],
            'registration.seekers_open' => [
                'group' => 'access', 'type' => 'bool', 'default' => true,
                'label' => 'Job seeker registration open',
                'help' => 'Turn off to pause new job seeker accounts. Existing accounts are not affected.',
            ],
            'registration.employers_open' => [
                'group' => 'access', 'type' => 'bool', 'default' => true,
                'label' => 'Employer registration open',
                'help' => 'Turn off to pause new employer accounts, e.g. while verifications are backed up.',
            ],
            'registration.closed_message' => [
                'group' => 'access', 'type' => 'text', 'max' => 300,
                'default' => 'New registrations are paused for now. Please check back soon, or visit the PESO office for help.',
                'label' => 'Paused registration message',
                'help' => 'Shown to people who try to register while registration is paused.',
            ],
            'chatbot.enabled' => [
                'group' => 'access', 'type' => 'bool', 'default' => true,
                'label' => 'Assistant (chatbot)',
                'help' => 'Turn off to hide the chat assistant on the website and stop it answering.',
            ],
            'chatbot.gap_logging' => [
                'group' => 'access', 'type' => 'bool', 'default' => true, 'config' => 'services.chatbot.gap_logging',
                'label' => 'Record questions the assistant can’t answer',
                'help' => 'Feeds Content Modules → Reader insights. Names, emails and numbers are removed; kept 90 days.',
            ],

            // ── SMS ──
            'sms.enabled' => [
                'group' => 'sms', 'type' => 'bool', 'default' => true,
                'label' => 'Send SMS',
                'help' => 'Master switch. When off, no text message is sent; bell, push and email notifications still go out.',
            ],
            ...$smsTypes,
            'sms.monthly_cap' => [
                'group' => 'sms', 'type' => 'int', 'min' => 0, 'max' => 100000, 'default' => 0,
                'label' => 'Monthly SMS limit',
                'help' => 'Stop sending once this many messages went out this month (each one uses a UniSMS credit). 0 = no limit.',
            ],

            // ── Employer rules ──
            'placement.deadline_day' => [
                'group' => 'employer_rules', 'type' => 'int', 'min' => 1, 'max' => 28, 'default' => 10, 'config' => 'placement_reports.deadline_day',
                'label' => 'Placement report due day',
                'help' => 'Day of the following month when the monthly placement report is due (1–28).',
            ],
            'placement.reminder_offsets' => [
                'group' => 'employer_rules', 'type' => 'int_list', 'min' => -30, 'max' => 28, 'max_items' => 5, 'default' => [3, 0, -7], 'config' => 'placement_reports.reminder_offsets',
                'label' => 'Placement report reminders',
                'help' => 'Days before the due day to remind employers who haven’t filed. 0 = on the due day; a negative number = days after (overdue).',
            ],
            'permits.reminder_days' => [
                'group' => 'employer_rules', 'type' => 'int_list', 'min' => 0, 'max' => 90, 'max_items' => 6, 'default' => [30, 14, 7, 1, 0], 'config' => 'permits.reminder_days',
                'label' => 'Mayor’s Permit expiry reminders',
                'help' => 'Days before a permit expires to remind the employer. 0 = on the expiry day.',
            ],
        ];
    }

    public static function exists(string $key): bool
    {
        return array_key_exists($key, self::definitions());
    }

    public static function defaults(): array
    {
        return array_map(fn (array $definition) => $definition['default'], self::definitions());
    }

    /** Validation rules for one setting's value. */
    public static function rules(string $key): array
    {
        $definition = self::definitions()[$key];

        return match ($definition['type']) {
            'bool' => ['required', 'boolean'],
            'int' => ['required', 'integer', 'min:'.$definition['min'], 'max:'.$definition['max']],
            'text' => ['required', 'string', 'min:10', 'max:'.$definition['max']],
            'int_list' => ['present', 'array', 'max:'.$definition['max_items']],
        };
    }

    public static function itemRules(string $key): array
    {
        $definition = self::definitions()[$key];

        return ['integer', 'min:'.$definition['min'], 'max:'.$definition['max']];
    }

    /** Cast an incoming value to the setting's type (lists de-duplicated and sorted, high to low). */
    public static function cast(string $key, mixed $value): mixed
    {
        return match (self::definitions()[$key]['type']) {
            'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'int' => (int) $value,
            'text' => trim((string) $value),
            'int_list' => collect($value)->map(fn ($v) => (int) $v)->unique()->sortDesc()->values()->all(),
        };
    }

    /** The SMS type a message purpose belongs to, or null for purposes that can't be switched off. */
    public static function smsTypeFor(string $purpose): ?string
    {
        foreach (self::SMS_TYPES as $type => $meta) {
            foreach ($meta['purposes'] as $pattern) {
                if ($pattern === $purpose || (str_ends_with($pattern, '*') && str_starts_with($purpose, rtrim($pattern, '*')))) {
                    return $type;
                }
            }
        }

        return null;
    }
}
