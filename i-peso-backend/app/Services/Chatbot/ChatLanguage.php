<?php

namespace App\Services\Chatbot;

/**
 * Which language the visitor wants, worked out on the server for every turn.
 *
 * Two different signals, used for two different things:
 *
 *  - explicit(): the visitor ASKED for a language ("answer in Pangasinan", "English
 *    please", "sagutin mo sa Tagalog"). The latest such request anywhere in the
 *    conversation wins and keeps applying to later turns. It is sent to the model as a
 *    per-turn instruction (GeminiChatService), because the controller drops the model's own
 *    turns from the history — without this, "use Pangasinan" followed by a short message
 *    such as a job title has nothing telling the model to stay in Pangasinan.
 *
 *  - guessed(): a rough English-vs-Filipino read of the latest message from common
 *    function words. It is ONLY used to pick the language of the fixed, non-model replies
 *    (ChatbotMessages). It is never sent to the model as an instruction: Pangasinan shares
 *    words such as "ko", "mo" and "na" with Tagalog, so a word count could easily mislabel
 *    Pangasinan as Filipino, and the model is better placed to recognise it.
 *
 * There is deliberately no Pangasinan word list here: the repository has no reliable
 * Pangasinan reference material, and a home-made lexicon would be guesswork. Pangasinan is
 * recognised from an explicit request, or left to the model (guessed() returns UNKNOWN).
 */
final class ChatLanguage
{
    public const PANGASINAN = 'pangasinan';

    public const FILIPINO = 'filipino';

    public const ENGLISH = 'english';

    public const ILOCANO = 'ilocano';

    /** English and Filipino in one message (Taglish). */
    public const MIXED = 'mixed';

    /** Not clearly English or Filipino — possibly Pangasinan, or too short to tell. */
    public const UNKNOWN = 'unknown';

    /**
     * Phrases that ask for a language, in English and Filipino. Matched against a
     * lowercased message. "Pangasinan" is also the province, so it only counts next to a
     * speaking verb or a word for "language" — "jobs in Pangasinan" is not a request.
     */
    private const REQUESTS = [
        self::PANGASINAN => [
            '/\bpangasinense\b/u',
            '/\bpangasinan\s+(language|dialect)\b/u',
            '/\b(wikang|salitang|lengguwaheng|lenggwaheng)\s+pangasinan\b/u',
            '/\b' . self::EN_VERBS . '\s+' . self::EN_FILLER . '(?:in|into|using)?\s*pangasinan\b/u',
            '/\b' . self::TL_VERBS . '\w*\s+' . self::TL_FILLER . '(?:sa|ng|in)\s+pangasinan\b/u',
            '/^\s*(?:in\s+|sa\s+)?pangasinan(?:\s+(?:please|po|lang|na\s+lang))?\s*[.!?]*\s*$/u',
        ],
        self::FILIPINO => [
            '/\b' . self::EN_VERBS . '\s+' . self::EN_FILLER . '(?:in|into|using)?\s*(?:filipino|tagalog)\b/u',
            '/\b' . self::TL_VERBS . '\w*\s+' . self::TL_FILLER . '(?:sa|ng|in)\s+(?:filipino|tagalog)\b/u',
            '/\b(?:filipino|tagalog)\s+(?:please|po|lang|na\s+lang)\b/u',
            '/\b(?:tagalugin|i-?tagalog)\b/u',
        ],
        self::ILOCANO => [
            '/\b(?:ilocano|ilokano|iloko|iloco)\s+(?:language|please|po|lang|na\s+lang)\b/u',
            '/\b(?:wikang|salitang|lengguwaheng|lenggwaheng)\s+(?:ilocano|ilokano|iloko)\b/u',
            '/\b' . self::EN_VERBS . '\s+' . self::EN_FILLER . '(?:in|into|using)?\s*(?:ilocano|ilokano|iloko|iloco)\b/u',
            '/\b' . self::TL_VERBS . '\w*\s+' . self::TL_FILLER . '(?:sa|ng|in)\s+(?:ilocano|ilokano|iloko)\b/u',
            '/^\s*(?:in\s+|sa\s+)?(?:ilocano|ilokano|iloko)\s*[.!?]*\s*$/u',
        ],
        self::ENGLISH => [
            '/\b' . self::EN_VERBS . '\s+' . self::EN_FILLER . '(?:in|into|using)?\s*english\b/u',
            '/\b' . self::TL_VERBS . '\w*\s+' . self::TL_FILLER . '(?:sa|ng|in)\s+(?:english|ingles)\b/u',
            '/\benglish\s+(?:please|po|lang|na\s+lang)\b/u',
            '/\bi-?english\b/u',
        ],
    ];

    // A request needs a speaking verb, so a skill ("magaling ako sa English", "marunong
    // mag-English") or a place ("jobs in Pangasinan") is not mistaken for one.
    private const EN_VERBS = '(?:speak|reply|answer|respond|talk|write|chat|ask|explain|translate|say|use|type)';

    private const EN_FILLER = '(?:(?:it|this|that|me|to\s+me|back)\s+)?';

    private const TL_VERBS = '(?:magsalita|sumagot|sagutin|isalin|magtanong|makipag-?usap|mag-?usap|ipaliwanag)';

    private const TL_FILLER = '(?:(?:mo|ka|po|kayo|ninyo|nyo|na|ako)\s+){0,2}';

    /** Common English function words. */
    private const ENGLISH_MARKERS = [
        'the', 'is', 'are', 'was', 'what', 'how', 'where', 'when', 'why', 'can', 'could',
        'do', 'does', 'did', 'i', 'my', 'you', 'your', 'for', 'to', 'of', 'and', 'with',
        'there', 'any', 'please', 'need', 'want', 'have', 'has', 'this', 'that', 'will',
    ];

    /**
     * Common Tagalog function words that are not also everyday Pangasinan words
     * ("ko", "mo", "na" and "sa" are left out for that reason).
     */
    private const FILIPINO_MARKERS = [
        'ang', 'ng', 'mga', 'po', 'ba', 'ako', 'ikaw', 'kayo', 'ninyo', 'paano', 'saan',
        'ano', 'kailan', 'bakit', 'wala', 'meron', 'ito', 'iyan', 'yung', 'lang', 'naman',
        'pwede', 'puwede', 'kailangan', 'gusto', 'opo', 'hindi', 'nasaan', 'magkano',
    ];

    /** @param  array<int, string>  $userMessages  The visitor's messages, oldest first. */
    private function __construct(private readonly array $userMessages)
    {
    }

    /** @param  array<int, string>  $userMessages  The visitor's messages, oldest first, ending with the latest. */
    public static function fromMessages(array $userMessages): self
    {
        return new self(array_values(array_filter($userMessages, 'is_string')));
    }

    /** The language the visitor last asked for in this conversation, or null if they never did. */
    public function explicit(): ?string
    {
        foreach (array_reverse($this->userMessages) as $message) {
            if ($requested = self::requestIn($message)) {
                return $requested;
            }
        }

        return null;
    }

    /** A rough read of the latest message. For fixed replies only — see the class comment. */
    public function guessed(): string
    {
        // Not end(): it moves the array pointer, which counts as writing a readonly property.
        $latest = $this->userMessages[array_key_last($this->userMessages)] ?? '';
        preg_match_all('/[\p{L}\']+/u', mb_strtolower($latest), $matches);
        $words = $matches[0];

        $english = count(array_intersect($words, self::ENGLISH_MARKERS));
        $filipino = count(array_intersect($words, self::FILIPINO_MARKERS));

        return match (true) {
            $english >= 1 && $filipino >= 1 => self::MIXED,
            $english >= 2 => self::ENGLISH,
            $filipino >= 2 => self::FILIPINO,
            default => self::UNKNOWN,
        };
    }

    /** What the fixed, non-model replies should use: an explicit request beats the guess. */
    public function forFixedReplies(): string
    {
        return $this->explicit() ?? $this->guessed();
    }

    private static function requestIn(string $message): ?string
    {
        $text = mb_strtolower($message);
        $found = null;
        $at = -1;

        // If one message names two languages ("not Tagalog, answer in Pangasinan"), the
        // request that comes last in the sentence is the one they mean.
        foreach (self::REQUESTS as $language => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match_all($pattern, $text, $hits, PREG_OFFSET_CAPTURE)) {
                    $offset = end($hits[0])[1];
                    if ($offset > $at) {
                        [$found, $at] = [$language, $offset];
                    }
                }
            }
        }

        return $found;
    }
}
