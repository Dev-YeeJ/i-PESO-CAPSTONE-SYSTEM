<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class GovernmentProgram extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'program_id';

    protected $fillable = [
        'admin_id',
        'program_name',
        'category',
        'slug',
        'short_description',
        'description',
        'target_beneficiaries',
        'eligibility_requirements',
        'required_documents',
        'target_industry',
        'target_occupation_id',
        'schedule',
        'venue',
        'location_address',
        'latitude',
        'longitude',
        'start_date',
        'end_date',
        'application_deadline',
        'slot_limit',
        'total_slots',
        'available_slots',
        'status',
        'program_status',
        'visibility',
        'contact_person',
        'contact_email',
        'contact_phone',
        'attachment_path',
        'published_at',
        'archived_at',
    ];

    protected $casts = [
        'eligibility_requirements' => 'array',
        'required_documents' => 'array',
        'schedule' => 'datetime',
        'start_date' => 'date',
        'end_date' => 'date',
        'application_deadline' => 'date',
        'latitude' => 'float',
        'longitude' => 'float',
        'slot_limit' => 'integer',
        'total_slots' => 'integer',
        'available_slots' => 'integer',
        'published_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saving(function (GovernmentProgram $program) {
            $program->slot_limit = $program->total_slots;
            $program->schedule = $program->start_date?->startOfDay() ?? $program->schedule;
            $program->status = match ($program->program_status) {
                'completed' => 'completed',
                'closed', 'archived', 'draft' => 'closed',
                default => 'open',
            };
        });
    }

    public function administrator(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'admin_id', 'admin_id');
    }

    public function targetOccupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class, 'target_occupation_id');
    }

    public function skills(): HasMany
    {
        return $this->hasMany(GovernmentProgramSkill::class, 'government_program_id', 'program_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(ProgramApplication::class, 'program_id', 'program_id');
    }

    public function skillDemands(): HasMany
    {
        return $this->hasMany(EmployerSkillDemand::class, 'linked_program_id', 'program_id');
    }

    public function isAcceptingApplications(): bool
    {
        return $this->program_status === 'open'
            && $this->visibility === 'public'
            && (! $this->application_deadline || $this->application_deadline->isToday() || $this->application_deadline->isFuture())
            && ($this->total_slots === 0 || $this->available_slots > 0);
    }
}
