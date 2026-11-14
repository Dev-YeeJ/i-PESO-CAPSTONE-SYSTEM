<?php

namespace App\Services;

use App\Models\Faq;
use App\Models\PolicyVersion;
use App\Support\SiteContentRegistry;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The "smart" side of Content Modules (docs/content-module-plan.md §9):
 *
 *  - the chatbot gap report: questions the assistant could not answer;
 *  - the content health check: an automatic checklist of what to fix.
 *
 * The Help & FAQs pages (and their "Was this helpful?" votes and empty-search
 * reports) were removed on 2026-11-14 — the assistant covers that job, and
 * FAQs are now only its answer bank. Old rows in faq_feedback and
 * help_search_misses are left alone; prune() still ages out the searches.
 *
 * Privacy: nothing stored here identifies a person. Chatbot questions have
 * emails, phone numbers and long digit runs removed, and are pruned after
 * RETENTION_DAYS.
 */
class ContentInsightService
{
    public const RETENTION_DAYS = 90;

    /** Similarity at which two questions count as "about the same thing". */
    public const DUPLICATE_THRESHOLD = 0.6;
    public const MATCH_THRESHOLD = 0.5;

    /** Words that carry no meaning when comparing questions (English, Filipino, Pangasinan). */
    private const STOPWORDS = [
        'the', 'and', 'for', 'how', 'what', 'where', 'when', 'who', 'why', 'can', 'does', 'did', 'are', 'was', 'you', 'your',
        'with', 'this', 'that', 'there', 'have', 'has', 'not', 'any', 'from', 'about', 'into', 'will', 'would', 'should', 'please',
        'ang', 'ng', 'mga', 'po', 'ba', 'ko', 'ako', 'ikaw', 'kayo', 'paano', 'saan', 'kailan', 'ano', 'sino', 'bakit', 'yung', 'iyong',
        'para', 'kung', 'may', 'meron', 'wala', 'lang', 'naman', 'din', 'rin', 'nga', 'sa', 'na', 'at', 'ay', 'si', 'ni',
        'antoy', 'iner', 'kasin', 'piga', 'say', 'ed', 'tan', 'ya', 'iray',
    ];

    public function __construct(private readonly SiteContentService $content)
    {
    }

    // ── Text helpers ──────────────────────────────────────────────────────

    /** Remove anything that could identify someone: emails, URLs with queries, phone/ID numbers. */
    public static function redact(string $text): string
    {
        $text = preg_replace('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', '[email]', $text);
        $text = preg_replace('/(\+?\d[\d\s\-().]{6,}\d)/', '[number]', $text);

        return trim(preg_replace('/\s+/', ' ', $text));
    }

    /** Lower-case words only, for grouping the same question asked differently. */
    public static function normalize(string $text): string
    {
        $text = mb_strtolower(self::redact($text));
        $text = preg_replace('/\[(email|number)\]/', ' ', $text);
        $text = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $text);

        return trim(preg_replace('/\s+/', ' ', $text));
    }

    /** @return array<int, string> meaningful words */
    public static function keywords(string $text): array
    {
        return array_values(array_unique(array_filter(
            explode(' ', self::normalize($text)),
            fn ($word) => mb_strlen($word) >= 3 && ! in_array($word, self::STOPWORDS, true)
        )));
    }

    /** Overlap of meaningful words (0–1), forgiving simple plurals. */
    public static function similarity(string $a, string $b): float
    {
        $stem = fn (array $words) => array_values(array_unique(array_map(fn ($w) => preg_replace('/(es|s)$/u', '', $w), $words)));
        $x = $stem(self::keywords($a));
        $y = $stem(self::keywords($b));
        if (! $x || ! $y) {
            return 0.0;
        }

        $shared = count(array_intersect($x, $y));

        // Dice coefficient: kinder than Jaccard to a short search against a long question.
        return round((2 * $shared) / (count($x) + count($y)), 3);
    }

    // ── Chatbot gaps ─────────────────────────────────────────────────────

    /** Called by the assistant when it had to say it does not know. Never throws. */
    public function recordChatbotGap(string $question, ?string $audience): void
    {
        if (! config('services.chatbot.gap_logging', true)) {
            return;
        }

        try {
            $normalized = mb_substr(self::normalize($question), 0, 191);
            if (mb_strlen($normalized) < 3) {
                return;
            }

            DB::table('chatbot_gaps')->insert([
                'question' => mb_substr(self::redact($question), 0, 300),
                'normalized' => $normalized,
                'audience' => $audience ?? 'guest',
                'created_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            // The visitor's answer matters more than the report.
            report($exception);
        }
    }

    // ── Insights for staff ────────────────────────────────────────────────

    public function insights(int $days = 30): array
    {
        $since = now()->subDays($days);
        $faqs = Faq::query()->get(['id', 'question', 'answer', 'is_published', 'audience', 'topic']);

        return [
            'days' => $days,
            'chatbot_gaps' => $this->grouped('chatbot_gaps', 'question', $since, $faqs),
            'gap_logging' => (bool) config('services.chatbot.gap_logging', true),
            'retention_days' => self::RETENTION_DAYS,
        ];
    }

    /** Group unresolved rows by their normalized text, newest sample first, with the closest FAQ. */
    private function grouped(string $table, string $textColumn, Carbon $since, Collection $faqs): Collection
    {
        $rows = DB::table($table)
            ->whereNull('resolved_at')
            ->where('created_at', '>=', $since)
            ->orderByDesc('created_at')
            ->get();

        return $rows->groupBy('normalized')->map(function (Collection $group, string $normalized) use ($textColumn, $faqs) {
            $sample = $group->first();
            $match = $this->closestFaq($sample->{$textColumn}, $faqs);

            return [
                'normalized' => $normalized,
                'text' => $sample->{$textColumn},
                'count' => $group->count(),
                'last_at' => Carbon::parse($sample->created_at)->toIso8601String(),
                'sources' => $group->pluck('audience')->unique()->values(),
                'closest_faq' => $match,
            ];
        })->sortByDesc('count')->values()->take(50);
    }

    /** The FAQ most likely to answer `$text`, if any is close enough. */
    public function closestFaq(string $text, Collection $faqs): ?array
    {
        $best = null;
        foreach ($faqs as $faq) {
            $score = max(self::similarity($text, $faq->question), self::similarity($text, $faq->question.' '.$faq->answer) * 0.9);
            if ($score >= self::MATCH_THRESHOLD && (! $best || $score > $best['similarity'])) {
                $best = ['id' => $faq->id, 'question' => $faq->question, 'is_published' => (bool) $faq->is_published, 'similarity' => $score];
            }
        }

        return $best;
    }

    /** Mark every unanswered question with this wording as dealt with (e.g. after writing the FAQ). */
    public function resolve(string $normalized): int
    {
        return DB::table('chatbot_gaps')->where('normalized', $normalized)->whereNull('resolved_at')->update(['resolved_at' => now()]);
    }

    public function prune(): int
    {
        $cutoff = now()->subDays(self::RETENTION_DAYS);

        try {
            // help_search_misses gets no new rows since the Help page went; this ages out what is left.
            return DB::table('help_search_misses')->where('created_at', '<', $cutoff)->delete()
                + DB::table('chatbot_gaps')->where('created_at', '<', $cutoff)->delete();
        } catch (QueryException) {
            return 0;
        }
    }

    // ── Content health check ─────────────────────────────────────────────

    /**
     * An automatic checklist of what to fix. Each check is ok, warn (counts
     * against the score) or info (worth knowing, not scored).
     *
     * @return array{score: int, checks: array<int, array<string, mixed>>, counts: array<string, int>}
     */
    public function health(): array
    {
        $checks = [];
        $add = function (string $id, string $status, string $title, string $detail, string $module, ?string $action = null, array $items = []) use (&$checks) {
            $checks[] = compact('id', 'status', 'title', 'detail', 'module', 'action', 'items');
        };

        // Office info the assistant can't answer from.
        $office = $this->content->office();
        $labels = SiteContentRegistry::labels(SiteContentRegistry::OFFICE);
        $blank = collect(['address', 'hours', 'phone', 'email', 'facebook', 'fees_policy', 'employer_approval_time'])
            ->filter(fn ($field) => blank($office[$field] ?? null))
            ->map(fn ($field) => $labels[$field]);
        $blank->isEmpty()
            ? $add('office_complete', 'ok', 'Office info is complete', 'The assistant can answer every office question.', 'office')
            : $add('office_blank', 'warn', 'Office info has blanks', 'Not on record yet: '.$blank->implode(', ').'. The assistant tells people to contact the office instead.', 'office', 'Fill in Office info');

        $faqs = Faq::query()->get();
        $published = $faqs->where('is_published', true);

        $published->isEmpty()
            ? $add('faq_none', 'warn', 'No published FAQs', 'The assistant has no FAQs to answer from.', 'faqs', 'Write or publish FAQs')
            : $add('faq_published', 'ok', $published->count().' FAQs published', 'The assistant answers from them.', 'faqs');

        $stale = $published->filter(fn (Faq $faq) => $faq->updated_at?->lt(now()->subDays(180)));
        $stale->isEmpty()
            ? ($published->isNotEmpty() ? $add('faq_fresh', 'ok', 'FAQs reviewed recently', 'Every published FAQ was checked in the last 6 months.', 'faqs') : null)
            : $add('faq_stale', 'warn', $stale->count().' FAQs not reviewed in 6 months', 'Rules and requirements change — read them again and save to mark them reviewed.', 'faqs', 'Review FAQs', $this->faqItems($stale));

        $oldDrafts = $faqs->where('is_published', false)->filter(fn (Faq $faq) => $faq->created_at?->lt(now()->subDays(14)));
        if ($oldDrafts->isNotEmpty()) {
            $add('faq_old_drafts', 'info', $oldDrafts->count().' unpublished FAQs older than 2 weeks', 'Publish them if they are ready, or delete them.', 'faqs', 'Open FAQs', $this->faqItems($oldDrafts));
        }

        $duplicates = $this->duplicatePairs($faqs);
        $duplicates
            ? $add('faq_duplicates', 'warn', count($duplicates).' possible duplicate FAQs', 'These questions look alike. Merge them so the assistant gets one clear answer.', 'faqs', 'Compare', $duplicates)
            : ($faqs->count() > 1 ? $add('faq_unique', 'ok', 'No duplicate FAQs', 'Every question is distinct.', 'faqs') : null);

        $insights = $this->safeInsights();
        $gaps = collect($insights['chatbot_gaps'] ?? [])->where('count', '>=', 2);
        if (config('services.chatbot.gap_logging', true)) {
            $gaps->isEmpty()
                ? $add('chatbot', 'ok', 'The assistant is answering', 'No question went unanswered twice in the last 30 days.', 'insights')
                : $add('chatbot_gaps', 'warn', $gaps->count().' questions the assistant can’t answer', 'Asked more than once: '.$gaps->take(3)->pluck('text')->map(fn ($t) => '“'.Str::limit($t, 60).'”')->implode(', ').'.', 'insights', 'Answer them');

            if (! $this->privacyPolicyMentionsInsights()) {
                $add('privacy_notice', 'warn', 'Privacy Policy should mention question logging', 'Questions the assistant could not answer are recorded (without names, emails or numbers) for 90 days. Publish a Privacy Policy version that says so.', 'policies', 'Update Privacy Policy');
            }
        }

        $about = $this->content->get(SiteContentRegistry::ABOUT);
        $aboutBlank = collect(['mission' => 'mission', 'vision' => 'vision'])->filter(fn ($label, $field) => blank($about[$field] ?? null));
        if ($aboutBlank->isNotEmpty()) {
            $add('about_blank', 'info', 'About page has no '.$aboutBlank->implode(' or '), 'Those blocks stay hidden until PESO Urdaneta supplies its official wording.', 'about', 'Edit About PESO');
        }

        try {
            $oldPolicyDrafts = PolicyVersion::query()->where('status', PolicyVersion::STATUS_DRAFT)->where('updated_at', '<', now()->subDays(30))->pluck('policy');
        } catch (QueryException) {
            $oldPolicyDrafts = collect();
        }
        if ($oldPolicyDrafts->isNotEmpty()) {
            $add('policy_old_drafts', 'info', 'Policy drafts left open', 'Unpublished drafts older than 30 days: '.$oldPolicyDrafts->implode(', ').'.', 'policies', 'Open Policy pages');
        }

        $scored = collect($checks)->whereIn('status', ['ok', 'warn']);
        $score = $scored->isEmpty() ? 100 : (int) round($scored->where('status', 'ok')->count() / $scored->count() * 100);

        return [
            'score' => $score,
            'checks' => collect($checks)->sortBy(fn ($c) => ['warn' => 0, 'info' => 1, 'ok' => 2][$c['status']])->values()->all(),
            'counts' => [
                'faqs_published' => $published->count(),
                'faqs_unpublished' => $faqs->count() - $published->count(),
                'chatbot_gaps' => collect($insights['chatbot_gaps'] ?? [])->sum('count'),
            ],
        ];
    }

    private function safeInsights(): array
    {
        try {
            return $this->insights();
        } catch (QueryException) {
            return [];
        }
    }

    private function faqItems(Collection $faqs): array
    {
        return $faqs->take(10)->map(fn (Faq $faq) => ['id' => $faq->id, 'label' => $faq->question])->values()->all();
    }

    /** @return array<int, array{id: int, label: string, other_id: int, other_label: string, similarity: float}> */
    public function duplicatePairs(Collection $faqs): array
    {
        $pairs = [];
        $list = $faqs->values();
        for ($i = 0; $i < $list->count(); $i++) {
            for ($j = $i + 1; $j < $list->count(); $j++) {
                $a = $list[$i];
                $b = $list[$j];
                // Same question for different audiences is deliberate, not a duplicate.
                if ($a->audience !== $b->audience && $a->audience !== Faq::AUDIENCE_EVERYONE && $b->audience !== Faq::AUDIENCE_EVERYONE) {
                    continue;
                }
                $score = self::similarity($a->question, $b->question);
                if ($score >= self::DUPLICATE_THRESHOLD) {
                    $pairs[] = ['id' => $a->id, 'label' => $a->question, 'other_id' => $b->id, 'other_label' => $b->question, 'similarity' => $score];
                }
            }
        }

        return array_slice($pairs, 0, 10);
    }

    /** Whether the Privacy Policy in effect says that unanswered questions are recorded. */
    private function privacyPolicyMentionsInsights(): bool
    {
        $current = app(PolicyService::class)->current('privacy-policy');
        if (! $current) {
            return false;
        }

        $text = mb_strtolower(collect($current->sections)->pluck('body')->implode(' '));

        return str_contains($text, 'assistant') || str_contains($text, 'chatbot');
    }
}
