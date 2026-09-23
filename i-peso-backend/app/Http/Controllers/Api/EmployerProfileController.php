<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmployerProfileController extends Controller
{
    /**
     * Update the employer's profile details.
     * PUT /api/employer/profile
     */
    public function update(Request $request): JsonResponse
    {
        /** @var Employer $employer */
        $employer = $request->user();

        abort_unless($employer instanceof Employer, 403, 'Employer account required.');

        $validator = Validator::make($request->all(), [
            'industry' => ['required', 'array', 'min:1'],
            'industry.*' => ['string', 'max:255'],
            'company_size' => 'required|in:micro,small,medium,large',
            'company_description' => 'nullable|string|max:5000',
            
            // Address details (allowing optional updates if business moves)
            'province' => 'nullable|string|max:100',
            'city_municipality' => 'nullable|string|max:100',
            'barangay' => 'nullable|string|max:100',
            'house_unit_street' => 'nullable|string|max:255',
            'complete_address' => 'nullable|string|max:500',

            // Contact and Representative
            'representative_name' => 'required|string|max:255',
            'representative_designation' => 'required|string|max:255',
            'mobile_number' => ['required', 'regex:/^(\+63|0)\d{10}$/'],
            'representative_contact_number' => ['nullable', 'regex:/^(\+63|0)\d{10}$/'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $employer->update($validator->validated());

            return response()->json([
                'message' => 'Profile updated successfully.',
                'employer' => $employer->refresh(),
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $this->safeErrorMessage($e, 'Unable to update profile.')
            ], 500);
        }
    }

    /**
     * Update the company logo.
     * POST /api/employer/profile/logo
     */
    public function updateLogo(Request $request): JsonResponse
    {
        /** @var Employer $employer */
        $employer = $request->user();
        abort_unless($employer instanceof Employer, 403, 'Employer account required.');

        $validator = Validator::make($request->all(), [
            'company_logo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $disk = config('filesystems.employer_documents_disk', 'local');
            
            // Delete old logo if exists
            if ($employer->company_logo && Storage::disk($disk)->exists($employer->company_logo)) {
                Storage::disk($disk)->delete($employer->company_logo);
            }

            $path = $request->file('company_logo')->store('employer_logos', $disk);
            
            $employer->update(['company_logo' => $path]);

            return response()->json([
                'message' => 'Company logo updated successfully.',
                'company_logo_url' => Storage::disk($disk)->url($path),
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $this->safeErrorMessage($e, 'Unable to upload logo.')
            ], 500);
        }
    }

    /**
     * Update the representative's profile photo.
     * POST /api/employer/profile/photo
     */
    public function updateRepresentativeImage(Request $request): JsonResponse
    {
        /** @var Employer $employer */
        $employer = $request->user();
        abort_unless($employer instanceof Employer, 403, 'Employer account required.');

        $validator = Validator::make($request->all(), [
            'profile_image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $disk = config('filesystems.employer_documents_disk', 'local');
            
            // Delete old photo if exists
            if ($employer->profile_image && Storage::disk($disk)->exists($employer->profile_image)) {
                Storage::disk($disk)->delete($employer->profile_image);
            }

            $path = $request->file('profile_image')->store('employer_photos', $disk);
            
            $employer->update(['profile_image' => $path]);

            return response()->json([
                'message' => 'Representative photo updated successfully.',
                'profile_image_url' => Storage::disk($disk)->url($path),
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $this->safeErrorMessage($e, 'Unable to upload photo.')
            ], 500);
        }
    }
}
