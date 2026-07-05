<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$invalidCount = \App\Models\JobVacancy::whereNotNull('latitude')->get()->filter(function ($job) {
    return !is_numeric($job->latitude) || !is_numeric($job->longitude);
})->count();

echo "Invalid coordinates count: " . $invalidCount . "\n";
