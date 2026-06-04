<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeekerWorkLocation extends Model
{
    protected $table      = 'seeker_work_locations';
    protected $primaryKey = 'id';
    protected $keyType    = 'int';
    public $timestamps    = true;
    
    protected $fillable = ['seeker_id', 'location_type', 'location_name', 'location_code'];

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class, 'seeker_id', 'seeker_id');
    }
}
