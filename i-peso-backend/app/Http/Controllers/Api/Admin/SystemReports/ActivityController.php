<?php
// i-peso-backend/app/Http/Controllers/Api/Admin/SystemReports/ActivityController.php

namespace App\Http\Controllers\Api\Admin\SystemReports;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = ActivityLog::query();

        if ($request->has('action') && $request->action) {
            $query->where('action', $request->action);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->latest('created_at')->paginate($request->get('per_page', 20));

        return response()->json($logs);
    }
}
