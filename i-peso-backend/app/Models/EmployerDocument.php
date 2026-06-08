<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployerDocument extends Model
{
    protected $table = 'employer_documents';
    protected $primaryKey = 'document_id';

    protected $fillable = [
        'employer_id',
        'document_type',
        'document_path',
        'original_filename',
        'file_size',
        'mime_type',
        'uploaded_at',
        'verification_status', // pending, approved, rejected
        'admin_notes',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
    ];

    /**
     * Get the employer that owns this document.
     */
    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }
}
