<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Occupation;
use App\Models\OccupationAlias;
use App\Models\OccupationTitleCandidate;
use App\Models\SeekerOccupation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OccupationMappingController extends Controller
{
    public function pending(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $preferences = SeekerOccupation::query()
            ->with('seeker:seeker_id,first_name,middle_name,last_name,email')
            ->where('status', 'custom_pending')
            ->orderBy('created_at')
            ->paginate($validated['per_page'] ?? 25);

        return response()->json($preferences);
    }

    public function map(Request $request, SeekerOccupation $preference): JsonResponse
    {
        $validated = $request->validate([
            'occupation_id' => ['required', 'integer', 'exists:occupations,id'],
            'create_alias' => ['sometimes', 'boolean'],
            'alias_language' => ['nullable', 'string', 'max:10'],
        ]);

        if ($preference->status !== 'custom_pending' || ! $preference->raw_job_title) {
            return response()->json([
                'message' => 'Only pending custom occupation titles can be mapped.',
            ], 422);
        }

        $occupation = Occupation::query()
            ->where('is_active', true)
            ->findOrFail($validated['occupation_id']);

        DB::transaction(function () use ($preference, $occupation, $validated) {
            $preference->update([
                'occupation_id' => $occupation->id,
                'occupation_title' => $occupation->title,
                'status' => 'admin_mapped',
                'mapped_at' => now(),
            ]);

            if ($validated['create_alias'] ?? true) {
                $alias = Str::of($preference->raw_job_title)->squish()->toString();

                OccupationAlias::updateOrCreate(
                    [
                        'occupation_id' => $occupation->id,
                        'normalized_alias' => Str::lower($alias),
                        'language' => $validated['alias_language'] ?? 'en',
                    ],
                    [
                        'alias' => $alias,
                        'source' => 'admin_mapped',
                        'confidence' => 1,
                    ]
                );
            }
        });

        return response()->json([
            'message' => 'Custom occupation mapped successfully.',
            'preference' => $preference->fresh('occupation'),
        ]);
    }

    public function candidates(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'status' => ['nullable', 'in:pending,alias_created,mapped,rejected'],
        ]);

        $candidates = OccupationTitleCandidate::query()
            ->with('suggestedOccupation:id,title,classification_code,isco_group,source')
            ->where('status', $validated['status'] ?? 'pending')
            ->orderByDesc('occurrences')
            ->orderBy('raw_title')
            ->paginate($validated['per_page'] ?? 25);

        return response()->json($candidates);
    }

    public function mapCandidate(
        Request $request,
        OccupationTitleCandidate $candidate
    ): JsonResponse {
        $validated = $request->validate([
            'occupation_id' => ['required', 'integer', 'exists:occupations,id'],
            'create_alias' => ['sometimes', 'boolean'],
            'alias_language' => ['nullable', 'string', 'max:10'],
        ]);

        if ($candidate->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending job-title candidates can be mapped.',
            ], 422);
        }

        $occupation = Occupation::query()
            ->where('is_active', true)
            ->findOrFail($validated['occupation_id']);

        DB::transaction(function () use ($candidate, $occupation, $validated) {
            $createAlias = $validated['create_alias'] ?? true;

            if ($createAlias) {
                OccupationAlias::updateOrCreate(
                    [
                        'occupation_id' => $occupation->id,
                        'normalized_alias' => $candidate->normalized_title,
                        'language' => $validated['alias_language'] ?? 'en',
                    ],
                    [
                        'alias' => $candidate->raw_title,
                        'source' => 'jobdatalake_reviewed',
                        'confidence' => 1,
                    ]
                );
            }

            $candidate->update([
                'suggested_occupation_id' => $occupation->id,
                'status' => $createAlias ? 'alias_created' : 'mapped',
                'match_reason' => 'admin_review',
                'match_confidence' => 1,
                'reviewed_at' => now(),
            ]);
        });

        return response()->json([
            'message' => 'JobDataLake title mapped successfully.',
            'candidate' => $candidate->fresh('suggestedOccupation'),
        ]);
    }

    public function rejectCandidate(OccupationTitleCandidate $candidate): JsonResponse
    {
        if ($candidate->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending job-title candidates can be rejected.',
            ], 422);
        }

        $candidate->update([
            'status' => 'rejected',
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'JobDataLake title rejected.',
            'candidate' => $candidate->fresh(),
        ]);
    }
}
