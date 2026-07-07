<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobFairRequirement extends Model
{
    protected $fillable = ['job_fair_id', 'code', 'label', 'is_required', 'sort_order'];
    protected $casts = ['is_required' => 'boolean', 'sort_order' => 'integer'];

    public function jobFair(): BelongsTo { return $this->belongsTo(JobFair::class, 'job_fair_id', 'job_fair_id'); }
    public function submissions(): HasMany { return $this->hasMany(JobFairRequirementSubmission::class); }
}
