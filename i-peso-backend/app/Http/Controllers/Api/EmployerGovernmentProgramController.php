<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsGovernmentPrograms;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Employer;
use App\Models\GovernmentProgram;
use App\Notifications\GovernmentProgramNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployerGovernmentProgramController extends Controller
{
    use FormatsGovernmentPrograms;

    public function index(Request $request): JsonResponse
    {
        $this->employer($request);
        $programs = GovernmentProgram::query()
            ->with(['skills.skill', 'targetOccupation'])
            ->withCount('applications')
            ->where('visibility', 'public')
            ->where('program_status', 'open')
            ->whereIn('category', ['tech_voc_training', 'career_guidance', 'livelihood_program'])
            ->when($request->string('skill')->toString(), fn ($query, $skill) => $query->whereHas('skills', fn ($skills) => $skills->where('skill_name', 'like', "%{$skill}%")))
            ->orderBy('application_deadline')
            ->get()
            ->map(fn (GovernmentProgram $program) => $this->formatProgram($program));

        return response()->json(['data' => $programs]);
    }

    public function recommendApplicant(Request $request): JsonResponse
    {
        $employer = $this->employer($request);
        $validated = $request->validate([
            'application_id' => [
                'required',
                'integer',
                Rule::exists('applications', 'apply_id'),
            ],
            'program_id' => ['required', 'integer', 'exists:government_programs,program_id'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $application = Application::query()
            ->with('jobSeeker')
            ->where('apply_id', $validated['application_id'])
            ->whereHas('jobVacancy', fn ($query) => $query->where('employer_id', $employer->employer_id))
            ->firstOrFail();
        $program = GovernmentProgram::query()
            ->where('program_status', 'open')
            ->where('visibility', 'public')
            ->findOrFail($validated['program_id']);

        $application->jobSeeker->notify(new GovernmentProgramNotification(
            $program,
            'employer_recommendation',
            null,
            $validated['message'] ?? null,
        ));

        return response()->json(['message' => 'Upskill recommendation sent to the applicant.']);
    }

    private function employer(Request $request): Employer
    {
        abort_unless($request->user() instanceof Employer, 403, 'Employer account required.');

        return $request->user();
    }
}
