<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GovernmentProgram;
use Illuminate\Http\JsonResponse;

/**
 * Unauthenticated teaser list for the landing page's "Government programs"
 * section — SeekerGovernmentProgramController::index() needs a logged-in
 * JobSeeker (it scores eligibility per seeker), so it can't serve visitors
 * who haven't registered yet. Deliberately trimmed to marketing-card fields
 * only, no internal/admin detail.
 */
class PublicGovernmentProgramController extends Controller
{
    public function index(): JsonResponse
    {
        $programs = GovernmentProgram::query()
            ->where('visibility', 'public')
            ->where('program_status', 'open')
            // Mirrors GovernmentProgram::isAcceptingApplications() — a program
            // an admin hasn't gotten around to closing yet shouldn't be
            // advertised to first-time visitors as "open right now".
            ->where(function ($query) {
                $query->whereNull('application_deadline')
                    ->orWhereDate('application_deadline', '>=', now()->toDateString());
            })
            ->where(function ($query) {
                $query->where('total_slots', 0)
                    ->orWhere('available_slots', '>', 0);
            })
            ->orderBy('application_deadline')
            ->limit(8)
            ->get()
            ->map(fn (GovernmentProgram $program) => [
                'program_id' => $program->program_id,
                'slug' => $program->slug,
                'category' => $program->category,
                'name' => $program->program_name,
                'blurb' => $program->short_description,
                'application_deadline' => $program->application_deadline?->format('Y-m-d'),
            ]);

        return response()->json(['data' => $programs]);
    }
}
