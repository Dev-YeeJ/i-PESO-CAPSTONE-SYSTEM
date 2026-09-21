<?php

namespace App\Listeners;

use App\Events\ApplicationStatusChanged;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendApplicationStatusNotification
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(ApplicationStatusChanged $event): void
    {
        $application = $event->application;
        $seeker = $application->jobSeeker;

        if (! $seeker) {
            return;
        }

        // Every other ->notify() call site in this codebase wraps the call in try/catch
        // (see ApplicationStatusNotification's own class comment) because a transport
        // failure — e.g. mail misconfigured on this shared host — must not fail the
        // request that triggered it. This listener was the one exception: an uncaught
        // exception here propagated back through the synchronous event() dispatch in
        // SeekerApplicationController::withdraw() (and the employer-side status-change
        // actions), turning an already-committed DB update into a 500 for the caller.
        try {
            $seeker->notify(new \App\Notifications\ApplicationStatusNotification($application));
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
