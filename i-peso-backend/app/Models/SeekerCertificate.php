<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerCertificate extends Model
{
    protected $primaryKey = 'certificate_id';

    protected $fillable = [
        'seeker_id',
        'program_application_id',
        'training_id',
        'title',
        'issuing_body',
        'category',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'issued_at',
        'expires_at',
        'credential_number',
        'description',
    ];

    protected $casts = [
        'issued_at' => 'date',
        'expires_at' => 'date',
        'training_id' => 'integer',
        'file_size' => 'integer',
    ];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }

    public function programApplication(): BelongsTo
    {
        return $this->belongsTo(ProgramApplication::class, 'program_application_id', 'prog_apply_id');
    }

    public function training(): BelongsTo
    {
        return $this->belongsTo(SeekerTraining::class, 'training_id');
    }
}
