<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsApplications;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Employer;
use App\Events\ApplicationStatusChanged;
use App\Notifications\InterviewCancelledNotification;
use App\Notifications\InterviewScheduledNotification;
use App\Notifications\InterviewUpdatedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
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

    public function updateStatus(Request $request, Application $application, \App\Services\GoogleCalendarService $calendarService): JsonResponse
    {
        $employer = $this->employer($request);
        $this->ensureOwnership($request, $application);

        if (in_array($application->status, ['hired', 'rejected', 'withdrawn'], true)) {
            return response()->json([
                'message' => 'This application can no longer be processed.',
            ], 409);
        }

        $validated = $this->validateStatusPayload($request);

        if (($validated['status'] ?? null) === 'interview' && ($validated['interview']['auto_meet_link'] ?? false)) {
            try {
                $seekerName = $application->jobSeeker->name ?? 'Applicant';
                $jobTitle = $application->jobVacancy->job_title ?? 'Position';
                $summary = "Interview: $seekerName - $jobTitle";
                $result = $calendarService->createMeetEvent($employer, $validated['interview']['schedule'], $summary);
                $validated['interview']['venue_or_link'] = $result['meet_link'];
            } catch (\Exception $e) {
                if ($e->getCode() === 403) {
                    return response()->json(['message' => $e->getMessage()], 403);
                }
                return response()->json(['message' => 'Failed to generate meeting link.', 'error' => $e->getMessage()], 500);
            }
        }

        $sweptApplications = [];

        DB::transaction(function () use ($application, $employer, $validated, &$sweptApplications) {
            $this->processStatusUpdate($application, $employer, $validated, $sweptApplications);
        });

        event(new ApplicationStatusChanged($application));

        foreach ($sweptApplications as $sweptApp) {
            event(new ApplicationStatusChanged($sweptApp));
        }

        return response()->json([
            'message' => 'Application status updated.',
            'application' => $this->formatApplication($application->fresh()),
        ]);
    }

    public function updateStatusBulk(Request $request, \App\Services\GoogleCalendarService $calendarService): JsonResponse
    {
        $employer = $this->employer($request);

        $rules = [
            'application_ids' => ['required', 'array', 'min:1', 'max:50'],
            'application_ids.*' => ['required', 'integer', 'exists:applications,apply_id'],
        ];

        $request->validate($rules);
        $validated = $this->validateStatusPayload($request);

        $applications = Application::whereIn('apply_id', $request->input('application_ids'))
            ->with(['jobVacancy', 'jobSeeker'])
            ->get();

        foreach ($applications as $app) {
            $this->ensureOwnership($request, $app);
        }

        $sweptApplications = [];
        $processedApplications = [];

        DB::transaction(function () use ($applications, $employer, $validated, $calendarService, &$sweptApplications, &$processedApplications) {
            foreach ($applications as $application) {
                if (in_array($application->status, ['hired', 'rejected', 'withdrawn'], true)) {
                    continue;
                }

                $appValidated = $validated;

                if (($appValidated['status'] ?? null) === 'interview' && ($appValidated['interview']['auto_meet_link'] ?? false)) {
                    try {
                        $seekerName = $application->jobSeeker->name ?? 'Applicant';
                        $jobTitle = $application->jobVacancy->job_title ?? 'Position';
                        $summary = "Interview: $seekerName - $jobTitle";
                        $result = $calendarService->createMeetEvent($employer, $appValidated['interview']['schedule'], $summary);
                        $appValidated['interview']['venue_or_link'] = $result['meet_link'];
                    } catch (\Exception $e) {
                        if ($e->getCode() === 403) {
                            abort(403, $e->getMessage());
                        }
                    }
                }

                $this->processStatusUpdate($application, $employer, $appValidated, $sweptApplications);
                $processedApplications[] = $application;
            }
        });

        foreach ($processedApplications as $app) {
            event(new ApplicationStatusChanged($app));
        }

        foreach ($sweptApplications as $sweptApp) {
            event(new ApplicationStatusChanged($sweptApp));
        }

        return response()->json([
            'message' => 'Applications updated successfully.',
            'count' => count($processedApplications),
        ]);
    }

    protected function validateStatusPayload(Request $request): array
    {
        return $request->validate([
            'status' => ['required', Rule::in(['reviewed', 'shortlisted', 'interview', 'hired', 'rejected'])],
            'employer_remarks' => ['nullable', 'string', 'max:5000'],
            'employer_mismatch_reason_code' => ['nullable', Rule::in(array_keys(\App\Services\EstablishmentReportService::EMPLOYER_MISMATCH_REASONS))],
            'seeker_mismatch_reason_code' => ['nullable', Rule::in(array_keys(\App\Services\EstablishmentReportService::SEEKER_MISMATCH_REASONS))],
            'mismatch_reason_details' => ['nullable', 'string', 'max:5000'],
            'interview.mode_of_interview' => ['required_if:status,interview', 'nullable', Rule::in(['face_to_face', 'online', 'phone'])],
            'interview.schedule' => ['required_if:status,interview', 'nullable', 'date', 'after:now'],
            'interview.venue_or_link' => ['nullable', 'string', 'max:500'],
            'interview.auto_meet_link' => ['nullable', 'boolean'],
            'interview.instructions' => ['nullable', 'string', 'max:5000'],
            'placement_start_date' => ['required_if:status,hired', 'nullable', 'date'],
            'placement_salary' => ['required_if:status,hired', 'nullable', 'numeric', 'min:1'],
        ]);
    }

    protected function processStatusUpdate(Application $application, Employer $employer, array $validated, array &$sweptApplications): Application
    {
        $originalStatus = $application->status;
        $originalInterviewSchedule = $application->interviewSchedule()->withoutGlobalScopes()->first();

        $updates = [
            'status' => $validated['status'],
            'status_changed_at' => now(),
            'status_changed_by' => $employer->employer_id,
            'employer_remarks' => $validated['employer_remarks'] ?? $application->employer_remarks,
        ];

        foreach (['employer_mismatch_reason_code', 'seeker_mismatch_reason_code', 'mismatch_reason_details'] as $field) {
            if (array_key_exists($field, $validated)) {
                $updates[$field] = $validated[$field];
            }
        }

        $application->forceFill($updates);

        if ($validated['status'] === 'hired') {
            $application->forceFill([
                'placement_start_date' => $validated['placement_start_date'],
                'placement_salary' => $validated['placement_salary'],
                'placement_captured_at' => now(),
            ]);
        }

        $application->save();

        if ($validated['status'] === 'hired' && $originalStatus !== 'hired') {
            $vacancy = $application->jobVacancy;
            if ($vacancy && $vacancy->vacancies_count > 0) {
                $vacancy->decrement('vacancies_count');

                if ($vacancy->vacancies_count === 0) {
                    $activeStatuses = ['pending', 'reviewed', 'shortlisted', 'interview'];
                    $swepts = Application::where('post_id', $vacancy->post_id)
                        ->where('apply_id', '!=', $application->apply_id)
                        ->whereIn('status', $activeStatuses)
                        ->get();

                    foreach ($swepts as $sweptApp) {
                        $sweptApp->forceFill([
                            'status' => 'rejected',
                            'status_changed_at' => now(),
                            'status_changed_by' => $employer->employer_id,
                            'employer_remarks' => 'Automated anti-ghosting sweep: Vacancy has been filled.',
                            'employer_mismatch_reason_code' => 'other_reason',
                            'mismatch_reason_details' => 'Vacancy was filled before this application advanced.',
                        ])->save();
                        $sweptApplications[] = $sweptApp;
                    }
                }
            }
        }

        if ($validated['status'] === 'interview') {
            $interview = $validated['interview'] ?? [];
            $interviewSchedule = $application->interviewSchedule()->updateOrCreate(
                ['apply_id' => $application->apply_id],
                [
                    'mode_of_interview' => $interview['mode_of_interview'],
                    'schedule' => $interview['schedule'],
                    'venue_or_link' => $interview['venue_or_link'] ?? null,
                    'instructions' => $interview['instructions'] ?? null,
                    'status' => 'scheduled',
                    'interview_reminder_24h_sent_at' => null,
                    'interview_reminder_1h_sent_at' => null,
                    'interview_reminder_15m_sent_at' => null,
                ]
            );

            $isReschedule = $originalInterviewSchedule
                && $originalInterviewSchedule->schedule
                && $originalInterviewSchedule->schedule->ne($interviewSchedule->schedule);

            if ($interviewSchedule->wasRecentlyCreated) {
                Notification::send($application->jobSeeker, new InterviewScheduledNotification($application));
                Notification::send($application->jobVacancy?->employer, new InterviewScheduledNotification($application));
            } elseif ($isReschedule) {
                Notification::send($application->jobSeeker, new InterviewUpdatedNotification($application));
                Notification::send($application->jobVacancy?->employer, new InterviewUpdatedNotification($application));
            }
        }

        if ($originalStatus === 'interview' && $validated['status'] !== 'interview') {
            $application->interviewSchedule()->update(['status' => 'cancelled']);
            Notification::send($application->jobSeeker, new InterviewCancelledNotification($application));
            Notification::send($application->jobVacancy?->employer, new InterviewCancelledNotification($application));
        }

        return $application;
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
