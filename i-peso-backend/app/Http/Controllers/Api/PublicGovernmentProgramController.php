<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GovernmentProgram;
use Illuminate\Http\JsonResponse;

/**
 * Unauthenticated list for the landing page's "Government programs" section —
 * SeekerGovernmentProgramController::index() needs a logged-in JobSeeker (it
 * scores eligibility per seeker), so it can't serve visitors who haven't
 * registered yet.
 *
 * Carries enough for a visitor to act on the posting without an account: what
 * it is, who it is for, what to bring, when it closes and who to approach.
 * That is the whole point of the module — Government Programs is postings and
 * announcements, and the transaction happens in person at PESO, so withholding
 * these details behind a login would only obstruct the citizen.
 *
 * Still excludes internal/admin detail: no eligibility_rules (the scoring
 * logic), no admin identifiers, no counts.
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
                'description' => $program->description,
                'target_beneficiaries' => $program->target_beneficiaries,
                'eligibility_requirements' => $program->eligibility_requirements ?? [],
                'required_documents' => $program->required_documents ?? [],
                'citizen_charter_steps' => $program->citizen_charter_steps ?? [],
                'start_date' => $program->start_date?->format('Y-m-d'),
                'end_date' => $program->end_date?->format('Y-m-d'),
                'application_deadline' => $program->application_deadline?->format('Y-m-d'),
                'venue' => $program->venue,
                'location_address' => $program->location_address,
                'total_slots' => (int) $program->total_slots,
                'available_slots' => (int) $program->available_slots,
                'contact_person' => $program->contact_person,
                'contact_email' => $program->contact_email,
                'contact_phone' => $program->contact_phone,
            ]);

        return response()->json(['data' => $programs]);
    }
}
