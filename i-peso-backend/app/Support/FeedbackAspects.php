<?php

namespace App\Support;

/** What each kind of feedback rates, in the order forms and summaries show them. */
final class FeedbackAspects
{
    public const RECRUITMENT = 'recruitment';

    public const EMPLOYMENT = 'employment';

    /** How the employer ran hiring, judged on the process, not the outcome. */
    public const RECRUITMENT_ASPECTS = [
        'communication' => 'Communication',
        'process' => 'Recruitment process',
        'professionalism' => 'Professionalism',
        'posting_accuracy' => 'Job posting accuracy',
    ];

    /** For an application the employer never answered: all the applicant could judge. */
    public const LIMITED_RECRUITMENT_ASPECTS = ['communication', 'posting_accuracy'];

    /** Only for people the employer actually hired. */
    public const EMPLOYMENT_ASPECTS = [
        'work_environment' => 'Work environment',
        'management' => 'Management',
        'job_accuracy' => 'Job matches the posting',
        'overall' => 'Overall experience',
    ];

    /** An employer's private feedback about someone they hired. */
    public const WORKER_ASPECTS = [
        'professionalism' => 'Professionalism',
        'communication' => 'Communication',
        'reliability' => 'Reliability',
        'job_performance' => 'Job performance',
    ];

    public const WOULD_REHIRE = ['yes' => 'Yes', 'maybe' => 'Maybe', 'no' => 'No'];

    /** Why someone reports or disputes a review. */
    public const FLAG_REASONS = [
        'false_information' => 'False or misleading',
        'not_genuine' => 'Not a real experience',
        'harassment' => 'Harassment or insults',
        'personal_information' => 'Shares personal information',
        'discrimination' => 'Discriminatory',
        'other' => 'Other',
    ];

    public static function forReview(string $type, bool $limited = false): array
    {
        if ($type === self::EMPLOYMENT) {
            return self::EMPLOYMENT_ASPECTS;
        }

        return $limited
            ? array_intersect_key(self::RECRUITMENT_ASPECTS, array_flip(self::LIMITED_RECRUITMENT_ASPECTS))
            : self::RECRUITMENT_ASPECTS;
    }
}
