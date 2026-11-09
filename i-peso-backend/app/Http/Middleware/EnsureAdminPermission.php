<?php

namespace App\Http\Middleware;

use App\Models\AdminRole;
use App\Models\Administrator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: `admin.permission:employment_hub`.
 *
 * Reading (GET/HEAD) needs view or full access; anything that changes data
 * needs full access. A route that reads through a POST (e.g. a download) can
 * ask for view explicitly: `admin.permission:constituent_crm,view`.
 */
class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $module, ?string $level = null): Response
    {
        $admin = $request->user();

        abort_unless(
            $admin instanceof Administrator && $admin->hasModule($module),
            403,
            'Your account does not have access to this section.'
        );

        $required = $level ?? ($request->isMethodSafe() ? AdminRole::VIEW : AdminRole::MANAGE);

        abort_if(
            $required === AdminRole::MANAGE && ! $admin->canManageModule($module),
            403,
            'Your account can only view this section.'
        );

        return $next($request);
    }
}
