<?php

namespace App\Http\Controllers\Api\Admin\Configuration;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Announcement;
use App\Services\ActivityLogger;
use App\Services\AnnouncementService;
use App\Support\AnnouncementPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Admin workspace for PESO announcements (Configuration → Announcements).
 * Route group: admin.permission:configuration — reads need view, writes full access.
 * See docs/announcement-module-plan.md for the lifecycle these actions implement.
 */
class AnnouncementController extends Controller
{
    private const DISK = 'local';

    public function __construct(private readonly AnnouncementService $announcements)
    {
    }

    public function options(): JsonResponse
    {
        $counts = $this->announcements->audienceCounts();
        $pairs = fn (array $map) => collect($map)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values();

        return response()->json([
            'categories' => $pairs(Announcement::CATEGORIES),
            'priorities' => $pairs(Announcement::PRIORITIES),
            'audiences' => collect(Announcement::AUDIENCES)->map(fn ($label, $value) => [
                'value' => $value,
                'label' => $label,
                'count' => $counts[$value] ?? 0,
            ])->values(),
            'states' => $pairs(Announcement::STATE_LABELS),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'state' => ['nullable', Rule::in(['all', ...array_keys(Announcement::STATE_LABELS)])],
            'audience' => ['nullable', Rule::in(array_keys(Announcement::AUDIENCES))],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Announcement::query()->with(['creator:admin_id,first_name,last_name', 'editor:admin_id,first_name,last_name', 'publisher:admin_id,first_name,last_name']);

        if (($validated['state'] ?? 'all') !== 'all') {
            Announcement::applyStateFilter($query, $validated['state']);
        }
        if (! empty($validated['audience'])) {
            $query->where('audience', $validated['audience']);
        }
        if (! empty($validated['search'])) {
            $term = '%'.$validated['search'].'%';
            $query->where(fn ($q) => $q->where('title', 'like', $term)->orWhere('body', 'like', $term));
        }

        $page = $query->orderByDesc('is_pinned')->orderByDesc('updated_at')->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 15);

        $seen = $this->announcements->seenCounts(collect($page->items())->pluck('id'));
        $counts = $this->announcements->audienceCounts();

        return response()->json([
            'data' => collect($page->items())->map(function (Announcement $announcement) use ($seen, $counts) {
                $row = AnnouncementPresenter::forAdmin($announcement, $seen[$announcement->id] ?? 0);
                $row['targeted'] = $counts[$announcement->audience] ?? 0;

                return $row;
            })->values(),
            'total' => $page->total(),
            'last_page' => $page->lastPage(),
            'current_page' => $page->currentPage(),
            'from' => $page->firstItem(),
            'to' => $page->lastItem(),
            'summary' => $this->summary(),
        ]);
    }

    public function show(Announcement $announcement): JsonResponse
    {
        return response()->json(['announcement' => $this->detail($announcement)]);
    }

    public function store(Request $request): JsonResponse
    {
        $admin = $this->admin($request);
        $data = $this->validated($request);
        $intent = $request->validate(['intent' => ['nullable', Rule::in(['draft', 'publish'])]])['intent'] ?? 'draft';

        $announcement = new Announcement([
            ...$data['fields'],
            'status' => Announcement::STATUS_DRAFT,
            'created_by' => $admin->admin_id,
            'updated_by' => $admin->admin_id,
        ]);
        $this->applyAttachment($request, $announcement);
        $announcement->save();

        ActivityLogger::logAs($admin, 'announcement_created', sprintf('Created announcement #%d "%s" (%s).', $announcement->id, $announcement->title, $announcement->audience));

        if ($intent === 'publish') {
            $this->publishNow($announcement, $admin);
        }

        return response()->json([
            'message' => $this->savedMessage($announcement),
            'announcement' => $this->detail($announcement->fresh()),
        ], 201);
    }

    public function update(Request $request, Announcement $announcement): JsonResponse
    {
        $admin = $this->admin($request);
        $data = $this->validated($request, $announcement);
        $intent = $request->validate(['intent' => ['nullable', Rule::in(['save', 'publish'])]])['intent'] ?? 'save';

        $announcement->fill([...$data['fields'], 'updated_by' => $admin->admin_id]);

        // A published announcement keeps its timing honest: clearing the
        // planned time on a live/scheduled one means "publish it now".
        if ($announcement->status === Announcement::STATUS_PUBLISHED && $announcement->publish_at === null) {
            $announcement->publish_at = now();
        }
        $this->assertTimingIsValid($announcement, $announcement->status === Announcement::STATUS_PUBLISHED);

        $this->applyAttachment($request, $announcement);
        $announcement->save();

        ActivityLogger::logAs($admin, 'announcement_updated', sprintf('Edited announcement #%d "%s".', $announcement->id, $announcement->title));

        if ($intent === 'publish' && $announcement->status !== Announcement::STATUS_PUBLISHED) {
            $this->publishNow($announcement, $admin);
        } else {
            // e.g. "Also notify" switched on for something already live.
            $this->announcements->deliverAfterResponse($announcement->fresh());
        }

        return response()->json([
            'message' => $intent === 'publish' ? $this->savedMessage($announcement->fresh()) : 'Announcement saved.',
            'announcement' => $this->detail($announcement->fresh()),
        ]);
    }

    public function publish(Request $request, Announcement $announcement): JsonResponse
    {
        $admin = $this->admin($request);
        abort_if($announcement->status === Announcement::STATUS_PUBLISHED, 422, 'This announcement is already published.');
        abort_if($announcement->status === Announcement::STATUS_ARCHIVED, 422, 'Restore this announcement before publishing it.');

        $this->publishNow($announcement, $admin);

        return response()->json([
            'message' => $this->savedMessage($announcement->fresh()),
            'announcement' => $this->detail($announcement->fresh()),
        ]);
    }

    public function unpublish(Request $request, Announcement $announcement): JsonResponse
    {
        $admin = $this->admin($request);
        abort_unless($announcement->status === Announcement::STATUS_PUBLISHED, 422, 'Only a scheduled or live announcement can be unpublished.');

        $announcement->update(['status' => Announcement::STATUS_DRAFT, 'updated_by' => $admin->admin_id]);
        ActivityLogger::logAs($admin, 'announcement_unpublished', sprintf('Unpublished announcement #%d "%s" (back to draft).', $announcement->id, $announcement->title));

        return response()->json([
            'message' => 'Announcement unpublished. It is hidden from readers and saved as a draft.',
            'announcement' => $this->detail($announcement->fresh()),
        ]);
    }

    public function archive(Request $request, Announcement $announcement): JsonResponse
    {
        $admin = $this->admin($request);
        abort_if($announcement->status === Announcement::STATUS_ARCHIVED, 422, 'This announcement is already archived.');

        $announcement->update(['status' => Announcement::STATUS_ARCHIVED, 'updated_by' => $admin->admin_id]);
        ActivityLogger::logAs($admin, 'announcement_archived', sprintf('Archived announcement #%d "%s".', $announcement->id, $announcement->title));

        return response()->json([
            'message' => 'Announcement archived. Readers no longer see it; its record and reach are kept.',
            'announcement' => $this->detail($announcement->fresh()),
        ]);
    }

    public function restore(Request $request, Announcement $announcement): JsonResponse
    {
        $admin = $this->admin($request);
        abort_unless($announcement->status === Announcement::STATUS_ARCHIVED, 422, 'Only an archived announcement can be restored.');

        $announcement->update(['status' => Announcement::STATUS_DRAFT, 'updated_by' => $admin->admin_id]);
        ActivityLogger::logAs($admin, 'announcement_restored', sprintf('Restored announcement #%d "%s" to draft.', $announcement->id, $announcement->title));

        return response()->json([
            'message' => 'Announcement restored as a draft.',
            'announcement' => $this->detail($announcement->fresh()),
        ]);
    }

    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $admin = $this->admin($request);
        abort_unless($announcement->canBeDeleted(), 422, 'Announcements that were published stay on record. Archive it instead.');

        if ($announcement->attachment_path) {
            Storage::disk(self::DISK)->delete($announcement->attachment_path);
        }
        $title = $announcement->title;
        $id = $announcement->id;
        $announcement->delete();

        ActivityLogger::logAs($admin, 'announcement_deleted', sprintf('Deleted draft announcement #%d "%s".', $id, $title));

        return response()->json(['message' => 'Draft deleted.']);
    }

    public function attachment(Announcement $announcement): StreamedResponse
    {
        abort_unless($announcement->attachment_path && Storage::disk(self::DISK)->exists($announcement->attachment_path), 404);

        return $this->streamAttachment($announcement);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    public static function streamAttachment(Announcement $announcement): StreamedResponse
    {
        return Storage::disk(self::DISK)->response(
            $announcement->attachment_path,
            $announcement->attachment_name,
            [
                'Content-Type' => $announcement->attachment_mime ?: 'application/octet-stream',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, max-age=300',
            ],
            'inline',
        );
    }

    /** @return array{fields: array<string, mixed>} */
    private function validated(Request $request, ?Announcement $existing = null): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:5000'],
            'category' => ['required', Rule::in(array_keys(Announcement::CATEGORIES))],
            'priority' => ['required', Rule::in(array_keys(Announcement::PRIORITIES))],
            'audience' => ['required', Rule::in(array_keys(Announcement::AUDIENCES))],
            'is_pinned' => ['nullable', 'boolean'],
            'notify_users' => ['nullable', 'boolean'],
            'publish_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'link_label' => ['nullable', 'string', 'max:60', 'required_with:link_url'],
            // Internal app path (/seeker/job-fairs) or an https:// link — never
            // javascript:, data: or plain http:.
            'link_url' => ['nullable', 'string', 'max:500', 'regex:#^(/(?!/)[^\s]*|https://[^\s]+)$#i'],
            'attachment' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'remove_attachment' => ['nullable', 'boolean'],
        ], [
            'link_url.regex' => 'Use an i-PESO page path that starts with "/" (for example /seeker/job-fairs) or a full https:// link.',
            'link_label.required_with' => 'Add a button label for the link.',
        ]);

        $publishAt = filled($validated['publish_at'] ?? null) ? Carbon::parse($validated['publish_at']) : null;
        $expiresAt = filled($validated['expires_at'] ?? null) ? Carbon::parse($validated['expires_at']) : null;

        if ($publishAt && $expiresAt && $expiresAt->lessThanOrEqualTo($publishAt)) {
            throw ValidationException::withMessages(['expires_at' => 'The end date must be after the publish date.']);
        }

        return ['fields' => [
            'title' => trim($validated['title']),
            'body' => trim($validated['body']),
            'category' => $validated['category'],
            'priority' => $validated['priority'],
            'audience' => $validated['audience'],
            'is_pinned' => (bool) ($validated['is_pinned'] ?? false),
            'notify_users' => (bool) ($validated['notify_users'] ?? false),
            'publish_at' => $publishAt,
            'expires_at' => $expiresAt,
            'link_label' => filled($validated['link_url'] ?? null) ? trim((string) $validated['link_label']) : null,
            'link_url' => filled($validated['link_url'] ?? null) ? trim($validated['link_url']) : null,
        ]];
    }

    private function assertTimingIsValid(Announcement $announcement, bool $publishing): void
    {
        if ($publishing && $announcement->expires_at && ! $announcement->expires_at->isFuture()) {
            throw ValidationException::withMessages(['expires_at' => 'The end date has already passed. Pick a later end date or clear it.']);
        }
    }

    /** Draft → published: now, or at the planned time if that's still ahead. */
    private function publishNow(Announcement $announcement, Administrator $admin): void
    {
        if (! $announcement->publish_at || ! $announcement->publish_at->isFuture()) {
            $announcement->publish_at = now();
        }
        $this->assertTimingIsValid($announcement, true);

        $announcement->fill([
            'status' => Announcement::STATUS_PUBLISHED,
            'published_by' => $admin->admin_id,
            'updated_by' => $admin->admin_id,
        ]);
        $announcement->first_published_at ??= $announcement->publish_at;
        $announcement->save();

        $scheduled = $announcement->publish_at->isFuture();
        ActivityLogger::logAs($admin, 'announcement_published', sprintf(
            '%s announcement #%d "%s" for %s%s.',
            $scheduled ? 'Scheduled' : 'Published',
            $announcement->id,
            $announcement->title,
            $announcement->audience,
            $scheduled ? ' at '.$announcement->publish_at->timezone('Asia/Manila')->format('M d, Y h:i A') : ''
        ));

        // Bell + push go out after the response; scheduled ones are picked up
        // by `announcements:deliver-due` once their time arrives.
        $this->announcements->deliverAfterResponse($announcement->fresh());
    }

    private function applyAttachment(Request $request, Announcement $announcement): void
    {
        $remove = $request->boolean('remove_attachment');

        if (($remove || $request->hasFile('attachment')) && $announcement->attachment_path) {
            Storage::disk(self::DISK)->delete($announcement->attachment_path);
            $announcement->fill(['attachment_path' => null, 'attachment_name' => null, 'attachment_mime' => null]);
        }

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $announcement->fill([
                'attachment_path' => $file->store('announcements', self::DISK),
                'attachment_name' => $file->getClientOriginalName(),
                'attachment_mime' => $file->getMimeType(),
            ]);
        }
    }

    private function savedMessage(Announcement $announcement): string
    {
        return match ($announcement->state()) {
            Announcement::STATE_LIVE => $announcement->notify_users && $announcement->notified_at === null
                ? 'Announcement published. Notifications are being sent now.'
                : 'Announcement published.',
            Announcement::STATE_SCHEDULED => 'Announcement scheduled for '.$announcement->publish_at->timezone('Asia/Manila')->format('M d, Y h:i A').'.',
            default => 'Draft saved.',
        };
    }

    private function detail(Announcement $announcement): array
    {
        $announcement->loadMissing(['creator:admin_id,first_name,last_name', 'editor:admin_id,first_name,last_name', 'publisher:admin_id,first_name,last_name']);
        $reach = $this->announcements->reach($announcement);

        return AnnouncementPresenter::forAdmin($announcement, $reach['seen'], $reach);
    }

    /** @return array<string, int> */
    private function summary(): array
    {
        $count = fn (string $state) => Announcement::applyStateFilter(Announcement::query(), $state)->count();

        return [
            'live' => $count(Announcement::STATE_LIVE),
            'scheduled' => $count(Announcement::STATE_SCHEDULED),
            'draft' => $count(Announcement::STATE_DRAFT),
            'expired' => $count(Announcement::STATE_EXPIRED),
            'archived' => $count(Announcement::STATE_ARCHIVED),
            'total' => Announcement::query()->count(),
        ];
    }

    private function admin(Request $request): Administrator
    {
        $admin = $request->user();
        abort_unless($admin instanceof Administrator, 403, 'Administrator account required.');

        return $admin;
    }
}
