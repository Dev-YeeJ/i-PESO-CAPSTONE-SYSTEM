<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One editable section of the portal's standing content ('office', 'landing').
 * Read it through App\Services\SiteContentService, which merges the saved
 * value over the defaults in App\Support\SiteContentRegistry and caches it.
 */
class SiteContent extends Model
{
    protected $fillable = ['key', 'value', 'version', 'updated_by'];

    protected $casts = [
        'value' => 'array',
        'version' => 'integer',
    ];

    public function editor(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'updated_by', 'admin_id');
    }
}
