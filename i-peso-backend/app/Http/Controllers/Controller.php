<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Log;
use Throwable;

abstract class Controller
{
    /**
     * Log the real exception and return a client-safe message. Never echoes
     * $e->getMessage() straight to an API response — an unanticipated
     * exception (DB constraint error, filesystem failure, third-party API
     * body) can reveal schema, paths, or internals. The raw message is only
     * surfaced when APP_DEBUG is on, for local development.
     */
    protected function safeErrorMessage(Throwable $e, string $publicMessage): string
    {
        Log::error($publicMessage, ['exception' => $e]);

        return config('app.debug') ? $e->getMessage() : $publicMessage;
    }
}
