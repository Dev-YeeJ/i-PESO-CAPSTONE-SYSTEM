<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Services\ActivityLogger;
use App\Services\AddressService;
use App\Services\GoogleMapsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmployerProfileController extends Controller
{
    private const ADDRESS_PARTS = ['house_unit_street', 'barangay', 'city_municipality', 'province'];

    /**
     * When the address is part of this save, rebuild the derived address
     * fields exactly as registration does, and re-pin the map: the new pin
     * if one was sent, otherwise a geocode of the new address (the old pin
     * would point at the old place). Returns whether the address changed.
     */
    private function applyAddress(Employer $employer, array &$data, GoogleMapsService $maps): bool
    {
        if (! isset($data['province'])) {
            // No address in this save: leave every location field alone.
            foreach (['province_code', 'city_code', 'barangay_code', 'latitude', 'longitude', 'location_accuracy', 'google_place_id'] as $field) {
                unset($data[$field]);
            }

            return false;
        }

        foreach (self::ADDRESS_PARTS as $part) {
            $data[$part] = trim((string) $data[$part]);
        }

        $changed = collect(self::ADDRESS_PARTS)->contains(fn ($part) => $data[$part] !== (string) $employer->{$part})
            || (isset($data['latitude']) && ((float) $data['latitude'] !== (float) $employer->latitude || (float) $data['longitude'] !== (float) $employer->longitude));

        $data['full_address'] = (new AddressService())->buildFullAddress(
            $data['house_unit_street'], $data['barangay'], $data['city_municipality'], $data['province']
        );
        $data['complete_address'] = "{$data['house_unit_street']}, {$data['barangay']}, {$data['city_municipality']}, {$data['province']}";
        if (array_key_exists('province_code', $data)) {
            $data['region_code'] = substr((string) $data['province_code'], 0, 2) ?: null;
        }

        if (! $changed) {
            // Same address and pin re-sent with an unrelated edit: keep the stored location as it is.
            foreach (['latitude', 'longitude', 'location_accuracy', 'google_place_id'] as $field) {
                unset($data[$field]);
            }
        } elseif (isset($data['latitude'], $data['longitude'])) {
            $data['location_verified_at'] = now();
        } else {
            $data['latitude'] = $data['longitude'] = $data['google_place_id'] = null;
            $data['location_verified_at'] = null;
            try {
                $location = $maps->geocode($data['complete_address'].', Philippines');
                if ($location) {
                    $data['latitude'] = $location['latitude'];
                    $data['longitude'] = $location['longitude'];
                    $data['google_place_id'] = $location['place_id'];
                    $data['location_verified_at'] = now();
                }
            } catch (\Throwable) {
                // The address still saves during a map-service outage; PESO's
                // "missing GPS" list shows it needs a pin.
            }
        }

        return $changed;
    }

    /**
     * Update the employer's profile details.
     * PUT /api/employer/profile
     */
    public function update(Request $request, GoogleMapsService $maps): JsonResponse
    {
        /** @var Employer $employer */
        $employer = $request->user();

        abort_unless($employer instanceof Employer, 403, 'Employer account required.');

        $validator = Validator::make($request->all(), [
            'industry' => ['required', 'array', 'min:1'],
            'industry.*' => ['string', 'max:255'],
            'company_size' => 'required|in:micro,small,medium,large',
            'company_description' => 'nullable|string|max:5000',
            
            // Business address: optional on every save, but all four parts
            // come together (same rules as registration step 2).
            'province' => 'required_with:city_municipality,barangay,house_unit_street|nullable|string|max:100',
            'city_municipality' => 'required_with:province,barangay,house_unit_street|nullable|string|max:100',
            'barangay' => 'required_with:province,city_municipality,house_unit_street|nullable|string|max:100',
            'house_unit_street' => 'required_with:province,city_municipality,barangay|nullable|string|max:255',
            'province_code' => 'nullable|string|max:10',
            'city_code' => 'nullable|string|max:10',
            'barangay_code' => 'nullable|string|max:10',
            'latitude' => 'nullable|numeric|between:-90,90|required_with:longitude',
            'longitude' => 'nullable|numeric|between:-180,180|required_with:latitude',
            'location_accuracy' => 'nullable|integer|min:0|max:100000',
            'google_place_id' => 'nullable|string|max:255',

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
            $data = $validator->validated();
            $oldAddress = $employer->complete_address;
            $addressChanged = $this->applyAddress($employer, $data, $maps);

            $employer->update($data);
            $employer->refresh();

            if ($addressChanged) {
                // So PESO can see that a verified employer moved, without
                // blocking the change on a re-verification.
                ActivityLogger::logAs($employer, 'employer_address_updated', sprintf(
                    'Changed the business address from "%s" to "%s".',
                    $oldAddress ?: 'not set',
                    $employer->complete_address
                ));
            }

            return response()->json([
                'message' => 'Profile updated successfully.',
                // Same shape the profile page loads with, so the logo doesn't drop out after saving.
                'employer' => $employer->toArray() + [
                    'company_logo_url' => $employer->company_logo ? Storage::disk('public')->url($employer->company_logo) : null,
                ],
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
            // Logos are public (job cards, company pages), and every page reads them
            // from the public disk, the same place registration stores them.
            $disk = 'public';

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
