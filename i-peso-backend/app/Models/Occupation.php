<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Occupation extends Model
{
    protected $fillable = [
        'psoc_code',
        'external_uri',
        'classification_code',
        'isco_group',
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

    public function aliases(): HasMany
    {
        return $this->hasMany(OccupationAlias::class);
    }

    public function titleCandidates(): HasMany
    {
        return $this->hasMany(OccupationTitleCandidate::class, 'suggested_occupation_id');
    }

    public function sourceMappings(): HasMany
    {
        return $this->hasMany(OccupationSourceMapping::class);
    }

    public function generalTerms(): HasMany
    {
        return $this->hasMany(OccupationGeneralTerm::class);
    }

    public function vacancies(): HasMany
    {
        return $this->hasMany(JobVacancy::class);
    }
}
