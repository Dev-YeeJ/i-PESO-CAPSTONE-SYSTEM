<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\JobSeeker;

class SeekerAnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker, 403, 'Seeker account required.');

        $thirtyDaysAgo = now()->subDays(30);

        // Calculate total views and search appearances
        $totalViews = DB::table('seeker_profile_views')
            ->where('seeker_id', $user->seeker_id)
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->count();

        // Let's pretend "search appearances" is simulated or calculated from activity
        // Or if we have a table, we query it. For now, we return mock/derived data.
        $searchAppearances = DB::table('seeker_profile_views')
            ->where('seeker_id', $user->seeker_id)
            ->where('source', 'search')
            ->count();

        // Get recent employer viewers
        $recentViewers = DB::table('seeker_profile_views')
            ->join('employers', 'seeker_profile_views.employer_id', '=', 'employers.employer_id')
            ->where('seeker_id', $user->seeker_id)
            ->select('employers.company_name', 'seeker_profile_views.created_at', 'seeker_profile_views.source')
            ->orderBy('seeker_profile_views.created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'analytics' => [
                'total_views_30_days' => $totalViews,
                'search_appearances' => $searchAppearances,
                'recent_viewers' => $recentViewers,
            ]
        ]);
    }
}
