<?php

namespace App\Services\Safety;

use App\Models\Application;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\SafetyReport;
use App\Models\SafetyReportAttachment;
use App\Models\SafetyReportEvent;
use App\Notifications\SafetyReportUpdateNotification;
use App\Support\SafetyReportCatalog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Filing and following up on safety reports, for both directions.
 *
 * Context is resolved and checked here rather than trusted from the client:
 * a job seeker may only attach their own application, an employer may only
 * report a job seeker who applied to one of their vacancies, and a vacancy
 * must belong to the employer it is filed against.
 */
class SafetyReportService
{
    /**
     * @param  array{subject_type: string, subject_id?: int|null, post_id?: int|null, application_id?: int|null,
     *               category: string, description: string, incident_date?: string|null}  $data
     * @param  array<int, UploadedFile>  $files
     */
    public function file(JobSeeker|Employer $reporter, array $data, array $files = []): SafetyReport
    {
        $context = $reporter instanceof JobSeeker
            ? $this->seekerContext($reporter, $data)
            : $this->employerContext($reporter, $data);

        $this->guardAgainstAbuse($reporter, $context);

        $report = DB::transaction(function () use ($reporter, $data, $context, $files) {
            $report = SafetyReport::create([
                'reporter_type' => $reporter instanceof JobSeeker ? SafetyReportCatalog::REPORTER_SEEKER : SafetyReportCatalog::REPORTER_EMPLOYER,
                'reporter_seeker_id' => $reporter instanceof JobSeeker ? $reporter->seeker_id : null,
                'reporter_employer_id' => $reporter instanceof Employer ? $reporter->employer_id : null,
                'subject_type' => $context['subject_type'],
                'subject_employer_id' => $context['subject_employer_id'],
                'subject_seeker_id' => $context['subject_seeker_id'],
                'post_id' => $context['post_id'],
                'application_id' => $context['application_id'],
                'category' => $data['category'],
                'description' => trim($data['description']),
                'incident_date' => $data['incident_date'] ?? null,
                'status' => SafetyReportCatalog::STATUS_SUBMITTED,
                'priority' => SafetyReportCatalog::defaultPriority($data['category']),
            ]);

            $this->storeAttachments($report, $files, 'reporter');

            $report->events()->create([
                'actor_type' => 'reporter',
                'kind' => SafetyReportEvent::KIND_SUBMITTED,
                'meta' => ['attachments' => count($files)],
            ]);

            return $report;
        });

        $this->notifyReporter($report->fresh(), 'submitted');

        return $report;
    }

    /** A reporter adds information or evidence to their own open case. */
    public function addReporterUpdate(SafetyReport $report, ?string $text, array $files = []): SafetyReport
    {
        if (! $report->isOpen()) {
            throw ValidationException::withMessages([
                'details' => ['This case is already closed. If something new happened, please file a new report.'],
            ]);
        }

        $existing = $report->attachments()->count();
        $max = (int) config('safety_reports.max_attachments');
        if ($existing + count($files) > $max) {
            throw ValidationException::withMessages([
                'attachments' => ["A case can hold at most {$max} files. This one already has {$existing}."],
            ]);
        }

        if (blank($text) && $files === []) {
            throw ValidationException::withMessages(['details' => ['Add more details or attach a file.']]);
        }

        DB::transaction(function () use ($report, $text, $files) {
            $this->storeAttachments($report, $files, 'reporter');
            $report->events()->create([
                'actor_type' => 'reporter',
                'kind' => SafetyReportEvent::KIND_REPORTER_UPDATE,
                'body' => filled($text) ? trim($text) : null,
                'meta' => ['attachments' => count($files)],
            ]);
            $report->touch();
        });

        return $report->fresh();
    }

    public function notifyReporter(SafetyReport $report, string $event): void
    {
        $reporter = $report->reporter();
        if (! $reporter) {
            return;
        }

        try {
            $reporter->notify(new SafetyReportUpdateNotification($report, $event));
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    /**
     * What the reporter may see about their own case: never internal notes,
     * actions taken, or anything PESO learned about the other party.
     */
    public function reporterView(SafetyReport $report, bool $detailed = false): array
    {
        $payload = [
            'id' => $report->id,
            'case_number' => $report->case_number,
            'subject_type' => $report->subject_type,
            'subject_name' => $report->subjectName(),
            'category' => $report->category,
            'category_label' => $report->categoryLabel(),
            'status' => $report->status,
            'status_label' => $report->statusLabel(),
            'is_open' => $report->isOpen(),
            'vacancy_title' => $report->vacancy?->job_title,
            'created_at' => $report->created_at?->toIso8601String(),
            'updated_at' => $report->updated_at?->toIso8601String(),
            'closed_at' => $report->closed_at?->toIso8601String(),
            'outcome_message' => match ($report->status) {
                SafetyReportCatalog::STATUS_RESOLVED => 'PESO completed its review and took appropriate action. Details of the action are kept confidential.',
                SafetyReportCatalog::STATUS_DISMISSED => 'PESO reviewed this report and closed it. If you have new information, you can file a new report.',
                default => 'An authorized PESO administrator will review this report. Its details are kept confidential.',
            },
        ];

        if ($detailed) {
            $payload['description'] = $report->description;
            $payload['incident_date'] = $report->incident_date?->toDateString();
            $payload['attachments'] = $report->attachments->map(fn (SafetyReportAttachment $file) => [
                'id' => $file->id,
                'name' => $file->original_filename,
                'size' => $file->file_size,
                'created_at' => $file->created_at?->toIso8601String(),
            ])->values()->all();
            $payload['updates'] = $report->events
                ->where('kind', SafetyReportEvent::KIND_REPORTER_UPDATE)
                ->map(fn (SafetyReportEvent $event) => [
                    'body' => $event->body,
                    'attachments' => (int) ($event->meta['attachments'] ?? 0),
                    'created_at' => $event->created_at?->toIso8601String(),
                ])->values()->all();
        }

        return $payload;
    }

    /**
     * @param  array<int, UploadedFile>  $files
     */
    public function storeAttachments(SafetyReport $report, array $files, string $uploadedBy): void
    {
        foreach ($files as $file) {
            $path = $file->store("safety_reports/{$report->id}", 'local');
            $report->attachments()->create([
                'original_filename' => $this->safeFilename($file->getClientOriginalName()),
                'stored_path' => $path,
                'mime_type' => $file->getMimeType() ?: $file->getClientMimeType(),
                'file_size' => $file->getSize(),
                'uploaded_by' => $uploadedBy,
            ]);
        }
    }

    // ── Context ─────────────────────────────────────────────────────────────

    /** A job seeker reports an employer or company. */
    private function seekerContext(JobSeeker $seeker, array $data): array
    {
        $application = null;
        $vacancy = null;

        if (! empty($data['application_id'])) {
            $application = Application::query()
                ->where('apply_id', $data['application_id'])
                ->where('seeker_id', $seeker->seeker_id)
                ->with('jobVacancy')
                ->first();

            if (! $application || ! $application->jobVacancy) {
                throw ValidationException::withMessages(['application_id' => ['That application could not be found on your account.']]);
            }
            $vacancy = $application->jobVacancy;
        }

        if (! empty($data['post_id'])) {
            $vacancy = JobVacancy::query()->find($data['post_id']);
            if (! $vacancy) {
                throw ValidationException::withMessages(['post_id' => ['That job vacancy could not be found.']]);
            }
            if ($application && (int) $application->post_id !== (int) $vacancy->post_id) {
                throw ValidationException::withMessages(['post_id' => ['That vacancy does not match the selected application.']]);
            }
        }

        $employerId = (int) ($data['subject_id'] ?? 0) ?: (int) ($vacancy?->employer_id ?? 0);
        $employer = $employerId ? Employer::query()->find($employerId) : null;
        if (! $employer) {
            throw ValidationException::withMessages(['subject_id' => ['Choose the employer or company you are reporting.']]);
        }

        if ($vacancy && (int) $vacancy->employer_id !== (int) $employer->employer_id) {
            throw ValidationException::withMessages(['post_id' => ['That vacancy belongs to a different employer.']]);
        }

        // Reporting from a vacancy the seeker applied to: connect the
        // application automatically so PESO sees the recruitment history.
        if ($vacancy && ! $application) {
            $application = Application::query()
                ->where('post_id', $vacancy->post_id)
                ->where('seeker_id', $seeker->seeker_id)
                ->first();
        }

        return [
            'subject_type' => SafetyReportCatalog::SUBJECT_EMPLOYER,
            'subject_employer_id' => $employer->employer_id,
            'subject_seeker_id' => null,
            'post_id' => $vacancy?->post_id,
            'application_id' => $application?->apply_id,
            'subject_label' => $employer->company_name ?: ($employer->trade_name ?? 'this employer'),
        ];
    }

    /** An employer reports a job seeker — only one who applied to them. */
    private function employerContext(Employer $employer, array $data): array
    {
        $application = empty($data['application_id']) ? null : Application::query()
            ->where('apply_id', $data['application_id'])
            ->whereHas('jobVacancy', fn ($query) => $query->where('employer_id', $employer->employer_id))
            ->with(['jobVacancy', 'jobSeeker'])
            ->first();

        if (! $application || ! $application->jobSeeker) {
            throw ValidationException::withMessages([
                'application_id' => ['You can only report a job seeker who applied to one of your vacancies. Open the report from their application.'],
            ]);
        }

        if (! empty($data['subject_id']) && (int) $data['subject_id'] !== (int) $application->seeker_id) {
            throw ValidationException::withMessages(['subject_id' => ['That job seeker does not match the selected application.']]);
        }

        $seeker = $application->jobSeeker;

        return [
            'subject_type' => SafetyReportCatalog::SUBJECT_SEEKER,
            'subject_employer_id' => null,
            'subject_seeker_id' => $seeker->seeker_id,
            'post_id' => $application->post_id,
            'application_id' => $application->apply_id,
            'subject_label' => trim("{$seeker->first_name} {$seeker->last_name}") ?: 'this job seeker',
        ];
    }

    // ── Abuse protection ────────────────────────────────────────────────────

    private function guardAgainstAbuse(JobSeeker|Employer $reporter, array $context): void
    {
        // Same parties, still open: add to that case instead of opening another.
        $existing = SafetyReport::query()
            ->filedBy($reporter)
            ->open()
            ->where('subject_type', $context['subject_type'])
            ->when(
                $context['subject_type'] === SafetyReportCatalog::SUBJECT_EMPLOYER,
                fn ($query) => $query->where('subject_employer_id', $context['subject_employer_id']),
                fn ($query) => $query->where('subject_seeker_id', $context['subject_seeker_id']),
            )
            ->latest('id')
            ->first();

        if ($existing) {
            throw new HttpResponseException(response()->json([
                'message' => "You already have an open report about {$context['subject_label']} (case {$existing->case_number}). "
                    .'PESO is reviewing it — add any new details or evidence to that case instead of filing another.',
                'errors' => ['subject_id' => ["You already have an open report about {$context['subject_label']} (case {$existing->case_number})."]],
                'existing_report' => ['id' => $existing->id, 'case_number' => $existing->case_number, 'status' => $existing->status],
            ], 409));
        }

        $limit = (int) config('safety_reports.daily_limit', 5);
        $recent = SafetyReport::query()->filedBy($reporter)->where('created_at', '>=', now()->subDay())->count();
        if ($recent >= $limit) {
            throw ValidationException::withMessages([
                'subject_id' => ["You have filed {$recent} reports in the last 24 hours, which is the limit. Please try again tomorrow, or contact the PESO office directly if this is urgent."],
            ]);
        }
    }

    private function safeFilename(string $filename): string
    {
        $basename = basename(str_replace('\\', '/', $filename));

        return Str::limit($basename !== '' ? $basename : 'evidence', 200, '');
    }
}
