<?php

namespace App\Support;

/**
 * The one vocabulary for Report & Safety Management. The web portal and the
 * mobile app read it from GET .../safety-reports/options, so labels can no
 * longer drift between platforms the way the old employer-report reasons did.
 */
final class SafetyReportCatalog
{
    public const SUBJECT_EMPLOYER = 'employer';

    public const SUBJECT_SEEKER = 'job_seeker';

    public const REPORTER_SEEKER = 'job_seeker';

    public const REPORTER_EMPLOYER = 'employer';

    public const REPORTER_STAFF = 'peso_staff';

    /** Categories a job seeker can pick when reporting an employer or company. */
    public const EMPLOYER_CATEGORIES = [
        'scam_fraud' => 'Suspected scam or fraudulent job offer',
        'fake_vacancy' => 'Fake or misleading job vacancy',
        'misleading_terms' => 'Misleading salary, benefits, or job information',
        'illegal_fees' => 'Request for money or unauthorized fees',
        'unprofessional_conduct' => 'Inappropriate or unprofessional behavior',
        'discrimination_harassment' => 'Discrimination or harassment',
        'suspicious_company' => 'Suspicious company information',
        'offer_mismatch' => 'Job vacancy does not match the actual offer',
        'other' => 'Other concern',
    ];

    /** Categories an employer can pick when reporting a job seeker. */
    public const SEEKER_CATEGORIES = [
        'false_information' => 'Suspected false or misleading information',
        'fraudulent_documents' => 'Fraudulent or suspicious documents',
        'unprofessional_conduct' => 'Inappropriate or unprofessional behavior',
        'harassment' => 'Harassment or abusive communication',
        'no_show' => 'Failure to attend a confirmed interview or recruitment activity',
        'application_misuse' => 'Repeated misuse of the application process',
        'impersonation' => 'Suspected impersonation or fraudulent identity',
        'other' => 'Other concern',
    ];

    /** Short hint under each category in the report form. */
    public const CATEGORY_HINTS = [
        'scam_fraud' => 'The offer looks like a scam, e.g. asks for bank details or promises unrealistic pay.',
        'fake_vacancy' => 'The vacancy does not seem to exist or the company is not really hiring.',
        'misleading_terms' => 'Salary, benefits, schedule or location differ from what was posted.',
        'illegal_fees' => 'You were asked to pay for an application, training, medical, ID or placement.',
        'unprofessional_conduct' => 'Rude, threatening or otherwise unprofessional behaviour.',
        'discrimination_harassment' => 'Unfair treatment because of sex, age, religion, disability or similar, or harassment.',
        'suspicious_company' => 'The company name, address or permits do not look genuine.',
        'offer_mismatch' => 'The actual job offered is different from the vacancy you applied to.',
        'false_information' => 'Education, work history or other details on the profile appear untrue.',
        'fraudulent_documents' => 'A submitted resume, certificate or ID appears altered or fake.',
        'harassment' => 'Abusive, threatening or harassing messages or behaviour.',
        'no_show' => 'Did not attend a confirmed interview or activity without notice.',
        'application_misuse' => 'Repeated spam applications or misuse of the hiring process.',
        'impersonation' => 'The applicant appears to be using someone else\'s identity.',
        'other' => 'Something else that breaks i-PESO policies.',
    ];

    /** Categories that start a case at high priority (fraud, money, abuse, identity). */
    public const HIGH_PRIORITY_CATEGORIES = [
        'scam_fraud', 'illegal_fees', 'discrimination_harassment', 'harassment',
        'fraudulent_documents', 'impersonation',
    ];

    public const LOW_PRIORITY_CATEGORIES = ['no_show', 'application_misuse'];

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_UNDER_REVIEW = 'under_review';

    public const STATUS_ACTION_REQUIRED = 'action_required';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_DISMISSED = 'dismissed';

    public const STATUSES = [
        self::STATUS_SUBMITTED => 'Submitted',
        self::STATUS_UNDER_REVIEW => 'Under Review',
        self::STATUS_ACTION_REQUIRED => 'Investigation / Action Required',
        self::STATUS_RESOLVED => 'Resolved',
        self::STATUS_DISMISSED => 'Dismissed',
    ];

    public const OPEN_STATUSES = [self::STATUS_SUBMITTED, self::STATUS_UNDER_REVIEW, self::STATUS_ACTION_REQUIRED];

    public const CLOSED_STATUSES = [self::STATUS_RESOLVED, self::STATUS_DISMISSED];

    public const PRIORITIES = [
        'low' => 'Low',
        'normal' => 'Normal',
        'high' => 'High',
        'urgent' => 'Urgent',
    ];

    /** Why a report was dismissed — false_report feeds the reporter's history. */
    public const DISMISSAL_REASONS = [
        'insufficient_evidence' => 'Insufficient evidence',
        'not_a_violation' => 'Not a policy violation',
        'duplicate' => 'Duplicate of another case',
        'resolved_between_parties' => 'Resolved between the parties',
        'false_report' => 'False or malicious report',
    ];

    /** Actions PESO can record on a case about an employer. */
    public const EMPLOYER_ACTIONS = [
        'no_action' => 'No action after review',
        'warning' => 'Issue a warning or notice',
        'request_verification' => 'Request additional verification',
        'hide_vacancy' => 'Temporarily hide a job vacancy',
        'restore_vacancy' => 'Restore a hidden job vacancy',
        'restrict_account' => 'Restrict platform activities (no new or reopened vacancies)',
        'suspend_account' => 'Suspend the employer account',
        'lift_restriction' => 'Lift a restriction or suspension',
        'escalate_external' => 'Escalate under PESO procedures (e.g. DOLE, PNP)',
    ];

    /** Actions PESO can record on a case about a job seeker. */
    public const SEEKER_ACTIONS = [
        'no_action' => 'No action after review',
        'warning' => 'Issue a warning or notice',
        'request_clarification' => 'Request profile or document clarification',
        'restrict_account' => 'Restrict platform activities (no new applications)',
        'suspend_account' => 'Temporarily suspend the account',
        'lift_restriction' => 'Lift a restriction or suspension',
        'escalate_external' => 'Escalate under PESO procedures',
    ];

    /** Actions whose notice is sent to the reported party. */
    public const NOTIFYING_ACTIONS = [
        'warning', 'request_verification', 'request_clarification', 'hide_vacancy', 'restore_vacancy',
        'restrict_account', 'suspend_account', 'lift_restriction',
    ];

    public static function categoriesFor(string $subjectType): array
    {
        return $subjectType === self::SUBJECT_EMPLOYER ? self::EMPLOYER_CATEGORIES : self::SEEKER_CATEGORIES;
    }

    public static function actionsFor(string $subjectType): array
    {
        return $subjectType === self::SUBJECT_EMPLOYER ? self::EMPLOYER_ACTIONS : self::SEEKER_ACTIONS;
    }

    public static function categoryLabel(string $category, ?string $subjectType = null): string
    {
        $pool = $subjectType ? self::categoriesFor($subjectType) : self::EMPLOYER_CATEGORIES + self::SEEKER_CATEGORIES;

        return $pool[$category] ?? (self::EMPLOYER_CATEGORIES + self::SEEKER_CATEGORIES)[$category] ?? ucfirst(str_replace('_', ' ', $category));
    }

    public static function defaultPriority(string $category): string
    {
        return match (true) {
            in_array($category, self::HIGH_PRIORITY_CATEGORIES, true) => 'high',
            in_array($category, self::LOW_PRIORITY_CATEGORIES, true) => 'low',
            default => 'normal',
        };
    }

    public static function reporterLabel(string $reporterType): string
    {
        return match ($reporterType) {
            self::REPORTER_SEEKER => 'Job seeker',
            self::REPORTER_EMPLOYER => 'Employer',
            self::REPORTER_STAFF => 'PESO staff',
            default => ucfirst($reporterType),
        };
    }

    /** Options for the report form (what a reporter may pick). */
    public static function formOptions(string $subjectType): array
    {
        return [
            'subject_type' => $subjectType,
            'categories' => collect(self::categoriesFor($subjectType))
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label, 'hint' => self::CATEGORY_HINTS[$value] ?? null])
                ->values()->all(),
            'limits' => [
                'description_min' => 30,
                'description_max' => 3000,
                'max_attachments' => (int) config('safety_reports.max_attachments'),
                'max_attachment_kb' => (int) config('safety_reports.max_attachment_kb'),
                'attachment_types' => config('safety_reports.attachment_types'),
            ],
            'statuses' => self::pairs(self::STATUSES),
        ];
    }

    /** Everything the admin workspace needs for filters and the action form. */
    public static function adminOptions(): array
    {
        return [
            'statuses' => self::pairs(self::STATUSES),
            'priorities' => self::pairs(self::PRIORITIES),
            'dismissal_reasons' => self::pairs(self::DISMISSAL_REASONS),
            'subject_types' => self::pairs([self::SUBJECT_EMPLOYER => 'Employer / company', self::SUBJECT_SEEKER => 'Job seeker']),
            'reporter_types' => self::pairs([
                self::REPORTER_SEEKER => 'Job seeker', self::REPORTER_EMPLOYER => 'Employer', self::REPORTER_STAFF => 'PESO staff',
            ]),
            'categories' => [
                self::SUBJECT_EMPLOYER => self::pairs(self::EMPLOYER_CATEGORIES),
                self::SUBJECT_SEEKER => self::pairs(self::SEEKER_CATEGORIES),
            ],
            'actions' => [
                self::SUBJECT_EMPLOYER => self::pairs(self::EMPLOYER_ACTIONS),
                self::SUBJECT_SEEKER => self::pairs(self::SEEKER_ACTIONS),
            ],
        ];
    }

    private static function pairs(array $map): array
    {
        return collect($map)->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])->values()->all();
    }
}
