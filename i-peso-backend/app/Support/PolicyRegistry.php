<?php

namespace App\Support;

use Illuminate\Support\Facades\File;

/**
 * The policy pages staff can version from Site Content → Policy pages.
 *
 * Version 1 of each is the text that shipped with the portal, kept in
 * resources/policies/{slug}.json (generated from the original React pages).
 * Policy text is plain: blank lines separate paragraphs, "- " starts a
 * bullet, **double asterisks** mark bold, and {office.address} /
 * {office.phone} / {office.email} / {office.facebook} are filled in from
 * Office info when the page is shown.
 */
final class PolicyRegistry
{
    public const POLICIES = [
        'privacy-policy' => 'Privacy Policy',
        'terms-of-service' => 'Terms of Service',
        'review-guidelines' => 'Review Guidelines',
    ];

    public const OFFICE_TOKENS = ['{office.name}', '{office.address}', '{office.phone}', '{office.email}', '{office.facebook}', '{office.hours}'];

    public static function exists(string $slug): bool
    {
        return array_key_exists($slug, self::POLICIES);
    }

    public static function title(string $slug): string
    {
        return self::POLICIES[$slug];
    }

    /** @return array{effective_date: string, summary: ?array, sections: array<int, array{id: string, title: string, body: string}>} */
    public static function builtin(string $slug): array
    {
        static $cache = [];

        return $cache[$slug] ??= json_decode(File::get(resource_path("policies/{$slug}.json")), true);
    }
}
