<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsGovernmentPrograms;
use App\Http\Controllers\Controller;
use App\Models\CitizenCharterService;
use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Seeker-facing view of the admin-managed government program announcement board.
 * Each program is returned with the seeker's eligibility (score + breakdown),
 * computed by EligibilityMatchingService via FormatsGovernmentPrograms.
 */
class SeekerGovernmentProgramController extends Controller
{
    use FormatsGovernmentPrograms;

    public function index(Request $request): JsonResponse
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
                    ->orWhere('target_industry', 'like', "%{$search}%");
            });
        });
        $query->when($request->string('category')->toString(), fn ($query, $category) => $query->where('category', $category));
        $query->when($request->string('status')->toString(), fn ($query, $status) => $query->where('program_status', $status));

        $programs = $query
            ->orderByRaw("CASE program_status WHEN 'open' THEN 0 WHEN 'closed' THEN 1 ELSE 2 END")
            ->orderBy('application_deadline')
            ->paginate($request->integer('per_page', 12));
        $programs->through(fn (GovernmentProgram $program) => $this->formatProgram($program, $seeker));

        return response()->json([
            'programs' => $programs,
            'categories' => $this->categoryCounts(),
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
