<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SeekerTraining extends Model
{
    protected $table = 'seeker_trainings';

    protected $primaryKey = 'id';

    protected $keyType = 'int';

    public $timestamps = true;

    protected $fillable = [
        'seeker_id',
        'course',
        'normalized_course',
        'hours_of_training',
        'training_institution',
        'skills_acquired',
        'certificates_received',
        'normalized_certificates',
    ];

    protected $casts = [
        'hours_of_training' => 'integer',
    ];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(SeekerCertificate::class, 'training_id');
    }
}
