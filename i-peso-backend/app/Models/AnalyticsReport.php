<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnalyticsReport extends Model
{
    protected $table = 'analytics_reports';
    protected $primaryKey = 'report_id';

    protected $fillable = [
        'admin_id',
        'title',
        'report_category',
        'coverage_start',
        'coverage_end',
        'data_summary',
        'status',
    ];

    protected $casts = [
        'data_summary' => 'array',
        'coverage_start' => 'date',
        'coverage_end' => 'date',
    ];
}
