<?php

namespace App\Http\Controllers\Api;

use App\Events\ApplicationStatusChanged;
use App\Http\Controllers\Api\Concerns\FormatsApplications;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Services\EnhancedJobMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class SeekerApplicationController extends Controller
{
    use FormatsApplications;

    public function index(Request $request): JsonResponse
    {
        $seeker = $this->seeker($request);

        $applications = $seeker->applications()
            ->with(['jobVacancy.employer', 'interviewSchedule'])
            ->latest()
            ->get()
            ->map(fn (Application $application) => $this->formatApplication($application, false));

        return response()->json([
            'count' => $applications->count(),
            'applications' => $applications,
        ]);
    }

    public function show(Request $request, Application $application): JsonResponse
    {
        $seeker = $this->seeker($request);

        abort_unless($application->seeker_id === $seeker->seeker_id, 404, 'Application not found.');

        return response()->json([
            'application' => $this->formatApplication($application, false),
        ]);
    }

    public function withdraw(Request $request, Application $application): JsonResponse
    {
        $seeker = $this->seeker($request);

        abort_unless($application->seeker_id === $seeker->seeker_id, 404, 'Application not found.');

        if (in_array($application->status, ['hired', 'rejected', 'withdrawn'], true)) {
            throw ValidationException::withMessages([
                'status' => ['This application can no longer be withdrawn.'],
            ]);
        }

        $application->forceFill([
            'status' => 'withdrawn',
            'status_changed_at' => now(),
            'status_changed_by' => $seeker->seeker_id,
        ])->save();

        event(new ApplicationStatusChanged($application->fresh()));

        return response()->json([
            'message' => 'Application withdrawn successfully.',
            'application' => $this->formatApplication($application->fresh(), false),
        ]);
    }

    public function apply(
        Request $request,
        JobVacancy $vacancy,
        EnhancedJobMatchingService $matching
    ): JsonResponse {
        $seeker = $this->seeker($request);

        // Jobseekers may apply with just their basic registration info — the full
        // NSRP profile (education, work history, etc.) can be completed later.

        if ($vacancy->status !== 'active') {
            throw ValidationException::withMessages([
                'job' => ['This vacancy is no longer accepting applications.'],
            ]);
        }

        if ($vacancy->application_deadline && $vacancy->application_deadline->lt(today())) {
            $vacancy->forceFill(['status' => 'closed'])->save();

            throw ValidationException::withMessages([
                'job' => ['The application deadline for this vacancy has passed.'],
            ]);
        }

        $existing = Application::query()
            ->where('post_id', $vacancy->post_id)
            ->where('seeker_id', $seeker->seeker_id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already applied to this job.',
                'application' => $this->formatApplication($existing, false),
            ]);
        }

        $match = $matching->calculateMatch($vacancy, $seeker);
        $application = Application::create([
            'post_id' => $vacancy->post_id,
            'seeker_id' => $seeker->seeker_id,
            'match_percentage' => $match['percentage'] ?? $match['total_score'] ?? 0,
            'status' => 'pending',
            'status_changed_at' => now(),
            'submitted_documents' => [
                'resume_generated' => filled($seeker->resume_path),
                'certificates_count' => Schema::hasTable('seeker_certificates')
                    ? $seeker->certificates()->count()
                    : 0,
            ],
        ]);

        return response()->json([
            'message' => 'Application submitted successfully.',
            'application' => $this->formatApplication($application, false),
        ], 201);
    }

    private function seeker(Request $request): JobSeeker
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker, 403, 'Job seeker account required.');

        return $user;
    }
}
