<?php

namespace App\Services;

use App\Models\Administrator;
use App\Models\Faq;
use App\Models\SiteContent;
use App\Models\SiteContentRevision;
use App\Support\SiteContentRegistry;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Reads and writes the portal's standing content (docs/content-module-plan.md).
 *
 * Everything that shows office details — the footer, Help pages, emails, the
 * chatbot — reads through office() so a change is made once. Saved values
 * are cached forever and flushed on every admin write, so a change shows on
 * the very next request with no expiry to wait for.
 *
 * Reads fail safe: if the tables are missing (a fresh install before
 * migrating) the registry defaults are used and nothing breaks.
 */
class SiteContentService
{
    private const CACHE_PREFIX = 'site-content:';

    /** The assistant's reference text holds at most this many FAQs… */
    public const CHATBOT_FAQ_LIMIT = 40;

    /** …each answer trimmed to this many characters, keeping the prompt cost predictable. */
    public const CHATBOT_ANSWER_LIMIT = 600;

    // ── Sections (office, landing) ────────────────────────────────────────

    /** Defaults with the saved values laid over them. A saved null wins (blank = not on record). */
    public function get(string $key): array
    {
        $saved = $this->saved($key);
        $merged = SiteContentRegistry::defaults($key);

        foreach (SiteContentRegistry::fields($key) as $field) {
            if (array_key_exists($field, $saved)) {
                $merged[$field] = $saved[$field];
            }
        }

        return $merged;
    }

    public function office(): array
    {
        return $this->get(SiteContentRegistry::OFFICE);
    }

    public function landing(): array
    {
        return $this->get(SiteContentRegistry::LANDING);
    }

    /** The raw saved value (no defaults), cached. */
    public function saved(string $key): array
    {
        try {
            return Cache::rememberForever(self::CACHE_PREFIX.'section:'.$key, function () use ($key) {
                return SiteContent::query()->where('key', $key)->value('value') ?? [];
            });
        } catch (QueryException) {
            return [];
        }
    }

    public function row(string $key): ?SiteContent
    {
        try {
            return SiteContent::query()->with('editor:admin_id,first_name,last_name')->where('key', $key)->first();
        } catch (QueryException) {
            return null;
        }
    }

    /**
     * Save a whole section. `$expectedVersion` is the version the editor
     * loaded (0 when nothing was saved yet); if someone else saved since,
     * this refuses with 409 rather than silently overwrite their change.
     *
     * @return array{content: SiteContent, changed: array<int, string>}
     */
    public function save(string $key, array $values, Administrator $admin, int $expectedVersion, string $action = 'saved'): array
    {
        return DB::transaction(function () use ($key, $values, $admin, $expectedVersion, $action) {
            $content = SiteContent::query()->where('key', $key)->lockForUpdate()->first();
            $currentVersion = $content?->version ?? 0;

            if ($currentVersion !== $expectedVersion) {
                throw new HttpException(409, 'Someone else saved changes to this section a moment ago. Reload to see them, then make your change again.');
            }

            $before = $this->get($key);
            $after = array_replace($before, SiteContentRegistry::normalize($key, $values));
            $changed = $this->changedFields($key, $before, $after);

            $content ??= new SiteContent(['key' => $key, 'version' => 0]);
            $content->fill([
                'value' => $after,
                'version' => $currentVersion + 1,
                'updated_by' => $admin->admin_id,
            ])->save();

            $this->recordRevision(SiteContentRevision::TYPE_SECTION, $key, $after, $changed, $action, $admin);
            $this->flush();

            return ['content' => $content->fresh('editor'), 'changed' => $changed];
        });
    }

    /** Put the listed fields (or the whole section) back to their defaults. */
    public function reset(string $key, ?array $fields, Administrator $admin, int $expectedVersion): array
    {
        $defaults = SiteContentRegistry::defaults($key);
        $fields = $fields ? array_values(array_intersect($fields, SiteContentRegistry::fields($key))) : SiteContentRegistry::fields($key);

        return $this->save($key, array_intersect_key($defaults, array_flip($fields)), $admin, $expectedVersion, 'reset');
    }

    /** @return array<int, string> labels of the fields whose value differs */
    public function changedFields(string $key, array $before, array $after): array
    {
        return collect(SiteContentRegistry::labels($key))
            ->filter(fn ($label, $field) => ($before[$field] ?? null) !== ($after[$field] ?? null))
            ->keys()
            ->values()
            ->all();
    }

    // ── FAQs ──────────────────────────────────────────────────────────────

    /** Every published FAQ in display order, cached. */
    public function publishedFaqs(): Collection
    {
        try {
            $rows = Cache::rememberForever(self::CACHE_PREFIX.'faqs', function () {
                return Faq::query()->published()->get()->map->toReaderArray()->all();
            });
        } catch (QueryException) {
            return collect();
        }

        $topicOrder = array_flip(array_keys(Faq::TOPICS));

        return collect($rows)->sortBy([
            fn ($a, $b) => ($topicOrder[$a['topic']] ?? 99) <=> ($topicOrder[$b['topic']] ?? 99),
            fn ($a, $b) => ($a['sort_order'] ?? 0) <=> ($b['sort_order'] ?? 0),
            fn ($a, $b) => $a['id'] <=> $b['id'],
        ])->values();
    }

    /** Published FAQs a reader of `$role` (null = public) may see. */
    public function faqsFor(?string $role): Collection
    {
        $audiences = Faq::audiencesFor($role);

        return $this->publishedFaqs()->filter(fn (array $faq) => in_array($faq['audience'], $audiences, true))->values();
    }

    public function featuredFaqs(): Collection
    {
        return $this->faqsFor(null)->filter(fn (array $faq) => $faq['is_featured'])->take(Faq::MAX_FEATURED)->values();
    }

    /** What the chatbot may quote: published, capped, answers trimmed. */
    public function faqsForChatbot(?string $role): Collection
    {
        return $this->faqsFor($role)
            ->take(self::CHATBOT_FAQ_LIMIT)
            ->map(fn (array $faq) => [
                'question' => $faq['question'],
                'answer' => mb_strimwidth(preg_replace('/\s+/', ' ', $faq['answer']), 0, self::CHATBOT_ANSWER_LIMIT, '…'),
            ])
            ->values();
    }

    public function topics(): array
    {
        return collect(Faq::TOPICS)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values()->all();
    }

    // ── History ───────────────────────────────────────────────────────────

    public function recordRevision(string $type, string|int $key, array $value, array $changed, string $action, ?Administrator $admin): SiteContentRevision
    {
        return SiteContentRevision::create([
            'content_type' => $type,
            'content_key' => (string) $key,
            'value' => $value,
            'changed_fields' => $changed,
            'action' => $action,
            'changed_by' => $admin?->admin_id,
        ]);
    }

    public function revisions(string $type, string|int $key, int $limit = SiteContentRevision::KEEP): Collection
    {
        return SiteContentRevision::query()
            ->with('author:admin_id,first_name,last_name')
            ->where('content_type', $type)
            ->where('content_key', (string) $key)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /** Keep the newest KEEP snapshots of every section and FAQ. Returns how many were removed. */
    public function pruneRevisions(): int
    {
        $removed = 0;

        SiteContentRevision::query()
            ->select('content_type', 'content_key')
            ->groupBy('content_type', 'content_key')
            ->havingRaw('COUNT(*) > ?', [SiteContentRevision::KEEP])
            ->get()
            ->each(function ($group) use (&$removed) {
                $keep = SiteContentRevision::query()
                    ->where('content_type', $group->content_type)
                    ->where('content_key', $group->content_key)
                    ->orderByDesc('created_at')
                    ->orderByDesc('id')
                    ->limit(SiteContentRevision::KEEP)
                    ->pluck('id');

                $removed += SiteContentRevision::query()
                    ->where('content_type', $group->content_type)
                    ->where('content_key', $group->content_key)
                    ->whereNotIn('id', $keep)
                    ->delete();
            });

        return $removed;
    }

    // ── Cache ─────────────────────────────────────────────────────────────

    public function flush(): void
    {
        foreach (SiteContentRegistry::KEYS as $key) {
            Cache::forget(self::CACHE_PREFIX.'section:'.$key);
        }
        Cache::forget(self::CACHE_PREFIX.'faqs');
    }
}
