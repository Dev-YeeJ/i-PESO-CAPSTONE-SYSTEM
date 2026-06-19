<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\FormatsApplications;
use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ApplicationController extends Controller
{
    use FormatsApplications;

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user() instanceof Administrator, 403, 'Administrator account required.');

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
            ]);

        if ($validated['status'] ?? null) {
            $query->where('status', $validated['status']);
        }

        if ($search = trim((string) ($validated['search'] ?? ''))) {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->whereHas('jobVacancy', fn ($vacancy) => $vacancy->where('job_title', 'like', "%{$search}%"))
                    ->orWhereHas('jobVacancy.employer', fn ($employer) => $employer->where('company_name', 'like', "%{$search}%"))
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
}
