<?php

namespace App\Http\Middleware;

use App\Models\Administrator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdministrator
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user();

        abort_unless(
            $admin instanceof Administrator,
            403,
            'Administrator account required.'
        );

        // Deactivating an account revokes its tokens, but a token that slipped
        // through (or a status changed directly in the database) must not keep
        // working. 401 makes the frontend clear the session.
        if (! $admin->isActive()) {
            $admin->currentAccessToken()?->delete();

            abort(401, 'This account has been deactivated. Contact the PESO system administrator.');
        }

        // A temporary password must be replaced before anything else opens.
        if ($admin->must_change_password && ! $request->routeIs('admin.account.password')) {
            abort(response()->json([
                'message' => 'Set your own password before continuing.',
                'must_change_password' => true,
            ], 403));
        }

        return $next($request);
    }
}
