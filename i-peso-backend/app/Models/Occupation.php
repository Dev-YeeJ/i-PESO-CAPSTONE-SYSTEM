<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Occupation extends Model
{
    protected $fillable = [
        'psoc_code',
        'title',
        'description',
        'search_terms',
        'version',
        'source',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function seekerPreferences(): HasMany
    {
        return $this->hasMany(SeekerOccupation::class);
    }

    public function vacancies(): HasMany
    {
        return $this->hasMany(JobVacancy::class);
    }
}
