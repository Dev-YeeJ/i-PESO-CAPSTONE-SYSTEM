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
        'description',
        'eligibility_requirements',
        'eligibility_rules',
        'target_industry',
        'target_occupation_id',
        'schedule',
        'location_address',
        'latitude',
        'longitude',
        'application_deadline',
        'slot_limit',
        'total_slots',
        'available_slots',
        'status',
        'program_status',
        'visibility',
        'attachment_path',
        'published_at',
        'archived_at',
    ];

    protected $casts = [
        'eligibility_requirements' => 'array',
        'eligibility_rules' => 'array',
        'schedule' => 'datetime',
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

            if ($program->application_deadline && $program->application_deadline->isPast()) {
                $program->program_status = 'closed';
            } else {
                if (! in_array($program->program_status, ['draft', 'archived', 'closed'], true)) {
                    $program->program_status = 'open';
                }
            }

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

    public function isAcceptingApplications(): bool
    {
        return $this->program_status === 'open'
            && $this->visibility === 'public'
            && (! $this->application_deadline || $this->application_deadline->isToday() || $this->application_deadline->isFuture())
            && ($this->total_slots === 0 || $this->available_slots > 0);
    }

    public function getVenueAttribute(): string
    {
        return 'PESO Office, Urdaneta City Hall';
    }
}
