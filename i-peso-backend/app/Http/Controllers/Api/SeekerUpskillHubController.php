<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsGovernmentPrograms;
use App\Http\Controllers\Controller;
use App\Models\CitizenCharterService;
use App\Models\GovernmentProgram;
use App\Models\JobFair;
use App\Models\JobSeeker;
use App\Services\UpskillRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SeekerUpskillHubController extends Controller
{
    use FormatsGovernmentPrograms;

    public function index(Request $request, UpskillRecommendationService $recommendations): JsonResponse
    {
        $seeker = $this->seeker($request);
        $query = GovernmentProgram::query()
            ->with([
                'skills.skill',
                'targetOccupation',
                'applications' => fn ($query) => $query->where('seeker_id', $seeker->seeker_id)->with('documents', 'certificate'),
            ])
            ->withCount('applications')
            ->where('visibility', 'public')
            ->whereNotIn('program_status', ['draft', 'archived']);

        $query->when($request->string('search')->toString(), function ($query, $search) {
            $query->where(function ($nested) use ($search) {
                $nested->where('program_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('target_industry', 'like', "%{$search}%")
                    ->orWhereHas('skills', fn ($skills) => $skills->where('skill_name', 'like', "%{$search}%"));
            });
        });
        $query->when($request->string('category')->toString(), fn ($query, $category) => $query->where('category', $category));
        $query->when($request->string('status')->toString(), fn ($query, $status) => $query->where('program_status', $status));
        $query->when($request->string('skill')->toString(), fn ($query, $skill) => $query->whereHas('skills', fn ($skills) => $skills->where('skill_name', 'like', "%{$skill}%")));
        $query->when($request->string('eligibility')->toString(), function ($query, $eligibility) {
            $query->where(function ($nested) use ($eligibility) {
                $nested->where('target_beneficiaries', 'like', "%{$eligibility}%")
                    ->orWhere('eligibility_requirements', 'like', "%{$eligibility}%");
            });
        });
        $query->when($request->string('location')->toString(), function ($query, $location) {
            $query->where(function ($nested) use ($location) {
                $nested->where('venue', 'like', "%{$location}%")->orWhere('location_address', 'like', "%{$location}%");
            });
        });
        $query->when($request->string('deadline')->toString(), function ($query, $deadline) {
            match ($deadline) {
                'week' => $query->whereBetween('application_deadline', [today(), today()->addWeek()]),
                'month' => $query->whereBetween('application_deadline', [today(), today()->addMonth()]),
                'open' => $query->where(function ($nested) {
                    $nested->whereNull('application_deadline')->orWhereDate('application_deadline', '>=', today());
                }),
                default => null,
            };
        });

        $programs = $query
            ->orderByRaw("CASE program_status WHEN 'open' THEN 0 WHEN 'closed' THEN 1 ELSE 2 END")
            ->orderBy('application_deadline')
            ->paginate($request->integer('per_page', 12));
        $programs->through(fn (GovernmentProgram $program) => $this->formatProgram($program, $seeker));

        $recommended = $recommendations->recommend($seeker, 4)
            ->map(fn (GovernmentProgram $program) => $this->formatProgram($program, $seeker));

        return response()->json([
            'programs' => $programs,
            'recommended' => $recommended,
            'job_fairs' => $this->jobFairs(),
            'categories' => $this->categoryCounts(),
        ]);
    }

    public function recommended(Request $request, UpskillRecommendationService $recommendations): JsonResponse
    {
        $seeker = $this->seeker($request);

        return response()->json([
            'data' => $recommendations->recommend($seeker, $request->integer('limit', 20))
                ->map(fn (GovernmentProgram $program) => $this->formatProgram($program, $seeker)),
        ]);
    }

    public function show(Request $request, GovernmentProgram $governmentProgram): JsonResponse
    {
        abort_if($governmentProgram->visibility !== 'public' || in_array($governmentProgram->program_status, ['draft', 'archived'], true), 404);
        $seeker = $this->seeker($request);
        $governmentProgram->load([
            'skills.skill',
            'targetOccupation',
            'applications' => fn ($query) => $query->where('seeker_id', $seeker->seeker_id)->with('documents', 'certificate'),
        ])->loadCount('applications');

        return response()->json(['program' => $this->formatProgram($governmentProgram, $seeker)]);
    }

    public function attachment(Request $request, GovernmentProgram $governmentProgram): StreamedResponse
    {
        $this->seeker($request);
        abort_if($governmentProgram->visibility !== 'public' || ! $governmentProgram->attachment_path, 404);
        abort_unless(Storage::disk('local')->exists($governmentProgram->attachment_path), 404);

        return Storage::disk('local')->download($governmentProgram->attachment_path);
    }

    public function citizenCharter(): JsonResponse
    {
        return response()->json([
            'data' => CitizenCharterService::query()
                ->where('status', 'published')
                ->orderBy('display_order')
                ->orderBy('service_name')
                ->get(),
        ]);
    }

    private function jobFairs(): array
    {
        return JobFair::query()
            ->whereIn('status', ['upcoming', 'ongoing', 'active'])
            ->orderByRaw('COALESCE(start_date, event_date) asc')
            ->limit(6)
            ->get()
            ->map(fn (JobFair $fair) => [
                'job_fair_id' => $fair->job_fair_id,
                'title' => $fair->title,
                'category' => 'job_fair',
                'description' => $fair->description,
                'venue' => $fair->venue,
                'start_date' => ($fair->start_date ?? $fair->event_date)?->format('Y-m-d'),
                'end_date' => ($fair->end_date ?? $fair->event_date)?->format('Y-m-d'),
                'status' => $fair->status === 'ongoing' ? 'active' : $fair->status,
                'source_type' => 'job_fair',
            ])->all();
    }

    private function categoryCounts(): array
    {
        return GovernmentProgram::query()
            ->where('visibility', 'public')
            ->whereNotIn('program_status', ['draft', 'archived'])
            ->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category')
            ->all();
    }

    private function seeker(Request $request): JobSeeker
    {
        abort_unless($request->user() instanceof JobSeeker, 403, 'Job seeker account required.');

        return $request->user();
    }
}
