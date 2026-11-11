<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Supporting evidence for a case, kept on the private disk. */
class SafetyReportAttachment extends Model
{
    protected $table = 'safety_report_attachments';

    protected $fillable = [
        'report_id',
        'original_filename',
        'stored_path',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(SafetyReport::class, 'report_id');
    }
}
