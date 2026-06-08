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
        abort_unless(
            $request->user() instanceof Administrator,
            403,
            'Administrator account required.'
        );

        return $next($request);
    }
}
