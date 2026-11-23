<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HidesRetiredNotifications;
use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SeekerNotificationController extends Controller
{
    use HidesRetiredNotifications;

    /** Get a bounded notification page only when the bell is opened. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker, 403, 'Seeker account required.');

        $perPage = max(1, min((int) $request->integer('per_page', 20), 50));
        $notifications = $this->visible($user->notifications())->latest()->paginate($perPage);
        
        return response()->json([
            'notifications' => $notifications->items(),
            'unread_count' => $this->visible($user->unreadNotifications())->count(),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker, 403, 'Seeker account required.');

        return response()->json([
            'unread_count' => $this->visible($user->unreadNotifications())->count(),
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
