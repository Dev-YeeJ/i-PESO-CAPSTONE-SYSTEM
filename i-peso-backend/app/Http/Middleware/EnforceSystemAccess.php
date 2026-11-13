<?php

namespace App\Http\Middleware;

use App\Models\Administrator;
use App\Services\SystemSettings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Maintenance mode from System Settings → Access.
 *
 * While it is on, job seekers, employers and visitors get a 503 with the
 * office's message (the website and app show it as a full-page notice).
 * Staff keep working: the admin API, signing in, and the status endpoint
 * the frontend uses to know maintenance is on are never blocked.
 */
class EnforceSystemAccess
{
    /** Paths that stay open during maintenance (relative to /api). */
    private const ALWAYS_OPEN = [
        'api/admin/*',
        'api/auth/*',
        'api/public/system-status',
    ];

    public function __construct(private readonly SystemSettings $settings)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->settings->maintenanceOn() || $request->is(...self::ALWAYS_OPEN)) {
            return $next($request);
        }

        if ($request->user('sanctum') instanceof Administrator) {
            return $next($request);
        }

        return response()->json([
            'message' => (string) $this->settings->get('maintenance.message'),
            'maintenance' => true,
        ], 503, ['Retry-After' => '600']);
    }
}
