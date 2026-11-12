<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Admin\Configuration\AnnouncementController;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Services\AnnouncementService;
use App\Support\AnnouncementPresenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * What a signed-in job seeker or employer sees: live announcements addressed
 * to Public, All users, or their own role. Shared by both roles (and the
 * seeker mobile app) so the visibility rule lives in exactly one place.
 */
class AnnouncementFeedController extends Controller
{
    private const BANNER_LIMIT = 3;

    public function __construct(private readonly AnnouncementService $announcements)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $reader = $this->reader($request);
        $validated = $request->validate([
            'category' => ['nullable', Rule::in(array_keys(Announcement::CATEGORIES))],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Announcement::query()->live()->visibleTo($reader)->feedOrder();
        if (! empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        $page = $query->paginate($validated['per_page'] ?? 20);
        $reads = $this->announcements->readRowsFor($reader, collect($page->items())->pluck('id'));

        return response()->json([
            'data' => collect($page->items())
                ->map(fn (Announcement $announcement) => AnnouncementPresenter::forReader($announcement, $reads->get($announcement->id)))
                ->values(),
            'unread_count' => $this->unreadCount($reader),
            'total' => $page->total(),
            'last_page' => $page->lastPage(),
            'current_page' => $page->currentPage(),
        ]);
    }

    /** Dashboard banner: undismissed Important/Urgent announcements, urgent first. */
    public function banner(Request $request): JsonResponse
    {
        $reader = $this->reader($request);

        $announcements = Announcement::query()->live()->visibleTo($reader)
            ->whereIn('priority', ['urgent', 'important'])
            ->whereNotExists(fn ($q) => $q->selectRaw('1')
                ->from('announcement_reads')
                ->whereColumn('announcement_reads.announcement_id', 'announcements.id')
                ->where('announcement_reads.reader_type', $reader->getMorphClass())
                ->where('announcement_reads.reader_id', $reader->getKey())
                ->whereNotNull('announcement_reads.dismissed_at'))
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 ELSE 1 END")
            ->feedOrder()
            ->limit(self::BANNER_LIMIT)
            ->get();

        $reads = $this->announcements->readRowsFor($reader, $announcements->pluck('id'));

        return response()->json([
            'data' => $announcements->map(fn (Announcement $announcement) => AnnouncementPresenter::forReader($announcement, $reads->get($announcement->id)))->values(),
            'unread_count' => $this->unreadCount($reader),
        ]);
    }

    public function unread(Request $request): JsonResponse
    {
        return response()->json(['unread_count' => $this->unreadCount($this->reader($request))]);
    }

    /** Opening an announcement marks it read for this reader. */
    public function show(Request $request, Announcement $announcement): JsonResponse
    {
        $reader = $this->reader($request);
        abort_unless($announcement->isVisibleTo($reader), 404);

        $read = $this->announcements->markRead($announcement, $reader);

        return response()->json([
            'announcement' => AnnouncementPresenter::forReader($announcement, $read),
            'unread_count' => $this->unreadCount($reader),
        ]);
    }

    public function dismiss(Request $request, Announcement $announcement): JsonResponse
    {
        $reader = $this->reader($request);
        abort_unless($announcement->isVisibleTo($reader), 404);

        $read = $this->announcements->dismiss($announcement, $reader);

        return response()->json([
            'message' => 'Announcement dismissed.',
            'announcement' => AnnouncementPresenter::forReader($announcement, $read),
        ]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $reader = $this->reader($request);
        $ids = Announcement::query()->live()->visibleTo($reader)->pluck('id');
        $existing = $this->announcements->readRowsFor($reader, $ids);
        $now = now();

        foreach ($ids as $id) {
            $row = $existing->get($id);
            if ($row?->read_at) {
                continue;
            }
            AnnouncementRead::updateOrCreate(
                ['announcement_id' => $id, 'reader_type' => $reader->getMorphClass(), 'reader_id' => $reader->getKey()],
                ['read_at' => $now],
            );
        }

        return response()->json(['message' => 'All announcements marked as read.', 'unread_count' => 0]);
    }

    public function attachment(Request $request, Announcement $announcement): StreamedResponse
    {
        abort_unless($announcement->isVisibleTo($this->reader($request)), 404);
        abort_unless($announcement->attachment_path && Storage::disk('local')->exists($announcement->attachment_path), 404);

        return AnnouncementController::streamAttachment($announcement);
    }

    private function unreadCount(Model $reader): int
    {
        return Announcement::query()->live()->visibleTo($reader)
            ->whereNotExists(fn ($q) => $q->selectRaw('1')
                ->from('announcement_reads')
                ->whereColumn('announcement_reads.announcement_id', 'announcements.id')
                ->where('announcement_reads.reader_type', $reader->getMorphClass())
                ->where('announcement_reads.reader_id', $reader->getKey())
                ->whereNotNull('announcement_reads.read_at'))
            ->count();
    }

    private function reader(Request $request): Model
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker || $user instanceof Employer, 403, 'Job seeker or employer account required.');

        return $user;
    }
}
