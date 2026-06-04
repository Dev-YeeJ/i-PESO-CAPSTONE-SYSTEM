<?php
// i-peso-backend/app/Http/Controllers/Api/Admin/GovernmentDole/JobFairController.php

namespace App\Http\Controllers\Api\Admin\GovernmentDole;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\JobFair;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobFairController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = JobFair::query();

        if ($request->has('search') && $request->search) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $fairs = $query->paginate($request->get('per_page', 15));

        return response()->json($fairs);
    }

    public function store(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'venue' => 'required|string|max:255',
            'event_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'status' => 'required|in:upcoming,ongoing,completed,cancelled',
        ]);

        $validated['admin_id'] = $admin->admin_id;

        $fair = JobFair::create($validated);

        return response()->json([
            'message' => 'Job Fair created successfully',
            'job_fair' => $fair,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $fair = JobFair::findOrFail($id);

        return response()->json($fair);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $fair = JobFair::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'venue' => 'sometimes|string|max:255',
            'event_date' => 'sometimes|date',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i',
            'status' => 'sometimes|in:upcoming,ongoing,completed,cancelled',
        ]);

        $fair->update($validated);

        return response()->json([
            'message' => 'Job Fair updated successfully',
            'job_fair' => $fair,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $fair = JobFair::findOrFail($id);
        $fair->delete();

        return response()->json(['message' => 'Job Fair deleted successfully']);
    }
}
