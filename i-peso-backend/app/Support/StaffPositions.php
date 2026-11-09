<?php

namespace App\Support;

/**
 * PESO Urdaneta's positions, from the office's organizational chart.
 *
 * A position is what a person *is* in the office (their box on the chart);
 * their access role is what they can *open* in the system. Picking a
 * position pre-selects its default role, which the system administrator can
 * still change.
 */
final class StaffPositions
{
    public const OFFICE_MANAGER = 'peso_office_manager';

    public const SYSTEM_ADMINISTRATOR = 'special_law_enforcement_officer';

    public const ADMINISTRATIVE_AIDE = 'administrative_aide';

    public const OJT_INTERN = 'ojt_intern';

    public const ALL = [
        self::OFFICE_MANAGER => [
            'label' => 'PESO Office Manager',
            'title' => 'City Government Assistant Department Head / Public Employment Service Office Manager',
            'default_role' => 'office-manager',
            'reports_to' => null,
        ],
        // The office's system administrator: creates and manages every account.
        self::SYSTEM_ADMINISTRATOR => [
            'label' => 'Special Law Enforcement Officer',
            'title' => 'Special Law Enforcement Officer',
            'default_role' => 'administrator',
            'reports_to' => self::OFFICE_MANAGER,
        ],
        self::ADMINISTRATIVE_AIDE => [
            'label' => 'Administrative Aide',
            'title' => 'Administrative Aide',
            'default_role' => 'administrative-aide',
            'reports_to' => self::OFFICE_MANAGER,
        ],
        self::OJT_INTERN => [
            'label' => 'OJT / Intern',
            'title' => 'On-the-Job Trainee / Intern',
            'default_role' => 'ojt-intern',
            'reports_to' => self::OFFICE_MANAGER,
        ],
    ];

    public const EMPLOYMENT_TYPES = [
        'permanent' => 'Permanent',
        'casual' => 'Casual',
        'job_order' => 'Job Order',
        'contract_of_service' => 'Contract of Service',
        'ojt' => 'OJT / Internship',
    ];

    public static function keys(): array
    {
        return array_keys(self::ALL);
    }

    public static function label(?string $position): ?string
    {
        return $position ? (self::ALL[$position]['label'] ?? null) : null;
    }

    public static function defaultRoleSlug(string $position): ?string
    {
        return self::ALL[$position]['default_role'] ?? null;
    }

    /** Catalog for dropdowns and the org chart, in chart order. */
    public static function options(): array
    {
        return array_map(
            fn (string $key, array $position) => ['value' => $key] + $position,
            array_keys(self::ALL),
            self::ALL
        );
    }
}
