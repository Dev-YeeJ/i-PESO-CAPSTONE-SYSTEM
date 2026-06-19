<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsApplications;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Employer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EmployerApplicationController extends Controller
{
    use FormatsApplications;

    public function index(Request $request): JsonResponse
    {
        $employer = $this->employer($request);
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'reviewed', 'shortlisted', 'interview', 'hired', 'rejected'])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Application::query()
            ->with([
                'jobVacancy.employer',
                'jobSeeker.seekerSkills',
                'jobSeeker.educations',
                'jobSeeker.workExperiences',
                'jobSeeker.occupations',
                'interviewSchedule',
            ])
            ->whereHas('jobVacancy', fn ($vacancy) => $vacancy->where('employer_id', $employer->employer_id));

        if ($validated['status'] ?? null) {
            $query->where('status', $validated['status']);
        }

        if ($search = trim((string) ($validated['search'] ?? ''))) {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->whereHas('jobVacancy', fn ($vacancy) => $vacancy->where('job_title', 'like', "%{$search}%"))
                    ->orWhereHas('jobSeeker', function ($seeker) use ($search) {
                        $seeker
                            ->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $applications = $query
            ->latest('created_at')
            ->paginate((int) ($validated['per_page'] ?? 50));

        $applications->getCollection()->transform(
            fn (Application $application) => $this->formatApplication($application)
        );

        return response()->json($applications);
    }

    public function show(Request $request, Application $application): JsonResponse
    {
        $this->ensureOwnership($request, $application);

        return response()->json([
            'application' => $this->formatApplication($application),
        ]);
    }

    public function updateStatus(Request $request, Application $application): JsonResponse
    {
        $employer = $this->employer($request);
        $this->ensureOwnership($request, $application);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['reviewed', 'shortlisted', 'interview', 'hired', 'rejected'])],
            'employer_remarks' => ['nullable', 'string', 'max:5000'],
            'interview.mode_of_interview' => ['required_if:status,interview', 'nullable', Rule::in(['face_to_face', 'online', 'phone'])],
            'interview.schedule' => ['required_if:status,interview', 'nullable', 'date', 'after:now'],
            'interview.venue_or_link' => ['nullable', 'string', 'max:500'],
            'interview.instructions' => ['nullable', 'string', 'max:5000'],
            'placement_start_date' => ['required_if:status,hired', 'nullable', 'date'],
            'placement_salary' => ['required_if:status,hired', 'nullable', 'numeric', 'min:1'],
        ]);

        $application = DB::transaction(function () use ($application, $employer, $validated) {
            $application->forceFill([
                'status' => $validated['status'],
                'status_changed_at' => now(),
                'status_changed_by' => $employer->employer_id,
                'employer_remarks' => $validated['employer_remarks'] ?? $application->employer_remarks,
            ]);

            if ($validated['status'] === 'hired') {
                $application->forceFill([
                    'placement_start_date' => $validated['placement_start_date'],
                    'placement_salary' => $validated['placement_salary'],
                    'placement_captured_at' => now(),
                ]);
            }

            $application->save();

            if ($validated['status'] === 'interview') {
                $interview = $validated['interview'] ?? [];
                $application->interviewSchedule()->updateOrCreate(
                    ['apply_id' => $application->apply_id],
                    [
                        'mode_of_interview' => $interview['mode_of_interview'],
                        'schedule' => $interview['schedule'],
                        'venue_or_link' => $interview['venue_or_link'] ?? null,
                        'instructions' => $interview['instructions'] ?? null,
                        'status' => 'scheduled',
                    ]
                );
            }

            return $application->fresh();
        });

        return response()->json([
            'message' => 'Application status updated.',
            'application' => $this->formatApplication($application),
        ]);
    }

    private function employer(Request $request): Employer
    {
        $user = $request->user();
        abort_unless($user instanceof Employer, 403, 'Employer account required.');

        return $user;
    }

    private function ensureOwnership(Request $request, Application $application): void
    {
        $application->loadMissing('jobVacancy');

        abort_unless(
            $application->jobVacancy?->employer_id === $this->employer($request)->employer_id,
            404
        );
    }
}
