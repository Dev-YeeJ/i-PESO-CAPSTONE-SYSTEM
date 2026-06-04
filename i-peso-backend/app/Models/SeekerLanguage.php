<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerLanguage extends Model
{
    protected $table      = 'seeker_languages';
    protected $primaryKey = 'id';
    protected $keyType    = 'int';
    public $timestamps    = true;
    
    protected $fillable = [
        'seeker_id', 'language', 'language_other',
        'can_read', 'can_write', 'can_speak', 'can_understand',
    ];

    protected $casts = [
        'can_read'       => 'boolean',
        'can_write'      => 'boolean',
        'can_speak'      => 'boolean',
        'can_understand' => 'boolean',
    ];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}