<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\JobSeeker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * "Likely matches" while an employer is still writing a job post.
 *
 * Scoring every seeker against an unsaved vacancy is the slow path that had
 * to be moved off the request at publish time, so this is a cheap estimate
 * instead: profile-complete seekers whose preferred occupation is in the same
 * broad field, and how many of those live in the job's city or municipality.
 * Only counts leave this endpoint, never who the seekers are.
 */
class EmployerMatchEstimateController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user() instanceof Employer, 403);

        $validated = $request->validate([
            'general_term' => ['required', 'string', 'max:120'],
            'city_municipality' => ['nullable', 'string', 'max:120'],
        ]);

        $anchor = self::normalize($validated['general_term']);
        abort_if($anchor === null, 422, 'Choose an occupation field first.');
        $city = Str::of($validated['city_municipality'] ?? '')->lower()->squish()->toString();

        $result = Cache::remember(
            'match-estimate:'.sha1($anchor.'|'.$city),
            now()->addMinutes(10),
            fn () => $this->estimate($anchor, $city),
        );

        return response()->json($result);
    }

    /** @return array{same_field: int, same_field_nearby: int|null} */
    private function estimate(string $anchor, string $city): array
    {
        // Stored terms vary ("general:office-work", "office work"); there are
        // only a few dozen distinct values, so normalise them here, not in SQL.
        $terms = DB::table('seeker_occupations')
            ->whereNotNull('general_term')
            ->distinct()
            ->pluck('general_term')
            ->filter(fn ($term) => self::normalize($term) === $anchor)
            ->values()
            ->all();

        if ($terms === []) {
            return ['same_field' => 0, 'same_field_nearby' => $city === '' ? null : 0];
        }

        $base = JobSeeker::query()
            ->where('profile_completed', true)
            ->whereIn('seeker_id', DB::table('seeker_occupations')->select('seeker_id')->whereIn('general_term', $terms));

        return [
            'same_field' => (clone $base)->count(),
            'same_field_nearby' => $city === ''
                ? null
                : (clone $base)->whereRaw('LOWER(TRIM(address_municipality_city)) = ?', [$city])->count(),
        ];
    }

    /** Same normalisation EmployerJobVacancyController applies to a vacancy's general_term. */
    private static function normalize(?string $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $anchor = Str::of($value)
            ->lower()
            ->replaceMatches('/^general:/', '')
            ->replace(['-', '_'], ' ')
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();

        return $anchor === '' ? null : $anchor;
    }
}
