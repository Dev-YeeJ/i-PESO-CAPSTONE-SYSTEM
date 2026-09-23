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
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployerApplicationController extends Controller
{
    use FormatsApplications;

    public function index(Request $request): JsonResponse
    {
        $employer = $this->employer($request);
        $validated = $request->validate([
            'post_id' => ['nullable', 'integer', 'exists:job_vacancies,post_id'],
            'status' => ['nullable', Rule::in(['pending', 'reviewed', 'shortlisted', 'interview', 'hired', 'rejected'])],
            'search' => ['nullable', 'string', 'max:100'],
            'sort_by' => ['nullable', Rule::in(['match_score', 'applied_date', 'name'])],
            'sort_dir' => ['nullable', Rule::in(['asc', 'desc'])],
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

        if ($validated['post_id'] ?? null) {
            $query->where('post_id', $validated['post_id']);
        }

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

        // Server-side sorting
        $sortBy = $validated['sort_by'] ?? 'applied_date';
        $sortDir = $validated['sort_dir'] ?? 'desc';

        switch ($sortBy) {
            case 'match_score':
                $query->orderBy('match_percentage', $sortDir);
                break;
            case 'name':
                $query->orderBy(
                    \App\Models\JobSeeker::select('first_name')
                        ->whereColumn('job_seekers.seeker_id', 'applications.seeker_id')
                        ->limit(1),
                    $sortDir
                );
                break;
            case 'applied_date':
            default:
                $query->orderBy('created_at', $sortDir);
                break;
        }

        $applications = $query
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

    /**
     * Streams the applicant's 2x2 photo for the ATS grid / applicant profile modal.
     * Gated on the same ownership check as show() — an employer may only view a
     * seeker's photo through an application actually made to one of their vacancies.
     */
    public function seekerProfileImage(Request $request, Application $application): StreamedResponse
    {
        $this->ensureOwnership($request, $application);

        $seeker = $application->jobSeeker;
        abort_unless($seeker && filled($seeker->profile_image), 404, 'Profile photo not found.');

        $disk = Storage::disk('local')->exists($seeker->profile_image) ? 'local' : 'public';
        abort_unless(Storage::disk($disk)->exists($seeker->profile_image), 404, 'Profile photo not found.');

        return Storage::disk($disk)->response($seeker->profile_image, 'profile-photo', [
            'Content-Disposition' => 'inline',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    /**
     * Streams the applicant's generated PDF resume if it exists.
     */
    public function seekerResume(Request $request, Application $application): StreamedResponse
    {
        $this->ensureOwnership($request, $application);

        $seeker = $application->jobSeeker;
        abort_unless($seeker && filled($seeker->resume_path), 404, 'Resume not found for this applicant.');

        $disk = Storage::disk('local')->exists($seeker->resume_path) ? 'local' : 'public';
        abort_unless(Storage::disk($disk)->exists($seeker->resume_path), 404, 'Resume file is missing.');

        $filename = 'Resume_'.$seeker->seeker_id.'_'.str($seeker->last_name)->slug('_').'.pdf';

        return Storage::disk($disk)->response($seeker->resume_path, $filename, [
            'Content-Disposition' => 'inline',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    public function updateStatus(Request $request, Application $application, \App\Services\JitsiMeetingService $meetingService): JsonResponse
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
            $validated['interview']['venue_or_link'] = $meetingService->createRoom()['meet_link'];
        }

        $sweptApplications = [];
        $alreadyTerminal = false;

        DB::transaction(function () use ($application, $employer, $validated, &$sweptApplications, &$alreadyTerminal) {
            // Re-check under a row lock: two near-simultaneous requests for the same
            // application (an employer double-clicking "Hire", a client-side retry after a
            // slow response) can both pass the terminal-status guard above before either one
            // commits — that guard alone doesn't serialize them. Locking here and re-checking
            // is what actually stops both from processing (and both notifying the seeker).
            $locked = Application::whereKey($application->getKey())->lockForUpdate()->first();
            if (! $locked || in_array($locked->status, ['hired', 'rejected', 'withdrawn'], true)) {
                $alreadyTerminal = true;
                return;
            }

            $this->processStatusUpdate($application, $employer, $validated, $sweptApplications);
        });

        if ($alreadyTerminal) {
            return response()->json([
                'message' => 'This application can no longer be processed.',
            ], 409);
        }

        // Idempotency guard for the hired outcome: two near-simultaneous employer
        // requests (double-click, client-side retry, network re-send) can both
        // pass the lockForUpdate terminal-status re-check if the first commit
        // completes between the SELECT FOR UPDATE and the second request's SELECT —
        // that is unlikely but observable on shared-hosting environments with InnoDB
        // gap locks. Even if the DB write is de-duplicated by the lock, a separate
        // HTTP connection can still slip through the pre-lock guard above and
        // trigger a second event (and therefore a second push/DB notification).
        // Suppress the event entirely when a 'hired' status notification for this
        // application was already written within the last 60 seconds.
        $skipEvent = $validated['status'] === 'hired'
            && \Illuminate\Support\Facades\DB::table('notifications')
                ->where('notifiable_type', \App\Models\JobSeeker::class)
                ->where('notifiable_id', $application->seeker_id)
                ->whereRaw("JSON_EXTRACT(data, '$.status') = 'hired'")
                ->whereRaw("JSON_EXTRACT(data, '$.application_id') = ?", [$application->apply_id])
                ->where('created_at', '>=', now()->subSeconds(60))
                ->exists();

        if (! $skipEvent) {
            event(new ApplicationStatusChanged($application));
        }

        foreach ($sweptApplications as $sweptApp) {
            event(new ApplicationStatusChanged($sweptApp));
        }

        return response()->json([
            'message' => 'Application status updated.',
            'application' => $this->formatApplication($application->fresh()),
        ]);
    }

    public function updateStatusBulk(Request $request, \App\Services\JitsiMeetingService $meetingService): JsonResponse
    {
        $employer = $this->employer($request);

        $rules = [
            'application_ids' => ['required', 'array', 'min:1', 'max:50'],
            'application_ids.*' => ['required', 'integer', 'exists:applications,apply_id'],
        ];

        $request->validate($rules);
        $validated = $this->validateStatusPayload($request);

        // Ordered by primary key so lock acquisition order below is deterministic — two bulk
        // requests sharing an application_id but listing it in a different order would
        // otherwise be a classic lock-ordering deadlock (each waiting on a row the other
        // already holds).
        $applications = Application::whereIn('apply_id', $request->input('application_ids'))
            ->orderBy('apply_id')
            ->with(['jobVacancy', 'jobSeeker'])
            ->get();

        foreach ($applications as $app) {
            $this->ensureOwnership($request, $app);
        }

        $sweptApplications = [];
        $processedApplications = [];

        DB::transaction(function () use ($applications, $employer, $validated, $meetingService, &$sweptApplications, &$processedApplications) {
            foreach ($applications as $application) {
                // Same race as updateStatus() above: lock and re-check rather than trusting
                // the $applications collection fetched before this transaction opened — a
                // concurrent request for one of these same application_ids could have already
                // moved it to a terminal status in the gap between that fetch and this lock.
                $locked = Application::whereKey($application->getKey())->lockForUpdate()->first();
                if (! $locked || in_array($locked->status, ['hired', 'rejected', 'withdrawn'], true)) {
                    continue;
                }

                $appValidated = $validated;

                if (($appValidated['status'] ?? null) === 'interview' && ($appValidated['interview']['auto_meet_link'] ?? false)) {
                    $appValidated['interview']['venue_or_link'] = $meetingService->createRoom()['meet_link'];
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
            'employer_mismatch_reason_code' => ['required_if:status,rejected', 'nullable', Rule::in(array_keys(\App\Services\EstablishmentReportService::EMPLOYER_MISMATCH_REASONS))],
            'seeker_mismatch_reason_code' => ['nullable', Rule::in(array_keys(\App\Services\EstablishmentReportService::SEEKER_MISMATCH_REASONS))],
            'mismatch_reason_details' => ['nullable', 'string', 'max:5000'],
            'interview.mode_of_interview' => ['required_if:status,interview', 'nullable', Rule::in(['face_to_face', 'online', 'phone'])],
            'interview.schedule' => ['required_if:status,interview', 'nullable', 'date', 'after:now'],
            'interview.venue_or_link' => [
                Rule::requiredIf(fn () => $request->input('status') === 'interview' && ! $request->boolean('interview.auto_meet_link')),
                'nullable', 'string', 'max:500',
            ],
            'interview.auto_meet_link' => ['nullable', 'boolean'],
            'interview.instructions' => ['nullable', 'string', 'max:5000'],
            'placement_start_date' => ['required_if:status,hired', 'nullable', 'date'],
            'placement_salary' => ['required_if:status,hired', 'nullable', 'numeric', 'min:1'],
            'employment_type' => ['required_if:status,hired', 'nullable', Rule::in(['regular', 'contractual', 'probationary', 'part_time'])],
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
                'placement_employment_type' => $validated['employment_type'],
                'placement_captured_at' => now(),
            ]);
        }

        $application->save();

        if ($validated['status'] === 'hired' && $originalStatus !== 'hired') {
            $vacancy = $application->jobVacancy;
            if ($vacancy && $vacancy->vacancies_count > 0) {
                $vacancy->decrement('vacancies_count');

                if ($vacancy->vacancies_count === 0) {
                    $vacancy->update(['status' => 'closed']);

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
            // Always clean up the interview record in the DB — an open interview
            // row for a closed application (hired, rejected, withdrawn) is an
            // inconsistent state regardless of why the transition happened.
            $application->interviewSchedule()->update(['status' => 'cancelled']);

            // Only send the "Interview Cancelled" notification when the employer
            // explicitly cancels the interview by moving the application to a
            // non-terminal status (e.g. back to reviewed/shortlisted).
            // When the application moves to a terminal outcome (hired or rejected),
            // the seeker already receives a meaningful status notification
            // ("You're Hired!" / "Status Update"). Sending "Interview Cancelled"
            // on top of that is misleading — the employer didn't cancel the
            // interview; they concluded it by making a hiring decision.
            $terminalStatuses = ['hired', 'rejected', 'withdrawn'];
            if (! in_array($validated['status'], $terminalStatuses, true)) {
                Notification::send($application->jobSeeker, new InterviewCancelledNotification($application));
                Notification::send($application->jobVacancy?->employer, new InterviewCancelledNotification($application));
            }
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
