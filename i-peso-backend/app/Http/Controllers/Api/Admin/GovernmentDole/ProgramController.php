<?php
// i-peso-backend/app/Http/Controllers/Api/Admin/GovernmentDole/ProgramController.php

namespace App\Http\Controllers\Api\Admin\GovernmentDole;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\GovernmentProgram;
use App\Models\ProgramApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProgramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = GovernmentProgram::query();

        if ($request->has('search') && $request->search) {
            $query->where('program_name', 'like', '%' . $request->search . '%');
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $programs = $query->paginate($request->get('per_page', 15));

        return response()->json($programs);
    }

    public function store(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'program_name' => 'required|string|max:255',
            'description' => 'required|string',
            'target_beneficiaries' => 'required|string',
            'schedule' => 'required|date',
            'slot_limit' => 'required|integer|min:1',
            'status' => 'required|in:open,closed,ongoing,completed',
        ]);

        $validated['admin_id'] = $admin->admin_id;

        $program = GovernmentProgram::create($validated);

        return response()->json([
            'message' => 'Program created successfully',
            'program' => $program,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $program = GovernmentProgram::findOrFail($id);

        return response()->json($program);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $program = GovernmentProgram::findOrFail($id);

        $validated = $request->validate([
            'program_name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'target_beneficiaries' => 'sometimes|string',
            'schedule' => 'sometimes|date',
            'slot_limit' => 'sometimes|integer|min:1',
            'status' => 'sometimes|in:open,closed,ongoing,completed',
        ]);

        $program->update($validated);

        return response()->json([
            'message' => 'Program updated successfully',
            'program' => $program,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $program = GovernmentProgram::findOrFail($id);
        $program->delete();

        return response()->json(['message' => 'Program deleted successfully']);
    }

    public function applicants(Request $request, int $programId): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $program = GovernmentProgram::findOrFail($programId);

        $query = ProgramApplication::where('program_id', $programId)
            ->with(['seeker', 'program']);

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $applicants = $query->paginate($request->get('per_page', 15));

        return response()->json($applicants);
    }

    public function reviewApplicant(Request $request, int $programId, int $applicantId): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'remarks' => 'nullable|string',
        ]);

        $application = ProgramApplication::where('program_id', $programId)
            ->where('prog_apply_id', $applicantId)
            ->firstOrFail();

        $application->update([
            'status' => $validated['action'] === 'approve' ? 'approved' : 'rejected',
            'admin_remarks' => $validated['remarks'] ?? $application->admin_remarks,
        ]);

        return response()->json([
            'message' => 'Application reviewed',
            'application' => $application,
        ]);
    }

    public function bulkReview(Request $request, int $programId): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'action' => 'required|in:approve,reject',
            'remarks' => 'nullable|string',
        ]);

        $newStatus = $validated['action'] === 'approve' ? 'approved' : 'rejected';

        ProgramApplication::where('program_id', $programId)
            ->whereIn('prog_apply_id', $validated['ids'])
            ->update([
                'status' => $newStatus,
                'admin_remarks' => $validated['remarks'] ?? null,
            ]);

        return response()->json(['message' => 'Bulk review completed']);
    }
}
