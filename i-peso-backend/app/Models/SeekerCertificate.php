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
        'title',
        'issuing_body',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'issued_at',
    ];

    protected $casts = [
        'issued_at' => 'date',
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
}
