<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class Application extends Model
{
    protected $table = 'applications';

    protected $primaryKey = 'apply_id';

    protected $fillable = [
        'post_id',
        'seeker_id',
        'job_fair_id',
        'is_hots',
        'dole_mismatch_code',
        'employer_mismatch_reason_code',
        'seeker_mismatch_reason_code',
        'mismatch_reason_details',
        'match_percentage',
        'status',
        'status_changed_at',
        'status_changed_by',
        'employer_remarks',
        'placement_start_date',
        'placement_salary',
        'placement_employment_type',
        'placement_captured_at',
        'submitted_documents',
    ];

    protected $casts = [
        'match_percentage' => 'decimal:2',
        'is_hots' => 'boolean',
        'status_changed_at' => 'datetime',
        'placement_start_date' => 'date',
        'placement_salary' => 'decimal:2',
        'placement_captured_at' => 'datetime',
        'submitted_documents' => 'array',
    ];

    protected static function booted(): void
    {
        static::saved(function (self $application): void {
            if (! $application->job_fair_id
                || ! $application->wasChanged(['is_hots', 'job_fair_id', 'post_id'])
                || ! Schema::hasTable('job_fair_result_reports')
                || ! Schema::hasColumn('applications', 'job_fair_id')) {
                return;
            }

            $employerId = DB::table('job_vacancies')
                ->where('post_id', $application->post_id)
                ->value('employer_id');

            if (! $employerId) {
                return;
            }

            DB::table('job_fair_result_reports')
                ->where('job_fair_id', $application->job_fair_id)
                ->where('employer_id', $employerId)
                ->get(['id'])
                ->each(function (object $report) use ($application, $employerId): void {
                    $totalHots = DB::table('applications')
                        ->join('job_vacancies', 'job_vacancies.post_id', '=', 'applications.post_id')
                        ->where('applications.job_fair_id', $application->job_fair_id)
                        ->where('job_vacancies.employer_id', $employerId)
                        ->where('applications.is_hots', true)
                        ->count();

                    DB::table('job_fair_result_reports')
                        ->where('id', $report->id)
                        ->update(['total_hots' => $totalHots, 'updated_at' => now()]);
                });
        });
    }

    public function jobVacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'post_id', 'post_id');
    }

    public function jobSeeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function jobFair(): BelongsTo
    {
        return $this->belongsTo(JobFair::class, 'job_fair_id', 'job_fair_id');
    }

    public function interviewSchedule(): HasOne
    {
        return $this->hasOne(InterviewSchedule::class, 'apply_id', 'apply_id');
    }
}
