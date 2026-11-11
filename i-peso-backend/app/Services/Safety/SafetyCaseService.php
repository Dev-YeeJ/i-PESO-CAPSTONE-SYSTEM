<?php

namespace App\Services\Safety;

use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\SafetyReport;
use App\Models\SafetyReportEvent;
use App\Notifications\SafetyActionNotice;
use App\Services\ActivityLogger;
use App\Support\SafetyReportCatalog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * PESO's side of a case: moving it through the review workflow and recording
 * the actions taken. Every change is written to the case history so who did
 * what, when and why can always be reconstructed.
 *
 * Nothing here runs because a report was filed. Restrictions, suspensions and
 * vacancy holds only happen through apply(), called by an administrator with
 * a written justification.
 */
class SafetyCaseService
{
    public function __construct(private readonly SafetyReportService $reports) {}

    // ── Workflow ────────────────────────────────────────────────────────────

    public function changeStatus(SafetyReport $report, Administrator $admin, string $status, array $data = []): SafetyReport
    {
        $from = $report->status;
        if ($from === $status) {
            return $report;
        }

        $closing = in_array($status, SafetyReportCatalog::CLOSED_STATUSES, true);
        $reopening = ! $closing && in_array($from, SafetyReportCatalog::CLOSED_STATUSES, true);
        $summary = trim((string) ($data['resolution_summary'] ?? ''));

        if ($closing && mb_strlen($summary) < 10) {
            throw ValidationException::withMessages([
                'resolution_summary' => ['Document the reason for '.($status === SafetyReportCatalog::STATUS_DISMISSED ? 'dismissing' : 'resolving').' this report (at least 10 characters).'],
            ]);
        }

        if ($status === SafetyReportCatalog::STATUS_DISMISSED && ! array_key_exists($data['dismissal_reason'] ?? '', SafetyReportCatalog::DISMISSAL_REASONS)) {
            throw ValidationException::withMessages(['dismissal_reason' => ['Choose why this report is being dismissed.']]);
        }

        if ($reopening && mb_strlen(trim((string) ($data['note'] ?? ''))) < 10) {
            throw ValidationException::withMessages(['note' => ['Explain why this closed case is being reopened.']]);
        }

        $reviewedBefore = $report->events()
            ->where('kind', SafetyReportEvent::KIND_STATUS)
            ->where('to_value', SafetyReportCatalog::STATUS_UNDER_REVIEW)
            ->exists();

        DB::transaction(function () use ($report, $admin, $status, $from, $closing, $reopening, $summary, $data) {
            $report->status = $status;

            if ($closing) {
                // Recorded only on the transition into a closed state, so a later
                // edit never re-attributes who closed the case or when.
                $report->resolution_summary = $summary;
                $report->dismissal_reason = $status === SafetyReportCatalog::STATUS_DISMISSED ? $data['dismissal_reason'] : null;
                $report->closed_by_admin_id = $admin->admin_id;
                $report->closed_at = now();
            } elseif ($reopening) {
                $report->dismissal_reason = null;
                $report->closed_by_admin_id = null;
                $report->closed_at = null;
            }

            $report->save();

            $report->events()->create([
                'actor_type' => 'admin',
                'actor_admin_id' => $admin->admin_id,
                'kind' => SafetyReportEvent::KIND_STATUS,
                'from_value' => $from,
                'to_value' => $status,
                'body' => $closing ? $summary : (filled($data['note'] ?? null) ? trim($data['note']) : null),
                'meta' => $status === SafetyReportCatalog::STATUS_DISMISSED ? ['dismissal_reason' => $data['dismissal_reason']] : null,
            ]);
        });

        ActivityLogger::log('updated_safety_report_status', sprintf(
            'Moved safety report %s from %s to %s.',
            $report->case_number,
            SafetyReportCatalog::STATUSES[$from] ?? $from,
            SafetyReportCatalog::STATUSES[$status] ?? $status,
        ));

        // The reporter hears about the first review and the outcome — not
        // every internal back-and-forth.
        if ($status === SafetyReportCatalog::STATUS_UNDER_REVIEW && ! $reviewedBefore) {
            $this->reports->notifyReporter($report, 'under_review');
        } elseif ($closing) {
            $this->reports->notifyReporter($report, $status);
        }

        return $report->fresh();
    }

    public function changePriority(SafetyReport $report, Administrator $admin, string $priority, ?string $note = null): SafetyReport
    {
        if ($report->priority === $priority) {
            return $report;
        }

        $from = $report->priority;
        $report->update(['priority' => $priority]);
        $report->events()->create([
            'actor_type' => 'admin', 'actor_admin_id' => $admin->admin_id, 'kind' => SafetyReportEvent::KIND_PRIORITY,
            'from_value' => $from, 'to_value' => $priority, 'body' => filled($note) ? trim($note) : null,
        ]);

        return $report->fresh();
    }

    public function assign(SafetyReport $report, Administrator $admin, ?int $assigneeId): SafetyReport
    {
        if ((int) $report->assigned_admin_id === (int) $assigneeId) {
            return $report;
        }

        $assignee = $assigneeId ? Administrator::query()->find($assigneeId) : null;
        if ($assigneeId && (! $assignee || ! $assignee->canManageModule('constituent_crm'))) {
            throw ValidationException::withMessages(['assigned_admin_id' => ['Assign the case to a staff member with full Constituent CRM access.']]);
        }

        $report->update(['assigned_admin_id' => $assignee?->admin_id]);
        $report->events()->create([
            'actor_type' => 'admin', 'actor_admin_id' => $admin->admin_id, 'kind' => SafetyReportEvent::KIND_ASSIGNED,
            'to_value' => $assignee ? (string) $assignee->admin_id : null,
            'body' => $assignee ? trim("{$assignee->first_name} {$assignee->last_name}") : 'Unassigned',
        ]);

        return $report->fresh();
    }

    public function addNote(SafetyReport $report, Administrator $admin, string $note): SafetyReport
    {
        $report->events()->create([
            'actor_type' => 'admin', 'actor_admin_id' => $admin->admin_id, 'kind' => SafetyReportEvent::KIND_NOTE, 'body' => trim($note),
        ]);
        $report->touch();

        return $report->fresh();
    }

    // ── Actions ─────────────────────────────────────────────────────────────

    /**
     * @param  array{action: string, reason: string, notice?: string|null, ends_at?: string|null, post_id?: int|null}  $data
     */
    public function apply(SafetyReport $report, Administrator $admin, array $data): SafetyReport
    {
        $action = $data['action'];
        $allowed = SafetyReportCatalog::actionsFor($report->subject_type);
        if (! array_key_exists($action, $allowed)) {
            throw ValidationException::withMessages(['action' => ['That action is not available for this kind of report.']]);
        }

        $subject = $report->subject();
        $needsSubject = ! in_array($action, ['no_action', 'escalate_external'], true);
        if ($needsSubject && (! $subject || ($subject instanceof Employer && $subject->trashed()))) {
            throw ValidationException::withMessages(['action' => ['The reported account no longer exists, so only "no action" or an external escalation can be recorded.']]);
        }

        $notifies = in_array($action, SafetyReportCatalog::NOTIFYING_ACTIONS, true);
        $notice = trim((string) ($data['notice'] ?? ''));
        if ($notifies && mb_strlen($notice) < 10) {
            throw ValidationException::withMessages([
                'notice' => ['Write the notice the reported party will receive (at least 10 characters). Do not name the reporter.'],
            ]);
        }

        $endsAt = $this->endsAt($data['ends_at'] ?? null, $action);
        $meta = ['action' => $action, 'label' => $allowed[$action]];
        $vacancy = null;

        DB::transaction(function () use ($report, $admin, $action, $subject, $data, $notice, $endsAt, &$meta, &$vacancy) {
            switch ($action) {
                case 'hide_vacancy':
                    $vacancy = $this->vacancyFor($report, $data['post_id'] ?? null);
                    if ($vacancy->isOnAdminHold()) {
                        throw ValidationException::withMessages(['post_id' => ['That vacancy is already hidden by PESO.']]);
                    }
                    $this->holdVacancy($vacancy, $report, $data['reason']);
                    $meta['post_id'] = $vacancy->post_id;
                    $meta['vacancy_title'] = $vacancy->job_title;
                    break;

                case 'restore_vacancy':
                    $vacancy = $this->vacancyFor($report, $data['post_id'] ?? null);
                    if (! $vacancy->isOnAdminHold()) {
                        throw ValidationException::withMessages(['post_id' => ['That vacancy is not on hold.']]);
                    }
                    $this->releaseVacancy($vacancy);
                    $meta['post_id'] = $vacancy->post_id;
                    $meta['vacancy_title'] = $vacancy->job_title;
                    break;

                case 'restrict_account':
                case 'suspend_account':
                    $type = $action === 'suspend_account' ? Employer::RESTRICTION_SUSPENDED : Employer::RESTRICTION_LIMITED;
                    $subject->forceFill([
                        'account_restriction' => $type,
                        'restriction_ends_at' => $endsAt,
                        'restriction_reason' => $data['reason'],
                        'restricted_at' => now(),
                        'restriction_report_id' => $report->id,
                    ])->save();
                    $meta['restriction'] = $type;
                    $meta['ends_at'] = $endsAt?->toIso8601String();

                    if ($type === Employer::RESTRICTION_SUSPENDED) {
                        // Ends every active session on web and mobile at once.
                        $subject->tokens()->delete();

                        // A suspended employer's vacancies must not stay open to seekers.
                        if ($subject instanceof Employer) {
                            $held = 0;
                            JobVacancy::query()
                                ->where('employer_id', $subject->employer_id)
                                ->where('status', 'active')
                                ->whereNull('admin_hold_at')
                                ->get()
                                ->each(function (JobVacancy $item) use ($report, $data, &$held) {
                                    $this->holdVacancy($item, $report, 'Employer account suspended: '.$data['reason']);
                                    $held++;
                                });
                            $meta['vacancies_held'] = $held;
                        }
                    }
                    break;

                case 'lift_restriction':
                    if (! $subject->isRestricted()) {
                        throw ValidationException::withMessages(['action' => ['This account has no active restriction to lift.']]);
                    }
                    $meta['lifted'] = $subject->activeRestriction();
                    $subject->forceFill([
                        'account_restriction' => null,
                        'restriction_ends_at' => null,
                        'restriction_reason' => null,
                        'restricted_at' => null,
                        'restriction_report_id' => null,
                    ])->save();

                    // Release only the vacancies a suspension under this case held.
                    if ($subject instanceof Employer) {
                        $released = 0;
                        JobVacancy::query()
                            ->where('employer_id', $subject->employer_id)
                            ->whereNotNull('admin_hold_at')
                            ->where('admin_hold_reason', 'like', 'Employer account suspended:%')
                            ->get()
                            ->each(function (JobVacancy $item) use (&$released) {
                                $this->releaseVacancy($item);
                                $released++;
                            });
                        $meta['vacancies_released'] = $released;
                    }
                    break;

                default:
                    // no_action, warning, request_verification, request_clarification,
                    // escalate_external: recorded (and noticed, where applicable) only.
                    break;
            }

            if ($notice !== '') {
                $meta['notice'] = $notice;
            }

            $report->events()->create([
                'actor_type' => 'admin',
                'actor_admin_id' => $admin->admin_id,
                'kind' => SafetyReportEvent::KIND_ACTION,
                'to_value' => $action,
                'body' => trim($data['reason']),
                'meta' => $meta,
            ]);
            $report->touch();
        });

        ActivityLogger::log('safety_action_'.$action, sprintf(
            'Recorded "%s" on safety report %s about %s.',
            $allowed[$action], $report->case_number, $report->subjectName()
        ));

        if ($notifies && $subject) {
            try {
                $subject->notify(new SafetyActionNotice($action, $notice, $endsAt, $vacancy?->job_title));
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return $report->fresh();
    }

    private function endsAt(?string $value, string $action): ?Carbon
    {
        if (! in_array($action, ['restrict_account', 'suspend_account'], true) || blank($value)) {
            return null;
        }

        $endsAt = Carbon::parse($value, 'Asia/Manila')->endOfDay();
        $max = now()->addDays((int) config('safety_reports.max_restriction_days', 365));

        if ($endsAt->isPast() || $endsAt->greaterThan($max)) {
            throw ValidationException::withMessages([
                'ends_at' => ['Choose an end date after today and within '.config('safety_reports.max_restriction_days', 365).' days, or leave it empty for "until lifted".'],
            ]);
        }

        return $endsAt;
    }

    private function vacancyFor(SafetyReport $report, ?int $postId): JobVacancy
    {
        $postId = $postId ?: $report->post_id;
        $vacancy = $postId ? JobVacancy::query()->find($postId) : null;

        if (! $vacancy || (int) $vacancy->employer_id !== (int) $report->subject_employer_id) {
            throw ValidationException::withMessages(['post_id' => ['Choose one of the reported employer\'s vacancies.']]);
        }

        return $vacancy;
    }

    private function holdVacancy(JobVacancy $vacancy, SafetyReport $report, string $reason): void
    {
        $vacancy->forceFill([
            'admin_hold_at' => now(),
            'admin_hold_reason' => $reason,
            'admin_hold_previous_status' => $vacancy->status,
            'admin_hold_report_id' => $report->id,
            // Every seeker-facing query already filters on status = active,
            // so closing it is what actually takes it out of search and maps.
            'status' => 'closed',
        ])->save();
    }

    private function releaseVacancy(JobVacancy $vacancy): void
    {
        $previous = $vacancy->admin_hold_previous_status;
        $vacancy->forceFill([
            'admin_hold_at' => null,
            'admin_hold_reason' => null,
            'admin_hold_previous_status' => null,
            'admin_hold_report_id' => null,
            // Never reopen straight to active: an expired deadline or an
            // employer who meanwhile filled the post should decide that.
            'status' => $previous === 'draft' ? 'draft' : 'closed',
        ])->save();
    }
}
