<?php

namespace App\Services;

use App\Models\Administrator;
use App\Models\PolicyVersion;
use App\Support\PolicyRegistry;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Versioned policy pages (docs/content-module-plan.md §3.4).
 *
 * Published versions are never changed. A change is a draft, published with
 * an effective date; the page shows the newest version already in effect,
 * mentions one that takes effect later, and lists every earlier version.
 * Until PESO publishes its first change, the original text (version 1,
 * built in) is what everyone sees.
 */
class PolicyService
{
    /** The version in effect today: a DB row, or null when only the built-in text exists. */
    public function current(string $slug): ?PolicyVersion
    {
        try {
            return PolicyVersion::query()->for($slug)->published()
                ->whereDate('effective_at', '<=', Carbon::today())
                ->newestFirst()
                ->first();
        } catch (QueryException) {
            return null;
        }
    }

    /** A published version whose effective date has not arrived yet. */
    public function upcoming(string $slug): ?PolicyVersion
    {
        try {
            return PolicyVersion::query()->for($slug)->published()
                ->whereDate('effective_at', '>', Carbon::today())
                ->orderBy('effective_at')->orderByDesc('version')
                ->first();
        } catch (QueryException) {
            return null;
        }
    }

    public function draft(string $slug): ?PolicyVersion
    {
        return PolicyVersion::query()->for($slug)->where('status', PolicyVersion::STATUS_DRAFT)->first();
    }

    /** Every published version, newest first; just the built-in one until the first change. */
    public function history(string $slug): Collection
    {
        try {
            $rows = PolicyVersion::query()->for($slug)->published()->newestFirst()->get();
        } catch (QueryException) {
            $rows = collect();
        }

        return $rows->isEmpty() ? collect([$this->builtinVersion($slug)]) : $rows;
    }

    public function version(string $slug, int $number): ?PolicyVersion
    {
        $row = PolicyVersion::query()->for($slug)->published()->where('version', $number)->first();

        if (! $row && $number === 1) {
            return $this->builtinVersion($slug);
        }

        return $row;
    }

    /** Version 1 as an unsaved model, read from resources/policies. */
    public function builtinVersion(string $slug): PolicyVersion
    {
        $builtin = PolicyRegistry::builtin($slug);

        return new PolicyVersion([
            'policy' => $slug,
            'version' => 1,
            'status' => PolicyVersion::STATUS_PUBLISHED,
            'is_builtin' => true,
            'effective_at' => $builtin['effective_date'],
            'summary' => $builtin['summary'] ?? null,
            'sections' => $builtin['sections'],
            'change_note' => 'Original version.',
        ]);
    }

    /** Open (or return the open) draft, copied from the newest version. */
    public function startDraft(string $slug, Administrator $admin): PolicyVersion
    {
        return DB::transaction(function () use ($slug, $admin) {
            if ($draft = $this->draft($slug)) {
                return $draft;
            }

            $this->ensureBuiltinRow($slug);

            $base = PolicyVersion::query()->for($slug)->published()->orderByDesc('version')->first();
            $next = (int) PolicyVersion::query()->for($slug)->max('version') + 1;

            return PolicyVersion::create([
                'policy' => $slug,
                'version' => $next,
                'status' => PolicyVersion::STATUS_DRAFT,
                'summary' => $base->summary,
                'sections' => $base->sections,
                'created_by' => $admin->admin_id,
                'updated_by' => $admin->admin_id,
            ]);
        });
    }

    public function saveDraft(PolicyVersion $draft, array $data, Administrator $admin): PolicyVersion
    {
        $draft->fill([
            'summary' => $this->cleanSummary($data['summary'] ?? null),
            'sections' => $this->cleanSections($data['sections']),
            'change_note' => filled($data['change_note'] ?? null) ? trim($data['change_note']) : null,
            'updated_by' => $admin->admin_id,
        ])->save();

        return $draft;
    }

    public function publish(PolicyVersion $draft, string $effectiveAt, Administrator $admin): PolicyVersion
    {
        if (blank($draft->change_note)) {
            throw ValidationException::withMessages(['change_note' => 'Describe what changed — it is shown in the list of previous versions.']);
        }

        if ($this->sameAsPublished($draft)) {
            throw ValidationException::withMessages(['sections' => 'This draft is identical to the current version. Change the text before publishing.']);
        }

        $draft->forceFill([
            'status' => PolicyVersion::STATUS_PUBLISHED,
            'effective_at' => Carbon::parse($effectiveAt)->startOfDay(),
            'published_by' => $admin->admin_id,
            'published_at' => now(),
        ])->save();

        return $draft;
    }

    /** Store version 1 as a row the first time someone edits, so history stays complete. */
    private function ensureBuiltinRow(string $slug): void
    {
        if (PolicyVersion::query()->for($slug)->exists()) {
            return;
        }

        $builtin = $this->builtinVersion($slug);
        $builtin->published_at = Carbon::parse($builtin->effective_at);
        $builtin->save();
    }

    private function sameAsPublished(PolicyVersion $draft): bool
    {
        $latest = PolicyVersion::query()->for($draft->policy)->published()->orderByDesc('version')->first();

        return $latest
            && json_encode($latest->sections) === json_encode($draft->sections)
            && json_encode($latest->summary) === json_encode($draft->summary);
    }

    private function cleanSummary(?array $summary): ?array
    {
        if (! $summary || blank($summary['body'] ?? null)) {
            return null;
        }

        return ['title' => trim((string) ($summary['title'] ?? '')) ?: 'Summary', 'body' => $this->cleanText($summary['body'])];
    }

    /**
     * Keep each section's anchor id (so links like /privacy-policy#retention
     * keep working across versions); new sections get one from their title.
     * Ids are unique within the page.
     */
    private function cleanSections(array $sections): array
    {
        $used = [];

        return collect($sections)->values()->map(function (array $section, int $index) use (&$used) {
            $title = trim($section['title']);
            $given = Str::slug((string) ($section['id'] ?? ''));
            $base = $given ?: (Str::slug($title) ?: 'section-'.($index + 1));
            $id = $base;
            for ($n = 2; in_array($id, $used, true); $n++) {
                $id = "{$base}-{$n}";
            }
            $used[] = $id;

            return ['id' => $id, 'title' => $title, 'body' => $this->cleanText($section['body'])];
        })->all();
    }

    /** Normalise line endings and collapse runs of blank lines. */
    private function cleanText(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace("/[ \t]+\n/", "\n", $text);

        return trim(preg_replace("/\n{3,}/", "\n\n", $text));
    }

    public function present(PolicyVersion $version, bool $withText = true): array
    {
        $row = [
            'version' => $version->version,
            'status' => $version->status,
            'is_builtin' => (bool) $version->is_builtin,
            'effective_at' => $version->effective_at?->toDateString(),
            'change_note' => $version->change_note,
            'published_at' => $version->published_at?->toIso8601String(),
            'published_by' => $version->relationLoaded('publisher') && $version->publisher
                ? trim($version->publisher->first_name.' '.$version->publisher->last_name) : null,
            'updated_at' => $version->updated_at?->toIso8601String(),
        ];

        if ($withText) {
            $row['summary'] = $version->summary;
            $row['sections'] = $version->sections;
        }

        return $row;
    }

    /** What /privacy-policy (etc.) receives. */
    public function publicPayload(string $slug): array
    {
        $current = $this->current($slug) ?? $this->builtinVersion($slug);
        $upcoming = $this->upcoming($slug);

        return [
            'policy' => ['slug' => $slug, 'title' => PolicyRegistry::title($slug)],
            'current' => $this->present($current),
            'upcoming' => $upcoming ? $this->present($upcoming, false) : null,
            'versions' => $this->history($slug)
                ->map(fn (PolicyVersion $version) => [
                    ...$this->present($version, false),
                    'is_current' => $version->version === $current->version,
                    'is_upcoming' => $version->effective_at?->isAfter(Carbon::today()) ?? false,
                ])
                ->values(),
        ];
    }
}
