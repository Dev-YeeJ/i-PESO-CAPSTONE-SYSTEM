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

        if ($seeker) {
            $seeker->notify(new \App\Notifications\ApplicationStatusNotification($application));
        }
    }
}
