<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlacementRecord extends Model
{
    /**
     * Canonical placement fields an uploaded column can be mapped to.
     * Keys are the stored column names; labels drive the mapping UI.
     */
    public const MAPPABLE_FIELDS = [
        'first_name' => 'First Name',
        'middle_name' => 'Middle Name',
        'last_name' => 'Last Name',
        'gender' => 'Gender',
        'civil_status' => 'Civil Status',
        'age' => 'Age',
        'birth_date' => 'Birth Date',
        'date_hired' => 'Date Hired',
        'position' => 'Position',
        'department' => 'Department',
        'address' => 'Address',
        'educational_attainment' => 'Educational Attainment',
        'assigned_company' => 'Assigned Company',
    ];

    /** Fields that must be mapped before an upload can be submitted for review. */
    public const REQUIRED_FIELDS = ['first_name', 'last_name', 'date_hired', 'position'];

    protected $table = 'placement_records';

    protected $fillable = [
        'upload_id',
        'employer_id',
        'first_name',
        'middle_name',
        'last_name',
        'gender',
        'civil_status',
        'age',
        'birth_date',
        'date_hired',
        'position',
        'department',
        'address',
        'educational_attainment',
        'assigned_company',
        'seeker_id',
        'raw_row',
    ];

    protected $casts = [
        'raw_row' => 'array',
        'age' => 'integer',
        'birth_date' => 'date',
        'date_hired' => 'date',
    ];

    public function upload(): BelongsTo
    {
        return $this->belongsTo(PlacementReportUpload::class, 'upload_id');
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}
