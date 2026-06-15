<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GoogleMapsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GoogleMapsController extends Controller
{
    public function autocomplete(Request $request, GoogleMapsService $maps): JsonResponse
    {
        $validated = $request->validate([
            'text' => ['required', 'string', 'min:3', 'max:200'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'session_token' => ['nullable', 'string', 'max:64'],
        ]);

        return response()->json([
            'suggestions' => $maps->autocomplete(
                $validated['text'],
                isset($validated['latitude']) ? (float) $validated['latitude'] : null,
                isset($validated['longitude']) ? (float) $validated['longitude'] : null,
                $validated['session_token'] ?? null,
            ),
        ]);
    }

    public function place(Request $request, string $placeId, GoogleMapsService $maps): JsonResponse
    {
        $validated = $request->validate([
            'session_token' => ['nullable', 'string', 'max:64'],
        ]);

        return response()->json([
            'location' => $maps->place($placeId, $validated['session_token'] ?? null),
        ]);
    }

    public function geocode(Request $request, GoogleMapsService $maps): JsonResponse
    {
        $validated = $request->validate([
            'address' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        return response()->json([
            'location' => $maps->geocode($validated['address']),
        ]);
    }

    public function reverse(Request $request, GoogleMapsService $maps): JsonResponse
    {
        $validated = $this->validatePoint($request);

        return response()->json([
            'location' => $maps->reverse(
                (float) $validated['latitude'],
                (float) $validated['longitude'],
            ),
        ]);
    }

    public function route(Request $request, GoogleMapsService $maps): JsonResponse
    {
        $validated = $request->validate([
            'origin_latitude' => ['required', 'numeric', 'between:-90,90'],
            'origin_longitude' => ['required', 'numeric', 'between:-180,180'],
            'destination_latitude' => ['required', 'numeric', 'between:-90,90'],
            'destination_longitude' => ['required', 'numeric', 'between:-180,180'],
            'mode' => ['nullable', Rule::in(['drive', 'walk', 'bicycle', 'motorcycle'])],
        ]);

        return response()->json([
            'route' => $maps->route(
                (float) $validated['origin_latitude'],
                (float) $validated['origin_longitude'],
                (float) $validated['destination_latitude'],
                (float) $validated['destination_longitude'],
                $validated['mode'] ?? 'drive',
            ),
        ]);
    }

    public function matrix(Request $request, GoogleMapsService $maps): JsonResponse
    {
        $validated = $request->validate([
            'sources' => ['required', 'array', 'min:1', 'max:25'],
            'sources.*.latitude' => ['required', 'numeric', 'between:-90,90'],
            'sources.*.longitude' => ['required', 'numeric', 'between:-180,180'],
            'targets' => ['required', 'array', 'min:1', 'max:25'],
            'targets.*.latitude' => ['required', 'numeric', 'between:-90,90'],
            'targets.*.longitude' => ['required', 'numeric', 'between:-180,180'],
            'mode' => ['nullable', Rule::in(['drive', 'walk', 'bicycle', 'motorcycle'])],
        ]);

        abort_if(
            count($validated['sources']) * count($validated['targets']) > 625,
            422,
            'The route matrix is limited to 625 source-to-target combinations per request.'
        );

        return response()->json([
            'matrix' => $maps->matrix(
                $validated['sources'],
                $validated['targets'],
                $validated['mode'] ?? 'drive',
            ),
        ]);
    }

    private function validatePoint(Request $request): array
    {
        return $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);
    }
}
