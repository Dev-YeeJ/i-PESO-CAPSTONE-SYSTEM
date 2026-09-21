<?php
$req = Illuminate\Http\Request::create("/api/admin/reports/generate-sprs", "POST", [
    "month" => 9, "year" => 2026,
    "signatories" => ["prepared_by" => ["name" => "", "position" => ""]],
    "issues_concerns" => ""
]);
$admin = App\Models\Administrator::first();
Auth::login($admin);
$c = app()->make(\App\Http\Controllers\Api\Admin\SystemReports\ReportController::class);
try {
    $resp = $c->generateSPRS($req, app()->make(\App\Services\JobFairReportService::class));
    echo "SUCCESS\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine();
}
