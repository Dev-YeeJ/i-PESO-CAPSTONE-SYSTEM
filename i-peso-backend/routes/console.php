<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule::command() spawns each run as a subprocess via Symfony Process,
// which needs proc_open — disabled on Hostinger shared hosting. Schedule::call()
// with Artisan::call() runs the command in-process instead, avoiding it.
Schedule::call(fn () => Artisan::call('interviews:send-reminders'))->everyFifteenMinutes();
Schedule::call(fn () => Artisan::call('permits:notify-expiring'))->dailyAt('08:00');

// There is no persistent queue worker on this host (no Supervisor on shared
// hosting), so queued notifications (application status, interview, employer
// verification emails/SMS) only ever go out if something drains the `jobs`
// table. --stop-when-empty makes this exit as soon as it's caught up, instead
// of running as a daemon, so it fits inside a once-a-minute scheduler tick.
Schedule::call(fn () => Artisan::call('queue:work', [
    '--stop-when-empty' => true,
    '--tries' => 3,
    '--max-time' => 50,
]))->everyMinute()->name('queue-worker')->withoutOverlapping();