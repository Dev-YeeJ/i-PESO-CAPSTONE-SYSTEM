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
