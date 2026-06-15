<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class JobVacancy extends Model
{
    protected $table = 'job_vacancies';

    protected $primaryKey = 'post_id';

    protected $fillable = [
        'employer_id',
        'occupation_id',
        'job_title',
        'employment_type',
        'work_setup',
        'location',
        'region',
        'province',
        'province_code',
        'city_municipality',
        'city_code',
        'barangay',
        'barangay_code',
        'specific_address',
        'latitude',
        'longitude',
        'google_place_id',
        'job_description',
        'vacancies_count',
        'minimum_education',
        'target_courses',
        'experience_level',
        'minimum_experience_months',
        'salary_min',
        'salary_max',
        'salary_type',
        'hide_salary',
        'benefits',
        'required_skills',
        'soft_skills',
        'required_certifications',
        'certifications_mandatory',
        'application_deadline',
        'open_to_pwds',
        'open_to_senior_citizens',
        'spes_tupad_eligible',
        'status',
    ];

    protected $casts = [
        'required_skills' => 'array',
        'target_courses' => 'array',
        'soft_skills' => 'array',
        'required_certifications' => 'array',
        'benefits' => 'array',
        'salary_min' => 'decimal:2',
        'salary_max' => 'decimal:2',
        'hide_salary' => 'boolean',
        'minimum_experience_months' => 'integer',
        'certifications_mandatory' => 'boolean',
        'application_deadline' => 'date',
        'open_to_pwds' => 'boolean',
        'open_to_senior_citizens' => 'boolean',
        'spes_tupad_eligible' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    /**
     * Limit vacancies to coordinates inside the requested radius.
     *
     * The bounding box uses the coordinate index to reduce candidates before
     * the Haversine expression calculates the exact great-circle distance.
     */
    public function scopeWithinRadius(
        Builder $query,
        float $latitude,
        float $longitude,
        float $radiusKm
    ): Builder {
        $this->registerSqliteMathFunctions($query);

        if ($latitude < -90 || $latitude > 90) {
            throw new InvalidArgumentException('Latitude must be between -90 and 90.');
        }

        if ($longitude < -180 || $longitude > 180) {
            throw new InvalidArgumentException('Longitude must be between -180 and 180.');
        }

        if ($radiusKm <= 0) {
            throw new InvalidArgumentException('Radius must be greater than zero.');
        }

        $earthRadiusKm = 6371.0088;
        $latitudeDelta = rad2deg($radiusKm / $earthRadiusKm);
        $longitudeDelta = min(
            180,
            $latitudeDelta / max(abs(cos(deg2rad($latitude))), 0.000001)
        );

        $distanceSql = <<<'SQL'
            (
                ? * 2 * ASIN(
                    SQRT(
                        POWER(SIN(RADIANS(job_vacancies.latitude - ?) / 2), 2)
                        + COS(RADIANS(?))
                        * COS(RADIANS(job_vacancies.latitude))
                        * POWER(SIN(RADIANS(job_vacancies.longitude - ?) / 2), 2)
                    )
                )
            )
            SQL;
        $distanceBindings = [$earthRadiusKm, $latitude, $latitude, $longitude];

        return $query
            ->whereNotNull('job_vacancies.latitude')
            ->whereNotNull('job_vacancies.longitude')
            ->whereBetween('job_vacancies.latitude', [
                max(-90, $latitude - $latitudeDelta),
                min(90, $latitude + $latitudeDelta),
            ])
            ->when(
                $longitude - $longitudeDelta >= -180
                    && $longitude + $longitudeDelta <= 180,
                fn (Builder $builder) => $builder->whereBetween('job_vacancies.longitude', [
                    $longitude - $longitudeDelta,
                    $longitude + $longitudeDelta,
                ])
            )
            ->addSelect('job_vacancies.*')
            ->selectRaw("{$distanceSql} AS distance_km", $distanceBindings)
            ->whereRaw("{$distanceSql} <= ?", [...$distanceBindings, $radiusKm])
            ->orderBy('distance_km');
    }

    public function scopeMatchWithSynonyms(Builder $query, JobSeeker $seeker): Builder
    {
        $skillIds = $seeker->seekerSkills()
            ->whereNotNull('skill_id')
            ->pluck('skill_id');

        if ($skillIds->isEmpty()) {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereHas('skillRequirements', function (Builder $requirements) use ($skillIds) {
            $requirements
                ->whereIn('skill_id', $skillIds)
                ->orWhereHas(
                    'skill.outgoingRelationships',
                    fn (Builder $relationships) => $relationships
                        ->whereIn('related_skill_id', $skillIds)
                        ->where('match_weight', '>', 0)
                )
                ->orWhereHas(
                    'skill.incomingRelationships',
                    fn (Builder $relationships) => $relationships
                        ->whereIn('parent_skill_id', $skillIds)
                        ->where('reverse_match_weight', '>', 0)
                );
        });
    }

    private function registerSqliteMathFunctions(Builder $query): void
    {
        $connection = $query->getConnection();
        if ($connection->getDriverName() !== 'sqlite') {
            return;
        }

        $pdo = $connection->getPdo();
        $functions = [
            'ASIN' => [static fn (float $value): float => asin($value), 1],
            'COS' => [static fn (float $value): float => cos($value), 1],
            'POWER' => [static fn (float $base, float $exponent): float => $base ** $exponent, 2],
            'RADIANS' => [static fn (float $degrees): float => deg2rad($degrees), 1],
            'SIN' => [static fn (float $value): float => sin($value), 1],
            'SQRT' => [static fn (float $value): float => sqrt($value), 1],
        ];

        foreach ($functions as $name => [$callback, $arguments]) {
            $pdo->sqliteCreateFunction($name, $callback, $arguments);
        }
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class, 'employer_id', 'employer_id');
    }

    public function occupation(): BelongsTo
    {
        return $this->belongsTo(Occupation::class);
    }

    public function skillRequirements(): HasMany
    {
        return $this->hasMany(JobVacancySkill::class, 'post_id', 'post_id');
    }

    public function certificationRequirements(): HasMany
    {
        return $this->hasMany(JobVacancyCertification::class, 'post_id', 'post_id');
    }
}
