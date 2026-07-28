<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('interviews:send-reminders')->everyFifteenMinutes();
Schedule::command('permits:notify-expiring')->dailyAt('08:00');
