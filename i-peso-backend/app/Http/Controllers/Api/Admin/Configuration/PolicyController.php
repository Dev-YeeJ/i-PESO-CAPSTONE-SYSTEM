<?php

namespace App\Http\Controllers\Api\Admin\Configuration;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\PolicyVersion;
use App\Services\ActivityLogger;
use App\Services\PolicyService;
use App\Support\PolicyRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Site Content → Policy pages. One open draft per policy; publishing gives
 * it an effective date and it becomes a new, permanent version.
 * Route group: admin.permission:configuration.
 */
class PolicyController extends Controller
{
    public function __construct(private readonly PolicyService $policies)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'policies' => collect(PolicyRegistry::POLICIES)->map(function (string $title, string $slug) {
                $current = $this->policies->current($slug) ?? $this->policies->builtinVersion($slug);
                $upcoming = $this->policies->upcoming($slug);
                $draft = $this->policies->draft($slug);

                return [
                    'slug' => $slug,
                    'title' => $title,
                    'current' => $this->policies->present($current, false),
                    'upcoming' => $upcoming ? $this->policies->present($upcoming, false) : null,
                    'draft' => $draft ? $this->policies->present($draft->load('editor'), false) + [
                        'updated_by' => $draft->editor ? trim($draft->editor->first_name.' '.$draft->editor->last_name) : null,
                    ] : null,
                    'version_count' => $this->policies->history($slug)->count(),
                ];
            })->values(),
            'tokens' => PolicyRegistry::OFFICE_TOKENS,
        ]);
    }

    public function show(string $policy): JsonResponse
    {
        $this->assertKnown($policy);
        $draft = $this->policies->draft($policy);

        return response()->json([
            'policy' => ['slug' => $policy, 'title' => PolicyRegistry::title($policy)],
            'current' => $this->policies->present($this->policies->current($policy) ?? $this->policies->builtinVersion($policy)),
            'draft' => $draft ? $this->policies->present($draft) : null,
            'versions' => $this->policies->history($policy)->each->load('publisher')->map(fn (PolicyVersion $version) => $this->policies->present($version, false))->values(),
            'tokens' => PolicyRegistry::OFFICE_TOKENS,
        ]);
    }

    public function version(string $policy, int $version): JsonResponse
    {
        $this->assertKnown($policy);
        $row = $this->policies->version($policy, $version);
        abort_unless($row, 404);

        return response()->json(['version' => $this->policies->present($row)]);
    }

    public function startDraft(Request $request, string $policy): JsonResponse
    {
        $this->assertKnown($policy);
        $admin = $this->admin($request);
        $existing = $this->policies->draft($policy);
        $draft = $this->policies->startDraft($policy, $admin);

        if (! $existing) {
            ActivityLogger::logAs($admin, 'policy_draft_started', sprintf('Started a new version of the %s (version %d, draft).', PolicyRegistry::title($policy), $draft->version));
        }

        return response()->json(['message' => 'Draft ready. Nothing changes for readers until you publish it.', 'draft' => $this->policies->present($draft)], $existing ? 200 : 201);
    }

    public function saveDraft(Request $request, string $policy): JsonResponse
    {
        $this->assertKnown($policy);
        $admin = $this->admin($request);
        $draft = $this->policies->draft($policy);
        abort_unless($draft, 404, 'There is no draft for this policy. Start a new version first.');

        $data = $request->validate([
            'summary' => ['nullable', 'array'],
            'summary.title' => ['nullable', 'string', 'max:60'],
            'summary.body' => ['nullable', 'string', 'max:1500'],
            'sections' => ['required', 'array', 'min:1', 'max:30'],
            'sections.*.id' => ['nullable', 'string', 'max:80'],
            'sections.*.title' => ['required', 'string', 'max:120'],
            'sections.*.body' => ['required', 'string', 'max:8000'],
            'change_note' => ['nullable', 'string', 'max:200'],
        ], [], [
            'sections.*.title' => 'section heading',
            'sections.*.body' => 'section text',
            'change_note' => 'what changed',
        ]);

        $this->policies->saveDraft($draft, $data, $admin);
        ActivityLogger::logAs($admin, 'policy_draft_saved', sprintf('Saved the draft of the %s (version %d).', PolicyRegistry::title($policy), $draft->version));

        return response()->json(['message' => 'Draft saved.', 'draft' => $this->policies->present($draft->fresh())]);
    }

    public function publish(Request $request, string $policy): JsonResponse
    {
        $this->assertKnown($policy);
        $admin = $this->admin($request);
        $draft = $this->policies->draft($policy);
        abort_unless($draft, 404, 'There is no draft for this policy.');

        $data = $request->validate([
            'effective_at' => ['required', 'date', 'after_or_equal:'.Carbon::today()->toDateString()],
        ], ['effective_at.after_or_equal' => 'The effective date cannot be in the past.']);

        $this->policies->publish($draft, $data['effective_at'], $admin);
        $title = PolicyRegistry::title($policy);
        ActivityLogger::logAs($admin, 'policy_published', sprintf(
            'Published version %d of the %s, effective %s: %s',
            $draft->version,
            $title,
            $draft->effective_at->format('F j, Y'),
            $draft->change_note
        ));

        $effectiveNow = ! $draft->effective_at->isAfter(Carbon::today());

        return response()->json([
            'message' => $effectiveNow
                ? "Version {$draft->version} of the {$title} is now in effect."
                : "Version {$draft->version} is published and takes effect on {$draft->effective_at->format('F j, Y')}. Until then readers see the current version with a notice.",
            'version' => $this->policies->present($draft->fresh()),
        ]);
    }

    public function discardDraft(Request $request, string $policy): JsonResponse
    {
        $this->assertKnown($policy);
        $admin = $this->admin($request);
        $draft = $this->policies->draft($policy);
        abort_unless($draft, 404, 'There is no draft for this policy.');

        $version = $draft->version;
        $draft->delete();
        ActivityLogger::logAs($admin, 'policy_draft_discarded', sprintf('Discarded the draft of the %s (version %d).', PolicyRegistry::title($policy), $version));

        return response()->json(['message' => 'Draft discarded.']);
    }

    private function assertKnown(string $policy): void
    {
        abort_unless(PolicyRegistry::exists($policy), 404);
    }

    private function admin(Request $request): Administrator
    {
        $admin = $request->user();
        abort_unless($admin instanceof Administrator, 403, 'Administrator account required.');

        return $admin;
    }
}
