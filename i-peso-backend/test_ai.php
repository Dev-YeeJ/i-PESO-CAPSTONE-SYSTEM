<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$service = app()->make(App\Services\VertexAiSuggestionService::class);
$reflection = new ReflectionClass($service);
$method = $reflection->getMethod('occupationClassificationEnhancedPayload');
$method->setAccessible(true);
$payload = $method->invoke($service, 'Conductor', 5);

$tokens = app()->make(App\Services\GoogleCloudAccessTokenService::class);
$accessToken = $tokens->token();

$projectId = config('services.vertex_ai.project_id');
$location = config('services.vertex_ai.location');
$model = config('services.vertex_ai.model');

$endpoint = "https://{$location}-aiplatform.googleapis.com/v1/projects/{$projectId}/locations/{$location}/publishers/google/models/{$model}:generateContent";

$response = Illuminate\Support\Facades\Http::acceptJson()
    ->withToken($accessToken)
    ->post($endpoint, $payload);

echo "RAW VERTEX AI RESPONSE:\n";
echo $response->body();
