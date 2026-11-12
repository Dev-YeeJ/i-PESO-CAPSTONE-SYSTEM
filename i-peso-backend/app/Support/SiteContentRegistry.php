<?php

namespace App\Support;

use Illuminate\Validation\Rule;

/**
 * The one place that defines each editable Site Content section: its fields,
 * their limits, and the default shown until PESO saves its own value.
 *
 * The character limits are what keep the layout safe — they are chosen so
 * the longest allowed text still fits the landing page on a phone. The
 * frontend mirrors them in src/components/site-content/siteContentDefaults.js.
 */
final class SiteContentRegistry
{
    public const OFFICE = 'office';
    public const LANDING = 'landing';
    public const ABOUT = 'about';

    public const KEYS = [self::OFFICE, self::LANDING, self::ABOUT];

    /** Landing page sections staff can switch off (the hero always shows). */
    public const LANDING_SECTIONS = ['announcements', 'features', 'jobs', 'programs', 'faq'];

    /** Who a PESO service is for (About page). */
    public const SERVICE_AUDIENCES = ['everyone', 'seekers', 'employers'];

    public const MAX_SERVICES = 12;

    /** Same rule as FAQ and announcement links: an internal path or an https:// link. */
    public const LINK_PATTERN = '#^(/(?!/)[^\s]*|https://[^\s]+)$#i';

    /** Icons a landing feature card may use (lucide names, drawn by the frontend). */
    public const FEATURE_ICONS = [
        'target', 'map-pin', 'file-search', 'users', 'briefcase', 'calendar-days',
        'check-circle', 'file-badge', 'landmark', 'search', 'sparkles', 'shield-check',
    ];

    public const OFFICE_PHONE_PATTERN = '/^[0-9+()\-.\s]{7,30}$/';
    public const FACEBOOK_PATTERN = '#^https://((www|m|web)\.)?(facebook|fb)\.com/\S*$#i';

    public static function exists(string $key): bool
    {
        return in_array($key, self::KEYS, true);
    }

    /** @return array<string, string> field => label, in form order */
    public static function labels(string $key): array
    {
        return match ($key) {
            self::OFFICE => [
                'office_name' => 'Office name',
                'address' => 'Address',
                'map_url' => 'Map link',
                'hours' => 'Office hours',
                'phone' => 'Phone',
                'email' => 'Email',
                'facebook' => 'Facebook page',
                'fees_policy' => 'Fees policy',
                'employer_approval_time' => 'Employer approval time',
            ],
            self::LANDING => [
                'hero_badge' => 'Hero badge',
                'headline_lead' => 'Headline (first words)',
                'headline_highlight' => 'Headline (highlighted words)',
                'headline_tail' => 'Headline (second line)',
                'subheadline' => 'Sub-headline',
                'highlights' => 'Highlights under the buttons',
                'features_eyebrow' => 'Features label',
                'features_heading' => 'Features heading',
                'features' => 'Feature cards',
                'footer_tagline' => 'Footer tagline',
                'show_sections' => 'Sections shown',
            ],
            self::ABOUT => [
                'headline' => 'Page heading',
                'intro' => 'Introduction',
                'mission' => 'Mission',
                'vision' => 'Vision',
                'mandate' => 'Legal mandate',
                'services' => 'PESO services',
            ],
        };
    }

    public static function fields(string $key): array
    {
        return array_keys(self::labels($key));
    }

    public static function defaults(string $key): array
    {
        return match ($key) {
            // Seeded from config/peso_knowledge.php so nothing is lost on the
            // first deploy; that file stays the fallback for an empty table.
            self::OFFICE => [
                'office_name' => 'Public Employment Service Office — Urdaneta City',
                'address' => config('peso_knowledge.office.address'),
                'map_url' => null,
                'hours' => config('peso_knowledge.office.hours'),
                'phone' => config('peso_knowledge.office.phone'),
                'email' => config('peso_knowledge.office.email'),
                'facebook' => config('peso_knowledge.office.facebook'),
                'fees_policy' => config('peso_knowledge.office.fees_policy'),
                'employer_approval_time' => config('peso_knowledge.office.employer_approval_time'),
            ],
            self::LANDING => [
                'hero_badge' => 'Urdaneta City PESO Employment Portal',
                'headline_lead' => 'Find Your',
                'headline_highlight' => 'Perfect Match',
                'headline_tail' => 'Powered by Smart Technology',
                'subheadline' => 'Browse job openings, join local job fairs, and browse government programs like SPES and TUPAD — all from one i-PESO account.',
                'highlights' => ['Free to Use', 'Skill-Tag Matching', 'Verified Opportunities'],
                'features_eyebrow' => 'What you get',
                'features_heading' => 'Built for finding work and talent.',
                'features' => [
                    ['icon' => 'target', 'title' => 'Skill-tag matching', 'body' => 'Stop guessing keywords. We score your skills against requirements to show you the best fits.'],
                    ['icon' => 'map-pin', 'title' => 'Location-Aware', 'body' => 'See jobs available in your immediate vicinity and across the region, instantly sorted by distance.'],
                    ['icon' => 'file-search', 'title' => 'Ranked Applicants', 'body' => 'Instantly see who actually has the required skills with our automated matching score.'],
                    ['icon' => 'users', 'title' => 'Centralized Screening', 'body' => 'Review applications, schedule interviews, and hire directly from your dashboard.'],
                ],
                'footer_tagline' => 'Urdaneta City PESO Employment Portal',
                'show_sections' => array_fill_keys(self::LANDING_SECTIONS, true),
            ],
            // Mission and vision are PESO Urdaneta's own words: left blank (and
            // hidden on the page) until the office supplies them, never invented.
            self::ABOUT => [
                'headline' => 'About PESO Urdaneta City',
                'intro' => 'The Public Employment Service Office (PESO) of Urdaneta City connects job seekers with employers, runs job fairs, and brings government employment and livelihood programs to the people of Urdaneta. i-PESO is its online employment portal.',
                'mission' => null,
                'vision' => null,
                'mandate' => 'PESOs are established under Republic Act No. 8759, the Public Employment Service Office Act of 1999, as amended by Republic Act No. 10691, to provide free employment facilitation services in every province, city and municipality.',
                'services' => [
                    ['title' => 'Job matching and referral', 'description' => 'Register once, build your NSRP profile, and get matched with vacancies that fit your skills and location.', 'audience' => 'seekers', 'link_label' => 'Register as a job seeker', 'link_url' => '/register/seeker'],
                    ['title' => 'Job fairs', 'description' => 'Local and special job fairs where you can meet several employers in one day.', 'audience' => 'everyone', 'link_label' => null, 'link_url' => null],
                    ['title' => 'Government employment programs', 'description' => 'Programs such as SPES and TUPAD, with their requirements and schedules in one place.', 'audience' => 'seekers', 'link_label' => null, 'link_url' => null],
                    ['title' => 'Employer accreditation and job posting', 'description' => 'Verified employers can post vacancies, screen ranked applicants and join PESO job fairs.', 'audience' => 'employers', 'link_label' => 'Register your company', 'link_url' => '/register/employer'],
                    ['title' => 'Placement reporting', 'description' => 'Employers file a simple monthly placement report so PESO can track local employment.', 'audience' => 'employers', 'link_label' => null, 'link_url' => null],
                ],
            ],
        };
    }

    /** Validation rules for a full section payload, keyed under `values.`. */
    public static function rules(string $key): array
    {
        $rules = match ($key) {
            // Office fields are optional: blank means "not on record".
            self::OFFICE => [
                'office_name' => ['nullable', 'string', 'max:120'],
                'address' => ['nullable', 'string', 'max:200'],
                'map_url' => ['nullable', 'string', 'max:500', 'regex:#^https://\S+$#i'],
                'hours' => ['nullable', 'string', 'max:150'],
                'phone' => ['nullable', 'string', 'max:30', 'regex:'.self::OFFICE_PHONE_PATTERN],
                'email' => ['nullable', 'string', 'email', 'max:120'],
                'facebook' => ['nullable', 'string', 'max:300', 'regex:'.self::FACEBOOK_PATTERN],
                'fees_policy' => ['nullable', 'string', 'max:300'],
                'employer_approval_time' => ['nullable', 'string', 'max:150'],
            ],
            // Landing text is required: a blank hero looks broken. "Reset to
            // default" is how staff go back to the original wording.
            self::LANDING => [
                'hero_badge' => ['required', 'string', 'max:60'],
                'headline_lead' => ['required', 'string', 'max:40'],
                'headline_highlight' => ['required', 'string', 'max:40'],
                'headline_tail' => ['required', 'string', 'max:60'],
                'subheadline' => ['required', 'string', 'max:220'],
                'highlights' => ['required', 'array', 'size:3'],
                'highlights.*' => ['required', 'string', 'max:30'],
                'features_eyebrow' => ['required', 'string', 'max:30'],
                'features_heading' => ['required', 'string', 'max:70'],
                'features' => ['required', 'array', 'size:4'],
                'features.*.icon' => ['required', Rule::in(self::FEATURE_ICONS)],
                'features.*.title' => ['required', 'string', 'max:40'],
                'features.*.body' => ['required', 'string', 'max:160'],
                'footer_tagline' => ['required', 'string', 'max:100'],
                'show_sections' => ['required', 'array:'.implode(',', self::LANDING_SECTIONS)],
                ...collect(self::LANDING_SECTIONS)->mapWithKeys(fn ($section) => ["show_sections.{$section}" => ['required', 'boolean']])->all(),
            ],
            self::ABOUT => [
                'headline' => ['required', 'string', 'max:80'],
                'intro' => ['required', 'string', 'max:600'],
                'mission' => ['nullable', 'string', 'max:600'],
                'vision' => ['nullable', 'string', 'max:600'],
                'mandate' => ['nullable', 'string', 'max:600'],
                'services' => ['present', 'array', 'max:'.self::MAX_SERVICES],
                'services.*.title' => ['required', 'string', 'max:80'],
                'services.*.description' => ['required', 'string', 'max:300'],
                'services.*.audience' => ['required', Rule::in(self::SERVICE_AUDIENCES)],
                'services.*.link_label' => ['nullable', 'string', 'max:60', 'required_with:values.services.*.link_url'],
                'services.*.link_url' => ['nullable', 'string', 'max:500', 'regex:'.self::LINK_PATTERN, 'required_with:values.services.*.link_label'],
            ],
        };

        return collect($rules)->mapWithKeys(fn ($rule, $field) => ["values.{$field}" => $rule])->all();
    }

    /** Validation attribute names, so errors read "Office hours …" not "values.hours …". */
    public static function attributes(string $key): array
    {
        $attributes = collect(self::labels($key))->mapWithKeys(fn ($label, $field) => ["values.{$field}" => $label])->all();

        if ($key === self::LANDING) {
            $attributes['values.highlights.*'] = 'highlight';
            $attributes['values.features.*.icon'] = 'card icon';
            $attributes['values.features.*.title'] = 'card title';
            $attributes['values.features.*.body'] = 'card text';
        }
        if ($key === self::ABOUT) {
            $attributes['values.services.*.title'] = 'service name';
            $attributes['values.services.*.description'] = 'service description';
            $attributes['values.services.*.link_label'] = 'link button';
            $attributes['values.services.*.link_url'] = 'link';
        }

        return $attributes;
    }

    /** Trim strings and turn empty ones into null; keeps arrays' shape. */
    public static function normalize(string $key, array $values): array
    {
        $clean = function ($value) use (&$clean) {
            if (is_array($value)) {
                return array_map($clean, $value);
            }
            if (is_string($value)) {
                $value = trim($value);

                return $value === '' ? null : $value;
            }

            return $value;
        };

        $normalized = [];
        foreach (self::fields($key) as $field) {
            if (array_key_exists($field, $values)) {
                $normalized[$field] = $clean($values[$field]);
            }
        }

        $keepShape = function (string $field, array $keys) use (&$normalized) {
            if (isset($normalized[$field]) && is_array($normalized[$field])) {
                $normalized[$field] = array_values(array_map(
                    fn ($item) => is_array($item) ? array_replace(array_fill_keys($keys, null), array_intersect_key($item, array_flip($keys))) : $item,
                    $normalized[$field]
                ));
            }
        };
        if ($key === self::ABOUT) {
            $keepShape('services', ['title', 'description', 'audience', 'link_label', 'link_url']);
        }
        if ($key === self::LANDING && isset($normalized['show_sections']) && is_array($normalized['show_sections'])) {
            $normalized['show_sections'] = collect(self::LANDING_SECTIONS)
                ->mapWithKeys(fn ($section) => [$section => filter_var($normalized['show_sections'][$section] ?? true, FILTER_VALIDATE_BOOLEAN)])
                ->all();
        }

        if ($key === self::LANDING && isset($normalized['features']) && is_array($normalized['features'])) {
            $normalized['features'] = array_values(array_map(
                fn ($card) => is_array($card) ? array_intersect_key($card, array_flip(['icon', 'title', 'body'])) : $card,
                $normalized['features']
            ));
        }

        return $normalized;
    }
}
