<?php

namespace App\Services;

use App\Models\Occupation;
use App\Models\OccupationAlias;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class OccupationTitleMatcher
{
    private ?Collection $titles = null;

    private array $aliasMaps = [];

    public function match(string $rawTitle, array $excludedAliasSources = []): ?array
    {
        $normalized = $this->normalize($rawTitle);
        if ($normalized === '') {
            return null;
        }

        if ($occupation = $this->titleMap()->get($normalized)) {
            return $this->result($occupation, 'exact_title', 1);
        }

        if ($occupation = $this->aliasMap($excludedAliasSources)->get($normalized)) {
            return $this->result($occupation, 'exact_alias', 0.98);
        }

        $simplified = $this->simplify($normalized);
        if ($simplified === '' || $simplified === $normalized) {
            return null;
        }

        if ($occupation = $this->titleMap()->get($simplified)) {
            return $this->result($occupation, 'normalized_title', 0.94);
        }

        if ($occupation = $this->aliasMap($excludedAliasSources)->get($simplified)) {
            return $this->result($occupation, 'normalized_alias', 0.92);
        }

        return null;
    }

    public function normalize(string $title): string
    {
        return Str::of($title)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }

    private function simplify(string $title): string
    {
        $noise = [
            'junior', 'jr', 'senior', 'sr', 'lead', 'principal', 'staff',
            'entry level', 'mid level', 'experienced', 'intern', 'internship',
            'contract', 'contractor', 'freelance', 'part time', 'full time',
            'remote', 'hybrid', 'onsite', 'on site',
        ];

        $simplified = " {$title} ";
        foreach ($noise as $term) {
            $simplified = preg_replace(
                '/\s+'.preg_quote($term, '/').'\s+/i',
                ' ',
                $simplified
            ) ?? $simplified;
        }

        return Str::of($simplified)->squish()->toString();
    }

    private function titleMap(): Collection
    {
        return $this->titles ??= Occupation::query()
            ->where('is_active', true)
            ->get()
            ->keyBy(fn (Occupation $occupation) => $this->normalize($occupation->title));
    }

    private function aliasMap(array $excludedSources = []): Collection
    {
        sort($excludedSources);
        $cacheKey = implode('|', $excludedSources);

        return $this->aliasMaps[$cacheKey] ??= OccupationAlias::query()
            ->with('occupation')
            ->whereHas('occupation', fn ($query) => $query->where('is_active', true))
            ->when(
                $excludedSources !== [],
                fn ($query) => $query->whereNotIn('source', $excludedSources)
            )
            ->get()
            ->filter(fn (OccupationAlias $alias) => $alias->occupation !== null)
            ->mapWithKeys(fn (OccupationAlias $alias) => [
                $this->normalize($alias->alias) => $alias->occupation,
            ]);
    }

    private function result(Occupation $occupation, string $reason, float $confidence): array
    {
        return [
            'occupation' => $occupation,
            'reason' => $reason,
            'confidence' => $confidence,
        ];
    }
}
