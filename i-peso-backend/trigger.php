<?php
require __DIR__."/vendor/autoload.php";
$app = require_once __DIR__."/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
// Bootstrap application properly to initialize DB connection
$kernel->handle(Illuminate\Http\Request::create("/api/admin/reports/generate-sprs", "POST"));
$request = Illuminate\Http\Request::create("/api/admin/reports/generate-sprs", "POST", [
    "month" => 9,
    "year" => 2026
]);
// Login as first admin
$admin = App\Models\Administrator::first();
if($admin) {
    Auth::login($admin);
} else { echo "No admin found"; exit; }
$response = app()->make(App\Http\Controllers\Api\Admin\SystemReports\ReportController::class)->generateSPRS($request, app()->make(App\Services\JobFairReportService::class));
echo $response->status() . "\n";
echo $response->content();

