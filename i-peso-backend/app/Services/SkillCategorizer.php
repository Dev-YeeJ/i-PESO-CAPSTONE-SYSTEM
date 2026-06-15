<?php

namespace App\Services;

use App\Models\SkillCatalogEntry;
use Illuminate\Support\Str;

class SkillCategorizer
{
    private const SOFT_ONET_SKILLS = [
        'Active Learning',
        'Active Listening',
        'Complex Problem Solving',
        'Coordination',
        'Critical Thinking',
        'Instructing',
        'Judgment and Decision Making',
        'Learning Strategies',
        'Monitoring',
        'Negotiation',
        'Persuasion',
        'Service Orientation',
        'Social Perceptiveness',
        'Speaking',
        'Time Management',
    ];

    public function categoryForOnetSkill(string $name): string
    {
        return in_array($name, self::SOFT_ONET_SKILLS, true)
            ? 'soft'
            : 'technical';
    }

    public function normalize(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }

    public function canonicalizeSubmitted(array $technical, array $soft): array
    {
        $submitted = collect($technical)
            ->map(fn ($name) => ['name' => $name, 'submitted_category' => 'technical'])
            ->concat(
                collect($soft)->map(fn ($name) => ['name' => $name, 'submitted_category' => 'soft'])
            )
            ->map(function (array $skill) {
                $name = Str::of((string) $skill['name'])->squish()->toString();

                return [
                    ...$skill,
                    'name' => $name,
                    'normalized_name' => $this->normalize($name),
                ];
            })->filter(fn (array $skill) => $skill['normalized_name'] !== '');

        $catalog = SkillCatalogEntry::query()
            ->whereIn('normalized_name', $submitted->pluck('normalized_name')->unique())
            ->get(['name', 'normalized_name', 'category'])
            ->keyBy('normalized_name');

        $result = ['technical' => [], 'soft' => []];
        $seen = [];

        foreach ($submitted as $skill) {
            $match = $catalog->get($skill['normalized_name']);
            $name = $match?->name ?? $skill['name'];
            $category = $match?->category ?? $skill['submitted_category'];
            $key = $this->normalize($name);

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $result[$category][] = $name;
        }

        return $result;
    }
}
