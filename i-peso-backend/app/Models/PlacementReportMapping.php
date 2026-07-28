<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlacementReportMapping extends Model
{
    protected $table = 'placement_report_mappings';

    protected $fillable = [
        'upload_id',
        'source_column',
        'target_field',
    ];

    public function upload(): BelongsTo
    {
        return $this->belongsTo(PlacementReportUpload::class, 'upload_id');
    }
}
