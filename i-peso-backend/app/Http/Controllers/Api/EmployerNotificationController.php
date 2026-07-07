<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployerNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $employer = $this->employer($request);
        $perPage = max(1, min((int) $request->integer('per_page', 20), 50));

        $notifications = $employer->notifications()->latest()->paginate($perPage);
        $items = array_map(fn ($notification) => [
            'id' => $notification->id,
            'type' => class_basename($notification->type),
            'data' => $notification->data,
            'read_at' => $notification->read_at,
            'created_at' => $notification->created_at,
        ], $notifications->items());

        return response()->json([
            'notifications' => $items,
            'unread_count' => $employer->unreadNotifications()->count(),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $employer = $this->employer($request);

        return response()->json([
            'unread_count' => $employer->unreadNotifications()->count(),
        ]);
    }

    public function markAsRead(Request $request, string $notification): JsonResponse
    {
        $item = $this->employer($request)->notifications()->findOrFail($notification);
        $item->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $this->employer($request)->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    private function employer(Request $request): Employer
    {
        abort_unless($request->user() instanceof Employer, 403, 'Employer account required.');

        return $request->user();
    }
}
