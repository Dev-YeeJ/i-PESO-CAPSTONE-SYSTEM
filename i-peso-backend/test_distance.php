<?php
$req = request()->merge(['radius_km' => 20]); 
$req->setUserResolver(function() { return App\Models\JobSeeker::first(); }); 
$res = app(App\Http\Controllers\Api\SeekerNearbyJobController::class)->getNearbyJobs($req, app(App\Services\EnhancedJobMatchingService::class)); 
echo json_encode(array_map(function($j) { return ['title' => $j->job_title, 'distance' => $j->distance_km]; }, $res->getData()->jobs), JSON_PRETTY_PRINT);
