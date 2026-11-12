<?php

namespace App\Http\Controllers\Api\Admin\Configuration;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\SiteContentRevision;
use App\Services\ActivityLogger;
use App\Services\SiteContentService;
use App\Support\SiteContentRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Configuration → Site Content: Office info and Landing page text.
 * Route group: admin.permission:configuration (reads need view, writes full access).
 */
class SiteContentController extends Controller
{
    public function __construct(private readonly SiteContentService $content)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'sections' => collect(SiteContentRegistry::KEYS)->mapWithKeys(fn (string $key) => [$key => $this->section($key)]),
            'feature_icons' => SiteContentRegistry::FEATURE_ICONS,
        ]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $this->assertKnown($key);
        $admin = $this->admin($request);

        $validated = $request->validate([
            'version' => ['required', 'integer', 'min:0'],
            'values' => ['required', 'array'],
            ...SiteContentRegistry::rules($key),
        ], [], SiteContentRegistry::attributes($key));

        $result = $this->content->save($key, $validated['values'], $admin, (int) $validated['version']);

        if ($result['changed']) {
            ActivityLogger::logAs($admin, 'site_content_updated', sprintf(
                'Updated %s (%s).',
                $this->sectionName($key),
                $this->changedList($key, $result['changed'])
            ));
        }

        return response()->json([
            'message' => $result['changed'] ? 'Changes saved. They are live now.' : 'Nothing changed.',
            'section' => $this->section($key),
        ]);
    }

    public function reset(Request $request, string $key): JsonResponse
    {
        $this->assertKnown($key);
        $admin = $this->admin($request);

        $validated = $request->validate([
            'version' => ['required', 'integer', 'min:0'],
            'fields' => ['nullable', 'array'],
            'fields.*' => [Rule::in(SiteContentRegistry::fields($key))],
        ]);

        $result = $this->content->reset($key, $validated['fields'] ?? null, $admin, (int) $validated['version']);

        ActivityLogger::logAs($admin, 'site_content_reset', sprintf(
            'Reset %s to the default%s.',
            $this->sectionName($key),
            $result['changed'] ? ' ('.$this->changedList($key, $result['changed']).')' : ''
        ));

        return response()->json([
            'message' => 'Reset to the default text.',
            'section' => $this->section($key),
        ]);
    }

    public function revisions(string $key): JsonResponse
    {
        $this->assertKnown($key);

        return response()->json([
            'revisions' => $this->content->revisions(SiteContentRevision::TYPE_SECTION, $key)
                ->map(fn (SiteContentRevision $revision) => $this->presentRevision($key, $revision))
                ->values(),
            'labels' => SiteContentRegistry::labels($key),
        ]);
    }

    public function restore(Request $request, string $key, SiteContentRevision $revision): JsonResponse
    {
        $this->assertKnown($key);
        abort_unless($revision->content_type === SiteContentRevision::TYPE_SECTION && $revision->content_key === $key, 404);
        $admin = $this->admin($request);

        $version = (int) $request->validate(['version' => ['required', 'integer', 'min:0']])['version'];
        $values = array_intersect_key($revision->value ?? [], array_flip(SiteContentRegistry::fields($key)));

        $result = $this->content->save($key, $values, $admin, $version, 'restored');

        ActivityLogger::logAs($admin, 'site_content_restored', sprintf(
            'Restored %s to the version saved %s.',
            $this->sectionName($key),
            $revision->created_at?->timezone('Asia/Manila')->format('M j, Y g:i A') ?? 'earlier'
        ));

        return response()->json([
            'message' => $result['changed'] ? 'Earlier version restored.' : 'That version is the same as the current one.',
            'section' => $this->section($key),
        ]);
    }

    private function section(string $key): array
    {
        $row = $this->content->row($key);

        return [
            'key' => $key,
            'values' => $this->content->get($key),
            'defaults' => SiteContentRegistry::defaults($key),
            'labels' => SiteContentRegistry::labels($key),
            'version' => $row?->version ?? 0,
            'updated_at' => $row?->updated_at?->toIso8601String(),
            'updated_by' => $row?->editor ? trim($row->editor->first_name.' '.$row->editor->last_name) : null,
        ];
    }

    private function presentRevision(string $key, SiteContentRevision $revision): array
    {
        return [
            'id' => $revision->id,
            'action' => $revision->action,
            'changed_fields' => $revision->changed_fields ?? [],
            'changed_labels' => collect($revision->changed_fields ?? [])->map(fn ($field) => SiteContentRegistry::labels($key)[$field] ?? $field)->values(),
            'value' => $revision->value,
            'created_at' => $revision->created_at?->toIso8601String(),
            'author' => $revision->author ? trim($revision->author->first_name.' '.$revision->author->last_name) : null,
        ];
    }

    private function sectionName(string $key): string
    {
        return $key === SiteContentRegistry::OFFICE ? 'office information' : 'landing page text';
    }

    private function changedList(string $key, array $fields): string
    {
        $labels = SiteContentRegistry::labels($key);

        return collect($fields)->map(fn ($field) => strtolower($labels[$field] ?? $field))->implode(', ');
    }

    private function assertKnown(string $key): void
    {
        abort_unless(SiteContentRegistry::exists($key), 404);
    }

    private function admin(Request $request): Administrator
    {
        $admin = $request->user();
        abort_unless($admin instanceof Administrator, 403, 'Administrator account required.');

        return $admin;
    }
}
