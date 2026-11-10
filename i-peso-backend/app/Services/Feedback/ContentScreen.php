<?php

namespace App\Services\Feedback;

/**
 * The automatic check every review comment and employer reply goes through.
 * It doesn't reject anything: a comment that trips it is held for PESO to
 * read before it appears, so an honest review with one bad word isn't lost.
 */
final class ContentScreen
{
    /** Strong insults and profanity in English and Filipino (whole words, any case). */
    private const PROFANITY = [
        'fuck', 'fucking', 'fucked', 'motherfucker', 'shit', 'bullshit', 'bitch', 'asshole', 'bastard', 'cunt', 'dickhead',
        'putangina', 'putang ina', 'tangina', 'tang ina', 'puta', 'gago', 'gaga', 'ulol', 'tarantado', 'tarantada',
        'punyeta', 'pakyu', 'kupal', 'bobo', 'inutil', 'leche', 'lintik', 'hinayupak', 'peste',
    ];

    public const REASONS = [
        'contact_details' => 'Contains a phone number or email address',
        'link' => 'Contains a link',
        'profanity' => 'Contains profanity or insults',
    ];

    /** @return list<string> keys of REASONS that apply; empty means it can be published. */
    public static function check(?string $text): array
    {
        $text = trim((string) $text);
        if ($text === '') {
            return [];
        }

        $reasons = [];

        $phone = '/(?:\+?63|0)\s*9\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/';
        $email = '/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i';
        if (preg_match($phone, $text) || preg_match($email, $text)) {
            $reasons[] = 'contact_details';
        }

        // A bare domain counts too, but not the end of an email address (caught above).
        if (preg_match('~(?:https?://|www\.)\S+|(?<![@\w.-])[a-z0-9-]+\.(?:com|ph|net|org|io|info)\b~i', $text)) {
            $reasons[] = 'link';
        }

        $words = implode('|', array_map(fn ($word) => str_replace(' ', '\s+', preg_quote($word, '/')), self::PROFANITY));
        if (preg_match('/(?<![\p{L}])(?:'.$words.')(?![\p{L}])/iu', $text)) {
            $reasons[] = 'profanity';
        }

        return $reasons;
    }

    public static function describe(array $reasons): ?string
    {
        if ($reasons === []) {
            return null;
        }

        return implode('; ', array_map(fn ($reason) => self::REASONS[$reason] ?? $reason, $reasons));
    }
}
