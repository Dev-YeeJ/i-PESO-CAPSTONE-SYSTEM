<?php

namespace App\Http\Middleware;

use App\Models\Administrator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $admin = $request->user();

        abort_unless(
            $admin instanceof Administrator && $admin->hasModule($module),
            403,
            'Your account does not have access to this section.'
        );

        return $next($request);
    }
}
