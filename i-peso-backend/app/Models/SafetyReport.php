<?php

namespace App\Models;

use App\Support\SafetyReportCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A Report & Safety Management case: a job seeker's report about an employer,
 * an employer's report about a job seeker, or a case PESO opened itself.
 *
 * A report is an allegation to be reviewed, never proof — nothing about the
 * reported party changes until an administrator records an action.
 */
class SafetyReport extends Model
{
    protected $table = 'safety_reports';

    protected $fillable = [
        'reporter_type',
        'reporter_seeker_id',
        'reporter_employer_id',
        'filed_by_admin_id',
        'subject_type',
        'subject_employer_id',
        'subject_seeker_id',
        'post_id',
        'application_id',
        'review_id',
        'category',
        'description',
        'incident_date',
        'status',
        'priority',
        'assigned_admin_id',
        'dismissal_reason',
        'resolution_summary',
        'closed_by_admin_id',
        'closed_at',
    ];

    protected $casts = [
        'incident_date' => 'date',
        'closed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::created(function (SafetyReport $report) {
            if (! $report->case_number) {
                $report->forceFill([
                    'case_number' => sprintf('RPT-%s-%05d', ($report->created_at ?? now())->format('Y'), $report->id),
                ])->saveQuietly();
            }
        });
    }

    // ── Relations ───────────────────────────────────────────────────────────

    public function reporterSeeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'reporter_seeker_id', 'seeker_id');
    }

    public function reporterEmployer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'reporter_employer_id', 'employer_id')->withTrashed();
    }

    public function filedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'filed_by_admin_id', 'admin_id');
    }

    public function subjectEmployer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'subject_employer_id', 'employer_id')->withTrashed();
    }

    public function subjectSeeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'subject_seeker_id', 'seeker_id');
    }

    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'post_id', 'post_id');
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class, 'application_id', 'apply_id');
    }

    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'assigned_admin_id', 'admin_id');
    }

    public function closedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'closed_by_admin_id', 'admin_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(SafetyReportEvent::class, 'report_id')->orderBy('id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(SafetyReportAttachment::class, 'report_id')->orderBy('id');
    }

    // ── Scopes ──────────────────────────────────────────────────────────────

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereIn('status', SafetyReportCatalog::OPEN_STATUSES);
    }

    /** Reports filed by this user (a JobSeeker or an Employer). */
    public function scopeFiledBy(Builder $query, Model $user): Builder
    {
        return $user instanceof Employer
            ? $query->where('reporter_type', SafetyReportCatalog::REPORTER_EMPLOYER)->where('reporter_employer_id', $user->getKey())
            : $query->where('reporter_type', SafetyReportCatalog::REPORTER_SEEKER)->where('reporter_seeker_id', $user->getKey());
    }

    /** Reports about this user (a JobSeeker or an Employer). */
    public function scopeAbout(Builder $query, Model $user): Builder
    {
        return $user instanceof Employer
            ? $query->where('subject_type', SafetyReportCatalog::SUBJECT_EMPLOYER)->where('subject_employer_id', $user->getKey())
            : $query->where('subject_type', SafetyReportCatalog::SUBJECT_SEEKER)->where('subject_seeker_id', $user->getKey());
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    public function isOpen(): bool
    {
        return in_array($this->status, SafetyReportCatalog::OPEN_STATUSES, true);
    }

    public function subject(): Employer|JobSeeker|null
    {
        return $this->subject_type === SafetyReportCatalog::SUBJECT_EMPLOYER ? $this->subjectEmployer : $this->subjectSeeker;
    }

    public function reporter(): Employer|JobSeeker|null
    {
        return match ($this->reporter_type) {
            SafetyReportCatalog::REPORTER_SEEKER => $this->reporterSeeker,
            SafetyReportCatalog::REPORTER_EMPLOYER => $this->reporterEmployer,
            default => null,
        };
    }

    public function subjectName(): string
    {
        $subject = $this->subject();
        if (! $subject) {
            return 'Deleted account';
        }

        return $subject instanceof Employer
            ? ($subject->company_name ?: ($subject->trade_name ?? null) ?: 'Unnamed employer')
            : (trim("{$subject->first_name} {$subject->last_name}") ?: 'Unnamed job seeker');
    }

    public function categoryLabel(): string
    {
        return SafetyReportCatalog::categoryLabel($this->category, $this->subject_type);
    }

    public function statusLabel(): string
    {
        return SafetyReportCatalog::STATUSES[$this->status] ?? $this->status;
    }
}
