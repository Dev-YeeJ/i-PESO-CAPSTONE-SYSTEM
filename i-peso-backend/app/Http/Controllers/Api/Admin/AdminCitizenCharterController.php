<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CitizenCharterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminCitizenCharterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $services = CitizenCharterService::query()
            ->when($request->string('status')->toString(), fn ($query, $status) => $query->where('status', $status))
            ->orderBy('display_order')
            ->orderBy('service_name')
            ->get();

        return response()->json(['data' => $services]);
    }

    public function store(Request $request): JsonResponse
    {
        $service = CitizenCharterService::create([
            ...$this->validatedData($request),
            'created_by_admin_id' => $request->user()->getKey(),
        ]);

        return response()->json(['message' => 'Citizen Charter service created.', 'service' => $service], 201);
    }

    public function show(CitizenCharterService $citizenCharter): JsonResponse
    {
        return response()->json(['service' => $citizenCharter]);
    }

    public function update(Request $request, CitizenCharterService $citizenCharter): JsonResponse
    {
        $citizenCharter->update($this->validatedData($request, true));

        return response()->json(['message' => 'Citizen Charter service updated.', 'service' => $citizenCharter->fresh()]);
    }

    public function destroy(CitizenCharterService $citizenCharter): JsonResponse
    {
        $citizenCharter->delete();

        return response()->json(['message' => 'Citizen Charter service archived.']);
    }

    private function validatedData(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'service_name' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'requirements' => ['nullable', 'array', 'max:50'],
            'requirements.*' => ['string', 'max:500'],
            'processing_time' => ['nullable', 'string', 'max:255'],
            'fees' => ['nullable', 'string', 'max:255'],
            'responsible_office' => ['nullable', 'string', 'max:255'],
            'steps' => ['nullable', 'array', 'max:50'],
            'steps.*' => ['string', 'max:1000'],
            'contact_info' => ['nullable', 'string', 'max:2000'],
            'status' => [$partial ? 'sometimes' : 'required', Rule::in(['draft', 'published', 'archived'])],
            'display_order' => ['nullable', 'integer', 'min:0', 'max:10000'],
        ]);
    }
}
