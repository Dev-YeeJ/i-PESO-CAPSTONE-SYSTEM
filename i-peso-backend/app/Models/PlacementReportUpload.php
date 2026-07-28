<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlacementReportUpload extends Model
{
    public const STATUS_PENDING_MAPPING = 'pending_mapping';
    public const STATUS_PENDING_REVIEW = 'pending_review';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $table = 'placement_report_uploads';

    protected $fillable = [
        'employer_id',
        'original_filename',
        'stored_path',
        'mime_type',
        'file_size',
        'detected_headers',
        'sample_rows',
        'row_count',
        'status',
        'coverage_month',
        'coverage_year',
        'employer_remarks',
        'reviewed_by_admin_id',
        'review_remarks',
        'submitted_at',
        'reviewed_at',
    ];

    protected $casts = [
        'detected_headers' => 'array',
        'sample_rows' => 'array',
        'row_count' => 'integer',
        'coverage_month' => 'integer',
        'coverage_year' => 'integer',
        'file_size' => 'integer',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Administrator::class, 'reviewed_by_admin_id', 'admin_id');
    }

    public function mappings(): HasMany
    {
        return $this->hasMany(PlacementReportMapping::class, 'upload_id');
    }

    public function records(): HasMany
    {
        return $this->hasMany(PlacementRecord::class, 'upload_id');
    }
}
