<?php

namespace App\Http\Middleware;

use App\Models\Employer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureVerifiedEmployer
{
    public function handle(Request $request, Closure $next): Response
    {
        $employer = $request->user();

        abort_unless($employer instanceof Employer, 403, 'Employer account required.');

        if (! $employer->canPostJobs()) {
            return response()->json([
                'message' => 'Your employer account must be approved by PESO before you can manage job vacancies.',
                'verification_status' => $employer->verification_status,
            ], 403);
        }

        return $next($request);
    }
}
