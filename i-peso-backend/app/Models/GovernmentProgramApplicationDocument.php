<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GovernmentProgramApplicationDocument extends Model
{
    protected $primaryKey = 'document_id';

    protected $fillable = [
        'application_id',
        'document_type',
        'document_name',
        'file_path',
        'original_filename',
        'mime_type',
        'size',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(ProgramApplication::class, 'application_id', 'prog_apply_id');
    }
}
