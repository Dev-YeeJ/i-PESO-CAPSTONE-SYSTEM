<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$employer = App\Models\Employer::latest('employer_id')->first();
echo "Employer ID: " . $employer->employer_id . PHP_EOL;
var_dump($employer->company_logo);
var_dump($employer->company_logo ? Illuminate\Support\Facades\Storage::disk('public')->url($employer->company_logo) : null);
