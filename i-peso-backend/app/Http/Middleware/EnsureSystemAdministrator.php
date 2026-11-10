<?php

namespace App\Http\Middleware;

use App\Models\Administrator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Only the system administrator may create, change or deactivate staff
 * accounts and roles. Having the Configuration module is not enough: that
 * would let any staff member grant themselves more access.
 */
class EnsureSystemAdministrator
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user();

        abort_unless(
            $admin instanceof Administrator && $admin->isSystemAdministrator(),
            403,
            'Only the system administrator can manage staff accounts.'
        );

        return $next($request);
    }
}
