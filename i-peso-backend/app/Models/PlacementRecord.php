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

    /**
     * How a record was linked to a registered job seeker.
     *  - exact:     name + birth date agreed, or a single unambiguous name hit
     *  - probable:  one name hit, but no birth date on file to corroborate it
     *  - ambiguous: several seekers share the name — needs a PESO admin to pick
     *  - none:      no candidate at all (normal: most reported hires are walk-ins
     *               who never registered on i-PESO)
     */
    public const MATCH_EXACT = 'exact';

    public const MATCH_PROBABLE = 'probable';

    public const MATCH_AMBIGUOUS = 'ambiguous';

    public const MATCH_NONE = 'none';

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
        'seeker_match_confidence',
        'seeker_match_confirmed_by',
        'seeker_match_confirmed_at',
        'raw_row',
    ];

    protected $casts = [
        'raw_row' => 'array',
        'age' => 'integer',
        'birth_date' => 'date',
        'date_hired' => 'date',
        'seeker_match_confirmed_at' => 'datetime',
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
