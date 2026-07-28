<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SprsManualAdjustment extends Model
{
    protected $table = 'sprs_manual_adjustments';

    protected $fillable = ['analytics_report_id', 'indicator_key', 'label', 'total', 'female'];

    protected $casts = ['total' => 'integer', 'female' => 'integer'];

    public function report(): BelongsTo
    {
        return $this->belongsTo(AnalyticsReport::class, 'analytics_report_id');
    }
}
