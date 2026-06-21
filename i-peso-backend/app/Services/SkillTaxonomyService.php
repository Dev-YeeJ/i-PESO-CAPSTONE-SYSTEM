<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\Skill;
use App\Models\SkillAlias;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SkillTaxonomyService
{
    public function normalize(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }

    public function resolve(string $name, string $category, bool $create = true): ?Skill
    {
        $cleanName = Str::of($name)->squish()->toString();
        $normalized = $this->normalize($cleanName);
        if ($normalized === '') {
            return null;
        }

        $skill = Skill::query()
            ->where('category', $category)
            ->where('normalized_name', $normalized)
            ->first();

        if ($skill) {
            return $skill;
        }

        $alias = SkillAlias::query()
            ->where('normalized_alias', $normalized)
            ->whereHas('skill', fn ($query) => $query->where('category', $category))
            ->with('skill')
            ->orderByDesc('confidence')
            ->first();

        if ($alias) {
            return $alias->skill;
        }

        if (! $create) {
            return null;
        }

        return Skill::query()->firstOrCreate(
            [
                'category' => $category,
                'normalized_name' => $normalized,
            ],
            [
                'name' => $cleanName,
                'search_terms' => $normalized,
                'source' => 'local_submitted',
                'occupation_count' => 0,
                'is_hot' => false,
                'is_in_demand' => false,
                'version' => 'local',
            ]
        );
    }

    public function syncSeeker(JobSeeker $seeker): int
    {
        $updated = 0;

        $seeker->seekerSkills()
            ->get()
            ->each(function ($seekerSkill) use (&$updated) {
                $category = $seekerSkill->skill_type === 'soft' ? 'soft' : 'technical';
                $skill = $this->resolve($seekerSkill->skill_name, $category);
                $updates = [];

                if ($skill && $seekerSkill->skill_id !== $skill->id) {
                    $updates['skill_id'] = $skill->id;
                }

                if (
                    Schema::hasColumn('seeker_skills', 'normalized_skill_name')
                    && $seekerSkill->normalized_skill_name !== $this->normalize($seekerSkill->skill_name)
                ) {
                    $updates['normalized_skill_name'] = $this->normalize($seekerSkill->skill_name);
                }

                if ($updates !== []) {
                    $seekerSkill->update($updates);
                    $updated++;
                }
            });

        return $updated;
    }

    public function syncVacancy(JobVacancy $vacancy): int
    {
        $requirements = collect($vacancy->required_skills ?? [])
            ->map(fn ($name) => [
                'name' => (string) $name,
                'category' => 'technical',
                'skill_type' => 'required',
                'weight' => 1.0,
            ])
            ->concat(
                collect($vacancy->soft_skills ?? [])->map(fn ($name) => [
                    'name' => (string) $name,
                    'category' => 'soft',
                    'skill_type' => 'soft',
                    'weight' => 0.5,
                ])
            );

        return DB::transaction(function () use ($vacancy, $requirements) {
            $rows = $requirements
                ->map(function (array $requirement) use ($vacancy) {
                    $skill = $this->resolve($requirement['name'], $requirement['category']);
                    if (! $skill) {
                        return null;
                    }

                    return [
                        'post_id' => $vacancy->getKey(),
                        'skill_id' => $skill->id,
                        'skill_type' => $requirement['skill_type'],
                        'original_name' => Str::of($requirement['name'])->squish()->toString(),
                        'weight' => $requirement['weight'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                })
                ->filter()
                ->unique(fn (array $row) => $row['skill_type'].'|'.$row['skill_id'])
                ->values();

            $vacancy->skillRequirements()->delete();

            if ($rows->isNotEmpty()) {
                DB::table('job_vacancy_skills')->insert($rows->all());
            }

            return $rows->count();
        });
    }

    public function seekerSkillIds(JobSeeker $seeker): Collection
    {
        if (
            ! Schema::hasTable('seeker_skills')
            || ! Schema::hasColumn('seeker_skills', 'skill_id')
        ) {
            return collect();
        }

        $skills = $seeker->relationLoaded('seekerSkills')
            ? $seeker->seekerSkills
            : $seeker->seekerSkills()->get(['id', 'seeker_id', 'skill_id']);

        return $skills
            ->pluck('skill_id')
            ->filter()
            ->unique()
            ->values();
    }
}
