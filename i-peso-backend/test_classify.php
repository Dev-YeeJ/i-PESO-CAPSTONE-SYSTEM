<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$req = Illuminate\Http\Request::create('/api/occupations/classify', 'GET', ['title' => 'Conductor']);
$res = $app->make(App\Http\Controllers\Api\OccupationClassificationController::class)->classify($req);

echo json_encode($res->getData());
