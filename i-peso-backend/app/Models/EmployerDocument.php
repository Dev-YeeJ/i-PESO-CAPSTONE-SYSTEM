<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'expiration_date',
        'viewed_at',
        'staff_viewed_at',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
        'expiration_date' => 'date',
        'viewed_at' => 'datetime',
        'staff_viewed_at' => 'datetime',
    ];

    /**
     * Get the employer that owns this document.
     */
    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }

    /**
     * Which staff accounts have opened this file (one row per account).
     */
    public function views(): HasMany
    {
        return $this->hasMany(EmployerDocumentView::class, 'document_id', 'document_id');
    }

    /**
     * A replacement file has been seen by nobody — drop every account's view so
     * each reviewer has to open the new upload before deciding on it.
     */
    public function forgetViews(): void
    {
        $this->views()->delete();
    }
}
