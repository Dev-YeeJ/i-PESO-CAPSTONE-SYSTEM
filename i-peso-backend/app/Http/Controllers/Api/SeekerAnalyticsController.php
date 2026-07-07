<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\JobSeeker;

class SeekerAnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker, 403, 'Seeker account required.');

        $analytics = Cache::remember(
            "seeker-dashboard-analytics:v1:{$user->seeker_id}",
            now()->addSeconds(60),
            function () use ($user): array {
                $thirtyDaysAgo = now()->subDays(30);
                $counts = DB::table('seeker_profile_views')
                    ->where('seeker_id', $user->seeker_id)
                    ->selectRaw(
                        "SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS total_views_30_days, SUM(CASE WHEN source = 'search' THEN 1 ELSE 0 END) AS search_appearances",
                        [$thirtyDaysAgo]
                    )->first();

                $recentViewers = DB::table('seeker_profile_views')
                    ->join('employers', 'seeker_profile_views.employer_id', '=', 'employers.employer_id')
                    ->where('seeker_id', $user->seeker_id)
                    ->select('employers.company_name', 'seeker_profile_views.created_at', 'seeker_profile_views.source')
                    ->orderBy('seeker_profile_views.created_at', 'desc')
                    ->limit(5)
                    ->get();

                return [
                    'total_views_30_days' => (int) ($counts->total_views_30_days ?? 0),
                    'search_appearances' => (int) ($counts->search_appearances ?? 0),
                    'recent_viewers' => $recentViewers,
                ];
            }
        );

        return response()->json(['analytics' => $analytics]);
    }
}
