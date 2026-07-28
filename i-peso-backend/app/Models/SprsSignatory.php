<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SprsSignatory extends Model
{
    protected $table = 'sprs_signatories';

    protected $fillable = ['analytics_report_id', 'role', 'name', 'position'];

    public function report(): BelongsTo
    {
        return $this->belongsTo(AnalyticsReport::class, 'analytics_report_id');
    }
}
