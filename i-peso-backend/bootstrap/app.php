<?php

use App\Http\Middleware\EnsureAdministrator;
use App\Http\Middleware\EnsureAdminPermission;
use App\Http\Middleware\EnsureVerifiedEmployer;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SecurityHeaders::class);

        // Baseline rate limit for every API route that doesn't declare its own
        // `throttle:` rule. Without this, the `api` middleware group carries
        // no default limiter at all — not Laravel's usual 60/min, literally
        // none — so routes with no explicit throttle are wide open.
        $middleware->throttleApi();

        $middleware->alias([
            'admin' => EnsureAdministrator::class,
            'admin.permission' => EnsureAdminPermission::class,
            'verified.employer' => EnsureVerifiedEmployer::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
