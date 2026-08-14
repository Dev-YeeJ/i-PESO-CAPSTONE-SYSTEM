<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$employer = App\Models\Employer::latest('employer_id')->first();
echo 'Employer ID: ' . $employer->employer_id . PHP_EOL;
echo 'Documents: ' . $employer->documents()->count() . PHP_EOL;
echo 'Vacancies: ' . $employer->vacancies()->count() . PHP_EOL;
