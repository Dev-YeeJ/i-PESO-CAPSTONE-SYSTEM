<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Admin\Configuration\AnnouncementController;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Support\AnnouncementPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Landing page: live announcements with the Public audience only. No login. */
class PublicAnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = max(1, min((int) $request->integer('limit', 6), 12));

        $announcements = Announcement::query()->live()->visibleTo(null)->feedOrder()->limit($limit)->get();

        return response()->json([
            'data' => $announcements->map(fn (Announcement $announcement) => AnnouncementPresenter::forPublic($announcement))->values(),
        ]);
    }

    public function attachment(Announcement $announcement): StreamedResponse
    {
        abort_unless($announcement->isVisibleTo(null), 404);
        abort_unless($announcement->attachment_path && Storage::disk('local')->exists($announcement->attachment_path), 404);

        return AnnouncementController::streamAttachment($announcement);
    }
}
