<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobFair extends Model
{
    protected $table = 'job_fairs';

    protected $primaryKey = 'job_fair_id';

    protected $fillable = [
        'admin_id',
        'created_by',
        'title',
        'description',
        'start_date',
        'end_date',
        'venue',
        'sector',
        'event_date',
        'start_time',
        'end_time',
        'status',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'event_date' => 'date',
    ];

    public function administrator(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'admin_id', 'admin_id');
    }

    public function employerJoins(): HasMany
    {
        return $this->hasMany(JobFairEmployer::class, 'job_fair_id', 'job_fair_id');
    }

    public function vacancyLinks(): HasMany
    {
        return $this->hasMany(JobFairVacancy::class, 'job_fair_id', 'job_fair_id');
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(JobFairAttendee::class, 'job_fair_id', 'job_fair_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'job_fair_id', 'job_fair_id');
    }
}
