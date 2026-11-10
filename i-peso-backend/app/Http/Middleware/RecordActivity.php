<?php

namespace App\Http\Middleware;

use App\Services\ActivityLogger;
use App\Support\ActivityCatalog;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records every successful change any signed-in user makes — job seekers,
 * employers, staff and interns, on the web and the mobile app alike — plus
 * the reads that open someone's personal data. New features are covered
 * without adding logging code to each controller.
 *
 * Skipped: failed requests, guests (sign-in has its own entries), background
 * noise listed in ActivityCatalog, and requests whose controller already
 * wrote a more specific entry.
 */
class RecordActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        ActivityLogger::beginRequest();

        $response = $next($request);

        try {
            $this->record($request, $response);
        } catch (\Throwable $exception) {
            // Auditing must never break the request it describes.
            report($exception);
        }

        return $response;
    }

    private function record(Request $request, Response $response): void
    {
        if (! $response->isSuccessful() || ActivityLogger::recordedDuringRequest()) {
            return;
        }

        $user = $request->user();
        if (! $user instanceof Model) {
            return;
        }

        $entry = ActivityCatalog::describe($request);
        if ($entry === null) {
            return;
        }

        [$action, $description] = $entry;

        // Pages refetch when a tab regains focus; one entry per person per
        // record per few minutes keeps the trail readable.
        if ($request->isMethodSafe()) {
            $key = sprintf('activity_view:%s:%s:%s', $user::class, $user->getKey(), sha1($request->path()));
            if (! Cache::add($key, true, now()->addMinutes(ActivityCatalog::VIEW_REPEAT_MINUTES))) {
                return;
            }
        }

        ActivityLogger::logAs($user, $action, $description);
    }
}
