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

    public const KEYS = [self::OFFICE, self::LANDING];

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

        if ($key === self::LANDING && isset($normalized['features']) && is_array($normalized['features'])) {
            $normalized['features'] = array_values(array_map(
                fn ($card) => is_array($card) ? array_intersect_key($card, array_flip(['icon', 'title', 'body'])) : $card,
                $normalized['features']
            ));
        }

        return $normalized;
    }
}
