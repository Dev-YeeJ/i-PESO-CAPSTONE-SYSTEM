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
// Every 5 minutes so the 15-minute reminder lands 10–15 minutes before the
// interview; at every 15 minutes it could arrive as little as a minute before.
Schedule::call(fn () => Artisan::call('interviews:send-reminders'))->everyFiveMinutes();
Schedule::call(fn () => Artisan::call('permits:notify-expiring'))->dailyAt('08:00');
Schedule::call(fn () => Artisan::call('placements:notify-missing'))->dailyAt('08:30');
// Mid-morning Philippine time: invite new hires to review the workplace once they've started.
Schedule::call(fn () => Artisan::call('reviews:invite-employment'))->dailyAt('09:00')->timezone('Asia/Manila')->name('reviews-invite-employment');
// Bell + push for scheduled announcements whose publish time has just arrived.
Schedule::call(fn () => Artisan::call('announcements:deliver-due'))->everyMinute()->name('announcements-deliver-due')->withoutOverlapping();
// Just after midnight Philippine time, close intern accounts whose internship ended yesterday.
Schedule::call(fn () => Artisan::call('ojt:end-internships'))->dailyAt('00:05')->timezone('Asia/Manila')->name('ojt-end-internships');
// Site Content keeps the newest 20 versions of each section and FAQ.
Schedule::call(fn () => Artisan::call('site-content:prune-history'))->dailyAt('02:15')->timezone('Asia/Manila')->name('site-content-prune-history');

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