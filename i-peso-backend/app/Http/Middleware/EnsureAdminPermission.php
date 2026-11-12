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
 *
 * Several modules joined with "|" mean "any of these": the level checked is
 * the highest the account holds among them, e.g. FAQs are managed by either
 * Configuration or Constituent CRM (front desk) staff:
 * `admin.permission:configuration|constituent_crm`.
 */
class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $module, ?string $level = null): Response
    {
        $admin = $request->user();
        $modules = explode('|', $module);

        abort_unless(
            $admin instanceof Administrator && collect($modules)->contains(fn (string $m) => $admin->hasModule($m)),
            403,
            'Your account does not have access to this section.'
        );

        $required = $level ?? ($request->isMethodSafe() ? AdminRole::VIEW : AdminRole::MANAGE);

        abort_if(
            $required === AdminRole::MANAGE && ! collect($modules)->contains(fn (string $m) => $admin->canManageModule($m)),
            403,
            'Your account can only view this section.'
        );

        return $next($request);
    }
}
