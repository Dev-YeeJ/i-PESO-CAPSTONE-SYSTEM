<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$employer = App\Models\Employer::find(17);
if ($employer) {
    // Delete documents for employer 17
    $employer->documents()->delete();
    
    // reset verification status to pending if it was somehow approved
    $employer->update(['verification_status' => 'pending']);
    
    echo "Cleaned up orphaned documents for Employer 17." . PHP_EOL;
}
