<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\SafetyReport;
use App\Models\SafetyReportAttachment;
use App\Models\SafetyReportEvent;
use App\Services\Safety\SafetyCaseService;
use App\Support\SafetyReportCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Constituent CRM > Reports & Safety — the one workspace for every safety
 * report, whichever direction it was filed in. Reading needs view access to
 * Constituent CRM; anything that changes a case needs full access (enforced
 * by the admin.permission middleware on the route group).
 */
class SafetyReportController extends Controller
{
    private const RELATIONS = [
        'reporterSeeker', 'reporterEmployer', 'filedByAdmin', 'subjectEmployer', 'subjectSeeker',
        'vacancy', 'application', 'assignedAdmin', 'closedByAdmin',
    ];

    public function __construct(private readonly SafetyCaseService $cases) {}

    public function options(): JsonResponse
    {
        $assignees = Administrator::query()
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get()
            ->filter(fn (Administrator $admin) => $admin->canManageModule('constituent_crm'))
            ->map(fn (Administrator $admin) => ['value' => $admin->admin_id, 'label' => trim("{$admin->first_name} {$admin->last_name}")])
            ->values();

        return response()->json([...SafetyReportCatalog::adminOptions(), 'assignees' => $assignees]);
    }

    public function summary(): JsonResponse
    {
        $byStatus = SafetyReport::query()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        $openUrgent = SafetyReport::query()->open()->whereIn('priority', ['high', 'urgent'])->count();
        $bySubject = SafetyReport::query()->open()->selectRaw('subject_type, COUNT(*) as total')->groupBy('subject_type')->pluck('total', 'subject_type');

        return response()->json([
            'total' => (int) $byStatus->sum(),
            'open' => (int) collect(SafetyReportCatalog::OPEN_STATUSES)->sum(fn ($status) => $byStatus->get($status, 0)),
            'submitted' => (int) $byStatus->get(SafetyReportCatalog::STATUS_SUBMITTED, 0),
            'under_review' => (int) $byStatus->get(SafetyReportCatalog::STATUS_UNDER_REVIEW, 0),
            'action_required' => (int) $byStatus->get(SafetyReportCatalog::STATUS_ACTION_REQUIRED, 0),
            'resolved' => (int) $byStatus->get(SafetyReportCatalog::STATUS_RESOLVED, 0),
            'dismissed' => (int) $byStatus->get(SafetyReportCatalog::STATUS_DISMISSED, 0),
            'open_high_priority' => $openUrgent,
            'open_about_employers' => (int) $bySubject->get(SafetyReportCatalog::SUBJECT_EMPLOYER, 0),
            'open_about_seekers' => (int) $bySubject->get(SafetyReportCatalog::SUBJECT_SEEKER, 0),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'string'],
            'priority' => ['nullable', Rule::in(array_keys(SafetyReportCatalog::PRIORITIES))],
            'subject_type' => ['nullable', Rule::in([SafetyReportCatalog::SUBJECT_EMPLOYER, SafetyReportCatalog::SUBJECT_SEEKER])],
            'reporter_type' => ['nullable', Rule::in([SafetyReportCatalog::REPORTER_SEEKER, SafetyReportCatalog::REPORTER_EMPLOYER, SafetyReportCatalog::REPORTER_STAFF])],
            'category' => ['nullable', 'string', 'max:40'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'subject_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'priority'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = SafetyReport::query()->with(self::RELATIONS);

        $status = $request->string('status')->toString();
        if ($status === 'open') {
            $query->open();
        } elseif ($status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }

        foreach (['priority', 'subject_type', 'reporter_type', 'category'] as $filter) {
            $query->when($request->string($filter)->toString(), fn (Builder $q, string $value) => $q->where($filter, $value));
        }

        if ($request->filled('subject_id') && $request->filled('subject_type')) {
            $column = $request->input('subject_type') === SafetyReportCatalog::SUBJECT_EMPLOYER ? 'subject_employer_id' : 'subject_seeker_id';
            $query->where($column, $request->integer('subject_id'));
        }

        $query->when($request->input('date_from'), fn (Builder $q, $date) => $q->whereDate('created_at', '>=', $date));
        $query->when($request->input('date_to'), fn (Builder $q, $date) => $q->whereDate('created_at', '<=', $date));

        if ($search = trim($request->string('search')->toString())) {
            $like = '%'.addcslashes($search, '%_\\').'%';
            $query->where(function (Builder $nested) use ($like) {
                $nested->where('case_number', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereHas('subjectEmployer', fn (Builder $q) => $q->where('company_name', 'like', $like))
                    ->orWhereHas('reporterEmployer', fn (Builder $q) => $q->where('company_name', 'like', $like))
                    ->orWhereHas('subjectSeeker', fn (Builder $q) => $q->where('first_name', 'like', $like)->orWhere('last_name', 'like', $like)->orWhere('email', 'like', $like))
                    ->orWhereHas('reporterSeeker', fn (Builder $q) => $q->where('first_name', 'like', $like)->orWhere('last_name', 'like', $like)->orWhere('email', 'like', $like));
            });
        }

        match ($request->input('sort', 'newest')) {
            'oldest' => $query->oldest('id'),
            'priority' => $query->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END")->oldest('id'),
            default => $query->latest('id'),
        };

        $reports = $query->paginate($request->integer('per_page', 15));
        $reports->through(fn (SafetyReport $report) => $this->row($report));

        return response()->json($reports);
    }

    public function show(Request $request, SafetyReport $safetyReport): JsonResponse
    {
        return response()->json(['report' => $this->detail($safetyReport, $this->canManage($request))]);
    }

    /** Status, priority and assignment — each change is written to the history. */
    public function update(Request $request, SafetyReport $safetyReport): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(array_keys(SafetyReportCatalog::STATUSES))],
            'priority' => ['nullable', Rule::in(array_keys(SafetyReportCatalog::PRIORITIES))],
            'assigned_admin_id' => ['nullable', 'integer'],
            'unassign' => ['nullable', 'boolean'],
            'resolution_summary' => ['nullable', 'string', 'max:5000'],
            'dismissal_reason' => ['nullable', Rule::in(array_keys(SafetyReportCatalog::DISMISSAL_REASONS))],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);
        $admin = $this->admin($request);

        if (! empty($validated['priority'])) {
            $safetyReport = $this->cases->changePriority($safetyReport, $admin, $validated['priority']);
        }
        if ($request->boolean('unassign') || array_key_exists('assigned_admin_id', $validated) && $validated['assigned_admin_id']) {
            $safetyReport = $this->cases->assign($safetyReport, $admin, $request->boolean('unassign') ? null : (int) $validated['assigned_admin_id']);
        }
        if (! empty($validated['status'])) {
            $safetyReport = $this->cases->changeStatus($safetyReport, $admin, $validated['status'], $validated);
        }

        return response()->json(['message' => 'Case updated.', 'report' => $this->detail($safetyReport, true)]);
    }

    public function note(Request $request, SafetyReport $safetyReport): JsonResponse
    {
        $validated = $request->validate(['note' => ['required', 'string', 'min:3', 'max:5000']]);
        $report = $this->cases->addNote($safetyReport, $this->admin($request), $validated['note']);

        return response()->json(['message' => 'Internal note added.', 'report' => $this->detail($report, true)]);
    }

    public function action(Request $request, SafetyReport $safetyReport): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'string'],
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
            'notice' => ['nullable', 'string', 'max:2000'],
            'ends_at' => ['nullable', 'date'],
            'post_id' => ['nullable', 'integer'],
        ], [
            'reason.required' => 'Record the justification for this action.',
            'reason.min' => 'Record the justification for this action (at least 10 characters).',
        ]);

        $report = $this->cases->apply($safetyReport, $this->admin($request), $validated);
        $label = SafetyReportCatalog::actionsFor($report->subject_type)[$validated['action']] ?? 'Action';

        return response()->json(['message' => "{$label} — recorded.", 'report' => $this->detail($report, true)]);
    }

    public function attachment(SafetyReport $safetyReport, SafetyReportAttachment $attachment): StreamedResponse
    {
        abort_unless((int) $attachment->report_id === (int) $safetyReport->id, 404);
        abort_unless(Storage::disk('local')->exists($attachment->stored_path), 404, 'File not found.');

        $name = str_replace('"', '', $attachment->original_filename);

        return Storage::disk('local')->response($attachment->stored_path, $name, [
            'Content-Type' => $attachment->mime_type ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.$name.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    /**
     * Safety history of one employer or job seeker, for the card on their
     * admin profile page: restriction in force plus every case about them.
     */
    public function subject(string $type, int $id): JsonResponse
    {
        abort_unless(in_array($type, [SafetyReportCatalog::SUBJECT_EMPLOYER, SafetyReportCatalog::SUBJECT_SEEKER], true), 404);
        $subject = $type === SafetyReportCatalog::SUBJECT_EMPLOYER
            ? Employer::withTrashed()->findOrFail($id)
            : JobSeeker::query()->findOrFail($id);

        $reports = SafetyReport::query()->about($subject)->with(self::RELATIONS)->latest('id')->limit(20)->get();

        return response()->json([
            'restriction' => $subject->restrictionSummary(),
            'counts' => [
                'total' => SafetyReport::query()->about($subject)->count(),
                'open' => SafetyReport::query()->about($subject)->open()->count(),
                'filed' => SafetyReport::query()->filedBy($subject)->count(),
            ],
            'reports' => $reports->map(fn (SafetyReport $report) => $this->row($report))->values(),
        ]);
    }

    // ── Payloads ────────────────────────────────────────────────────────────

    private function row(SafetyReport $report): array
    {
        return [
            'id' => $report->id,
            'case_number' => $report->case_number,
            'created_at' => $report->created_at?->toIso8601String(),
            'updated_at' => $report->updated_at?->toIso8601String(),
            'reporter_type' => $report->reporter_type,
            'reporter_type_label' => SafetyReportCatalog::reporterLabel($report->reporter_type),
            'reporter_name' => $this->reporterName($report),
            'subject_type' => $report->subject_type,
            'subject_name' => $report->subjectName(),
            'subject_id' => $report->subject_type === SafetyReportCatalog::SUBJECT_EMPLOYER ? $report->subject_employer_id : $report->subject_seeker_id,
            'category' => $report->category,
            'category_label' => $report->categoryLabel(),
            'status' => $report->status,
            'status_label' => $report->statusLabel(),
            'priority' => $report->priority,
            'priority_label' => SafetyReportCatalog::PRIORITIES[$report->priority] ?? $report->priority,
            'vacancy_title' => $report->vacancy?->job_title,
            'application_id' => $report->application_id,
            'assigned_to' => $report->assignedAdmin ? trim("{$report->assignedAdmin->first_name} {$report->assignedAdmin->last_name}") : null,
        ];
    }

    private function detail(SafetyReport $report, bool $canManage): array
    {
        $report->loadMissing([...self::RELATIONS, 'attachments', 'events.admin', 'application.jobVacancy']);
        $subject = $report->subject();
        $reporter = $report->reporter();

        return [
            ...$this->row($report),
            'description' => $report->description,
            'incident_date' => $report->incident_date?->toDateString(),
            'review_id' => $report->review_id,
            'dismissal_reason' => $report->dismissal_reason,
            'dismissal_reason_label' => $report->dismissal_reason ? (SafetyReportCatalog::DISMISSAL_REASONS[$report->dismissal_reason] ?? $report->dismissal_reason) : null,
            'resolution_summary' => $report->resolution_summary,
            'closed_at' => $report->closed_at?->toIso8601String(),
            'closed_by' => $report->closedByAdmin ? trim("{$report->closedByAdmin->first_name} {$report->closedByAdmin->last_name}") : null,
            'assigned_admin_id' => $report->assigned_admin_id,
            'can_manage' => $canManage,

            'reporter' => [
                'type' => $report->reporter_type,
                'type_label' => SafetyReportCatalog::reporterLabel($report->reporter_type),
                'id' => $reporter?->getKey(),
                'name' => $this->reporterName($report),
                // Contact details are for staff who can act on the case.
                'email' => $canManage ? ($reporter->email ?? $report->filedByAdmin?->email) : null,
                'mobile_number' => $canManage ? ($reporter instanceof JobSeeker ? $reporter->mobile_number : ($reporter instanceof Employer ? ($reporter->mobile_number ?: $reporter->representative_contact_number) : null)) : null,
                'contact_hidden' => ! $canManage,
                'history' => $reporter ? [
                    'filed' => SafetyReport::query()->filedBy($reporter)->count(),
                    'dismissed_false' => SafetyReport::query()->filedBy($reporter)->where('dismissal_reason', 'false_report')->count(),
                    'open' => SafetyReport::query()->filedBy($reporter)->open()->count(),
                ] : null,
            ],

            'subject' => [
                'type' => $report->subject_type,
                'id' => $subject?->getKey(),
                'name' => $report->subjectName(),
                'exists' => $subject !== null && ! ($subject instanceof Employer && $subject->trashed()),
                'email' => $subject->email ?? null,
                'verification_status' => $subject->verification_status ?? null,
                'restriction' => $subject?->restrictionSummary(),
                'reports_about' => $subject ? SafetyReport::query()->about($subject)->count() : 0,
                'open_reports_about' => $subject ? SafetyReport::query()->about($subject)->open()->count() : 0,
                'other_cases' => $subject ? SafetyReport::query()->about($subject)->whereKeyNot($report->id)->latest('id')->limit(5)->get()
                    ->map(fn (SafetyReport $other) => [
                        'id' => $other->id, 'case_number' => $other->case_number, 'category_label' => $other->categoryLabel(),
                        'status' => $other->status, 'status_label' => $other->statusLabel(), 'created_at' => $other->created_at?->toIso8601String(),
                    ])->values() : [],
                'vacancies' => $subject instanceof Employer ? JobVacancy::query()->where('employer_id', $subject->employer_id)->latest('post_id')->limit(50)->get()
                    ->map(fn (JobVacancy $vacancy) => [
                        'post_id' => $vacancy->post_id, 'job_title' => $vacancy->job_title, 'status' => $vacancy->status, 'on_hold' => $vacancy->isOnAdminHold(),
                    ])->values() : [],
            ],

            'vacancy' => $report->vacancy ? [
                'post_id' => $report->vacancy->post_id,
                'job_title' => $report->vacancy->job_title,
                'status' => $report->vacancy->status,
                'on_hold' => $report->vacancy->isOnAdminHold(),
                'hold_reason' => $report->vacancy->admin_hold_reason,
                'location' => $report->vacancy->city_municipality ?? $report->vacancy->location ?? null,
                'created_at' => $report->vacancy->created_at?->toIso8601String(),
            ] : null,

            'application' => $report->application ? [
                'id' => $report->application->apply_id,
                'status' => $report->application->status,
                'job_title' => $report->application->jobVacancy?->job_title,
                'applied_at' => $report->application->created_at?->toIso8601String(),
                'status_changed_at' => $report->application->status_changed_at?->toIso8601String(),
            ] : null,

            'attachments' => $report->attachments->map(fn (SafetyReportAttachment $file) => [
                'id' => $file->id,
                'name' => $file->original_filename,
                'mime_type' => $file->mime_type,
                'size' => $file->file_size,
                'uploaded_by' => $file->uploaded_by,
                'created_at' => $file->created_at?->toIso8601String(),
            ])->values(),

            'timeline' => $report->events->map(fn (SafetyReportEvent $event) => $this->timelineEntry($report, $event))->values(),

            'available_actions' => collect(SafetyReportCatalog::actionsFor($report->subject_type))
                ->map(fn (string $label, string $value) => [
                    'value' => $value,
                    'label' => $label,
                    'notifies' => in_array($value, SafetyReportCatalog::NOTIFYING_ACTIONS, true),
                    'needs_end_date' => in_array($value, ['restrict_account', 'suspend_account'], true),
                    'needs_vacancy' => in_array($value, ['hide_vacancy', 'restore_vacancy'], true),
                    'severe' => in_array($value, ['suspend_account', 'restrict_account', 'hide_vacancy'], true),
                ])->values(),
        ];
    }

    private function timelineEntry(SafetyReport $report, SafetyReportEvent $event): array
    {
        $actor = match ($event->actor_type) {
            'admin' => $event->admin ? trim("{$event->admin->first_name} {$event->admin->last_name}") : 'PESO staff',
            'reporter' => $this->reporterName($report).' (reporter)',
            default => 'System',
        };

        $title = match ($event->kind) {
            SafetyReportEvent::KIND_SUBMITTED => 'Report submitted',
            SafetyReportEvent::KIND_REPORTER_UPDATE => 'Reporter added information',
            SafetyReportEvent::KIND_STATUS => 'Status: '.(SafetyReportCatalog::STATUSES[$event->from_value] ?? $event->from_value).' → '.(SafetyReportCatalog::STATUSES[$event->to_value] ?? $event->to_value),
            SafetyReportEvent::KIND_PRIORITY => 'Priority: '.(SafetyReportCatalog::PRIORITIES[$event->from_value] ?? $event->from_value).' → '.(SafetyReportCatalog::PRIORITIES[$event->to_value] ?? $event->to_value),
            SafetyReportEvent::KIND_ASSIGNED => 'Assigned to '.($event->body ?: 'nobody'),
            SafetyReportEvent::KIND_NOTE => 'Internal note',
            SafetyReportEvent::KIND_ACTION => 'Action: '.($event->meta['label'] ?? $event->to_value),
            default => ucfirst(str_replace('_', ' ', $event->kind)),
        };

        return [
            'id' => $event->id,
            'kind' => $event->kind,
            'title' => $title,
            'actor' => $actor,
            'body' => $event->kind === SafetyReportEvent::KIND_ASSIGNED ? null : $event->body,
            'notice' => $event->meta['notice'] ?? null,
            'meta' => collect($event->meta ?? [])->only(['ends_at', 'vacancy_title', 'vacancies_held', 'vacancies_released', 'attachments', 'dismissal_reason'])->all(),
            'created_at' => $event->created_at?->toIso8601String(),
        ];
    }

    private function reporterName(SafetyReport $report): string
    {
        if ($report->reporter_type === SafetyReportCatalog::REPORTER_STAFF) {
            return $report->filedByAdmin ? 'PESO — '.trim("{$report->filedByAdmin->first_name} {$report->filedByAdmin->last_name}") : 'PESO staff';
        }

        $reporter = $report->reporter();
        if (! $reporter) {
            return 'Deleted account';
        }

        return $reporter instanceof Employer
            ? ($reporter->company_name ?: 'Unnamed employer')
            : (trim("{$reporter->first_name} {$reporter->last_name}") ?: 'Unnamed job seeker');
    }

    private function canManage(Request $request): bool
    {
        $admin = $request->user();

        return $admin instanceof Administrator && $admin->canManageModule('constituent_crm');
    }

    private function admin(Request $request): Administrator
    {
        return $request->user();
    }
}
