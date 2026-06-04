<?php
// i-peso-backend/app/Http/Controllers/Api/Admin/AdminSeekerController.php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Models\SeekerDisability;
use App\Models\SeekerLanguage;
use App\Models\SeekerOccupation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSeekerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = JobSeeker::query();

        // Search by name or email
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%$search%")
                  ->orWhere('last_name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
            });
        }

        // Filter by profile completion
        if ($request->has('profile_completed')) {
            $query->where('profile_completed', (bool)$request->profile_completed);
        }

        // Filter by province
        if ($request->has('province') && $request->province) {
            $query->where('address_province', $request->province);
        }

        $seekers = $query->paginate($request->get('per_page', 15));

        return response()->json($seekers);
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $seeker = JobSeeker::with([
            'disabilities' => function($q) { $q->select('disability_id', 'seeker_id', 'disability_type', 'disability_specification'); },
            'languages' => function($q) { $q->select('lang_id', 'seeker_id', 'language', 'read', 'write', 'speak', 'understand'); },
            'occupations' => function($q) { $q->select('occ_id', 'seeker_id', 'occupation_title'); },
        ])->findOrFail($id);

        return response()->json($seeker);
    }

    public function verify(Request $request, int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'remarks' => 'nullable|string',
        ]);

        $seeker = JobSeeker::findOrFail($id);

        if ($validated['action'] === 'approve') {
            $seeker->update([
                'is_verified' => true,
                'verified_at' => now(),
                'verified_by' => $admin->admin_id,
                'verification_remarks' => $validated['remarks'] ?? null,
            ]);

            return response()->json([
                'message' => 'Seeker profile approved',
                'seeker' => $seeker,
            ]);
        } else {
            $seeker->update([
                'is_verified' => false,
                'verified_at' => now(),
                'verified_by' => $admin->admin_id,
                'verification_remarks' => $validated['remarks'] ?? null,
            ]);

            return response()->json([
                'message' => 'Seeker profile rejected',
                'seeker' => $seeker,
            ]);
        }
    }

    public function verificationQueue(): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $seekers = JobSeeker::where('profile_completed', true)
            ->where('is_verified', false)
            ->paginate(15);

        return response()->json($seekers);
    }
}
