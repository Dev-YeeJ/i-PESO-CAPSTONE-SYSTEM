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

        $query = JobFair::query()
            ->withCount([
                'employerJoins as employers_count',
                'attendees as rsvps_count',
                'attendees as attendance_count' => fn ($query) => $query->where('is_attended', true),
                'applications as hots_count' => fn ($query) => $query->where('is_hots', true),
                'vacancyLinks as vacancies_count',
            ]);

        if ($request->has('search') && $request->search) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $this->databaseStatus($request->status));
        }

        $fairs = $query
            ->orderByRaw('COALESCE(start_date, event_date) desc')
            ->paginate($request->get('per_page', 15));

        $fairs->getCollection()->transform(fn (JobFair $fair) => $this->formatFair($fair));

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
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'venue' => 'required|string|max:255',
            'sector' => 'required|in:local,overseas,both',
            'event_date' => 'nullable|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'status' => 'required|in:upcoming,active,ongoing,completed,cancelled',
        ]);

        $validated['admin_id'] = $admin->admin_id;
        $validated['created_by'] = $admin->admin_id;
        $validated['event_date'] = $validated['event_date'] ?? $validated['start_date'] ?? now()->toDateString();
        $validated['start_date'] = $validated['start_date'] ?? $validated['event_date'];
        $validated['end_date'] = $validated['end_date'] ?? $validated['start_date'];
        $validated['start_time'] = $validated['start_time'] ?? '08:00';
        $validated['end_time'] = $validated['end_time'] ?? '17:00';
        $validated['status'] = $this->databaseStatus($validated['status']);

        $fair = JobFair::create($validated);

        return response()->json([
            'message' => 'Job Fair created successfully',
            'job_fair' => $this->formatFair($fair),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $fair = JobFair::withCount([
            'employerJoins as employers_count',
            'attendees as rsvps_count',
            'attendees as attendance_count' => fn ($query) => $query->where('is_attended', true),
            'applications as hots_count' => fn ($query) => $query->where('is_hots', true),
            'vacancyLinks as vacancies_count',
        ])->findOrFail($id);

        return response()->json($this->formatFair($fair));
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
            'description' => 'sometimes|nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'venue' => 'sometimes|string|max:255',
            'sector' => 'sometimes|in:local,overseas,both',
            'event_date' => 'sometimes|date',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i',
            'status' => 'sometimes|in:upcoming,active,ongoing,completed,cancelled',
        ]);

        if (isset($validated['status'])) {
            $validated['status'] = $this->databaseStatus($validated['status']);
        }

        if (isset($validated['start_date']) && ! isset($validated['event_date'])) {
            $validated['event_date'] = $validated['start_date'];
        }

        $fair->update($validated);

        return response()->json([
            'message' => 'Job Fair updated successfully',
            'job_fair' => $this->formatFair($fair->fresh()),
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

    private function databaseStatus(string $status): string
    {
        return $status === 'active' ? 'ongoing' : $status;
    }

    private function formatFair(JobFair $fair): array
    {
        $fair->loadCount([
            'employerJoins as employers_count',
            'attendees as rsvps_count',
            'attendees as attendance_count' => fn ($query) => $query->where('is_attended', true),
            'applications as hots_count' => fn ($query) => $query->where('is_hots', true),
            'vacancyLinks as vacancies_count',
        ]);

        return [
            'job_fair_id' => $fair->job_fair_id,
            'id' => $fair->job_fair_id,
            'title' => $fair->title,
            'description' => $fair->description,
            'venue' => $fair->venue,
            'sector' => $fair->sector ?? 'local',
            'event_date' => $fair->event_date?->toDateString(),
            'start_date' => $fair->start_date?->toDateString() ?? $fair->event_date?->toDateString(),
            'end_date' => $fair->end_date?->toDateString() ?? $fair->event_date?->toDateString(),
            'start_time' => $fair->start_time,
            'end_time' => $fair->end_time,
            'status' => $fair->status === 'ongoing' ? 'active' : $fair->status,
            'metrics' => [
                'employers_joined' => (int) $fair->employers_count,
                'seekers_rsvped' => (int) $fair->rsvps_count,
                'attendance' => (int) $fair->attendance_count,
                'hots' => (int) $fair->hots_count,
                'vacancies' => (int) $fair->vacancies_count,
            ],
        ];
    }
}
