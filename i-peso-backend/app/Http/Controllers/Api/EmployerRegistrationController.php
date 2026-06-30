<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\EmployerDocument;
use App\Notifications\EmployerVerificationProgressUpdated;
use App\Services\GoogleMapsService;
use App\Services\AddressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmployerRegistrationController extends Controller
{
    /**
     * Step 1: Register account and set company type
     * POST /api/employer/register/step-1
     */
    public function registerStep1(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|unique:employers',
            'password' => 'required|string|min:8|confirmed',
            'company_type' => 'required|in:sole_proprietorship,corporation_partnership,local_recruitment_agency,overseas_recruitment_agency',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $employer = Employer::create([
                'email' => $request->email,
                'password' => $request->password, // Your model casts this to 'hashed' automatically, which is great!
                'company_type' => $request->company_type,
                'verification_status' => 'pending',

                // 👇 THE FIX: Pacifying MySQL's strict NOT NULL rules for future steps
                'company_name' => '',
                'industry' => '',
                'company_size' => 'micro', // Enum requires a valid default value
                'province' => '',
                'city_municipality' => '',
                'barangay' => '',
                'house_unit_street' => '',
                'company_description' => '',
                'representative_first_name' => '',
                'representative_last_name' => '',
                'representative_designation' => '',
                'representative_contact_number' => '',
            ]);

            return response()->json([
                'message' => 'Step 1 completed: Account created and company type set.',
                'employer_id' => $employer->employer_id,
                'company_type' => $employer->company_type,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Step 2: Add company profile information
     * POST /api/employer/register/step-2
     */
    public function registerStep2(Request $request, GoogleMapsService $maps): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'company_name' => 'required|string|max:255',
            'tin' => ['required', 'regex:/^\d{3}-\d{3}-\d{3}-\d{3}$/'],
            'trade_name' => 'nullable|string|max:255',
            'industry' => 'required|string|max:100',
            'company_size' => 'required|in:micro,small,medium,large',
            'province' => 'required|string|max:100',
            'city_municipality' => 'required|string|max:100',
            'barangay' => 'required|string|max:100',
            'house_unit_street' => 'required|string|max:255',
            'province_code' => 'nullable|string|max:10',
            'city_code' => 'nullable|string|max:10',
            'barangay_code' => 'nullable|string|max:10',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'location_accuracy' => 'nullable|integer|min:0|max:100000',
            'google_place_id' => 'nullable|string|max:255',
            'company_description' => 'required|string|max:5000',
            'company_logo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $employer = $this->authenticatedEmployer($request);
            $data = $validator->validated();
            unset($data['company_logo']);

            // Handle logo upload
            if ($request->hasFile('company_logo')) {
                $logo = $request->file('company_logo');
                $logoPath = $logo->store('employer_logos', 'public');
                $data['company_logo'] = $logoPath;
            }

            // Build complete address from components
            $addressService = new AddressService();
            $data['full_address'] = $addressService->buildFullAddress(
                $request->house_unit_street,
                $request->barangay,
                $request->city_municipality,
                $request->province
            );
            $data['complete_address'] = "{$request->house_unit_street}, {$request->barangay}, {$request->city_municipality}, {$request->province}";
            $data['region_code'] = substr($request->province_code ?? '', 0, 2) ?: null;

            if (isset($data['latitude'], $data['longitude'])) {
                $data['location_verified_at'] = now();
            }

            if (
                Schema::hasColumns('employers', ['latitude', 'longitude', 'google_place_id'])
                && ! isset($data['latitude'], $data['longitude'])
            ) {
                try {
                    $location = $maps->geocode($data['complete_address'].', Philippines');
                    if ($location) {
                        $data['latitude'] = $location['latitude'];
                        $data['longitude'] = $location['longitude'];
                        $data['google_place_id'] = $location['place_id'];
                        $data['location_verified_at'] = now();
                    }
                } catch (\Throwable) {
                    // A valid PSGC address can still be saved during a temporary map-service outage.
                }
            }

            $employer->update($data);

            return response()->json([
                'message' => 'Step 2 completed: Company profile saved.',
                'employer_id' => $employer->employer_id,
                'company_name' => $employer->company_name,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Step 3: Upload required documents
     * POST /api/employer/register/step-3
     */
    public function registerStep3(Request $request): JsonResponse
    {
        $employer = $this->authenticatedEmployer($request);
        $requiredDocuments = $employer->getRequiredDocuments();
        $allowedDocuments = array_merge($requiredDocuments, $employer->getOptionalDocuments());

        $validator = Validator::make($request->all(), [
            'document_type' => ['required', 'string', 'in:'.implode(',', $allowedDocuments)],
            'document_file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $file = $request->file('document_file');

            $documentDisk = $this->documentDisk();
            $documentPath = $file->store('employer_documents', $documentDisk);

            $previousDocument = $employer->documents()
                ->where('document_type', $request->document_type)
                ->first();

            if ($previousDocument) {
                $this->deleteStoredDocument($previousDocument->document_path);
            }

            $document = EmployerDocument::updateOrCreate([
                'employer_id' => $employer->employer_id,
                'document_type' => $request->document_type,
            ], [
                'document_path' => $documentPath,
                'original_filename' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'uploaded_at' => now(),
                'verification_status' => 'pending',
            ]);

            return response()->json([
                'message' => 'Document uploaded successfully.',
                'document_id' => $document->document_id,
                'document_type' => $document->document_type,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get required documents for employer's company type
     * GET /api/employer/register/required-documents/{employer_id}
     */
    public function getRequiredDocuments(Request $request): JsonResponse
    {
        try {
            $employer = $this->authenticatedEmployer($request);
            $required = $employer->getRequiredDocuments();
            $optional = $employer->getOptionalDocuments();
            $uploaded = $employer->documents()
                ->pluck('document_type')
                ->toArray();

            return response()->json([
                'required_documents' => $required,
                'optional_documents' => $optional,
                'uploaded_documents' => $uploaded,
                'missing_documents' => array_diff($required, $uploaded),
                'all_uploaded' => $employer->hasAllRequiredDocuments(),
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Step 4: Add representative details and submit registration
     * POST /api/employer/register/step-4
     */
    public function registerStep4(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'representative_first_name' => 'required|string|max:100',
            'representative_middle_name' => 'nullable|string|max:100',
            'representative_last_name' => 'required|string|max:100',
            'representative_designation' => 'required|string|max:100',
            'representative_contact_number' => ['required', 'regex:/^09\d{9}$/'],
            'representative_is_owner' => 'required|boolean',
            'government_id' => 'required|file|mimes:jpg,jpeg,png|max:5120',
            'authorization_letter' => 'required_if:representative_is_owner,0|nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $employer = $this->authenticatedEmployer($request);
            $isResubmission = $employer->verification_status === 'rejected';

            if (! $employer->hasAllRequiredDocuments()) {
                return response()->json([
                    'message' => 'Upload all required company documents before submitting.',
                ], 422);
            }

            // Update representative details
            $employer->update([
                'representative_first_name' => $request->representative_first_name,
                'representative_middle_name' => $request->representative_middle_name,
                'representative_last_name' => $request->representative_last_name,
                'representative_designation' => $request->representative_designation,
                'representative_contact_number' => $request->representative_contact_number,
                'representative_is_owner' => $request->boolean('representative_is_owner'),
                'representative_name' => "{$request->representative_first_name} {$request->representative_last_name}",
                'mobile_number' => $request->representative_contact_number,
                'verification_status' => 'pending',
                'verified_at' => null,
                'rejection_reason' => null,
                'verified_by_admin_id' => null,
            ]);

            // Upload government ID
            if ($request->hasFile('government_id')) {
                $idFile = $request->file('government_id');
                $idPath = $idFile->store('employer_documents', $this->documentDisk());

                EmployerDocument::updateOrCreate([
                    'employer_id' => $employer->employer_id,
                    'document_type' => 'government_id',
                ], [
                    'document_path' => $idPath,
                    'original_filename' => $idFile->getClientOriginalName(),
                    'file_size' => $idFile->getSize(),
                    'mime_type' => $idFile->getMimeType(),
                    'uploaded_at' => now(),
                    'verification_status' => 'pending',
                ]);
            }

            // Upload authorization letter if provided
            if ($request->hasFile('authorization_letter')) {
                $letterFile = $request->file('authorization_letter');
                $letterPath = $letterFile->store('employer_documents', $this->documentDisk());

                EmployerDocument::updateOrCreate([
                    'employer_id' => $employer->employer_id,
                    'document_type' => 'authorization_letter',
                ], [
                    'document_path' => $letterPath,
                    'original_filename' => $letterFile->getClientOriginalName(),
                    'file_size' => $letterFile->getSize(),
                    'mime_type' => $letterFile->getMimeType(),
                    'uploaded_at' => now(),
                    'verification_status' => 'pending',
                ]);
            }

            try {
                $employer->notify(new EmployerVerificationProgressUpdated(
                    $isResubmission ? 'registration_resubmitted' : 'registration_submitted'
                ));
            } catch (\Throwable $exception) {
                report($exception);
            }

            return response()->json([
                'message' => $isResubmission
                    ? 'Corrected registration resubmitted for review.'
                    : 'Registration submitted for review. Your account is now pending verification.',
                'employer_id' => $employer->employer_id,
                'verification_status' => $employer->verification_status,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get employer profile (for pre-fill during registration)
     * GET /api/employer/profile/{employer_id}
     */
    public function getProfile(Request $request): JsonResponse
    {
        try {
            $employer = $this->authenticatedEmployer($request)->load('documents');

            return response()->json([
                'employer' => [
                    'employer_id' => $employer->employer_id,
                    'email' => $employer->email,
                    'company_type' => $employer->company_type,
                    'company_name' => $employer->company_name,
                    'tin' => $employer->tin,
                    'trade_name' => $employer->trade_name,
                    'industry' => $employer->industry,
                    'company_size' => $employer->company_size,
                    'province' => $employer->province,
                    'city_municipality' => $employer->city_municipality,
                    'barangay' => $employer->barangay,
                    'house_unit_street' => $employer->house_unit_street,
                    'company_description' => $employer->company_description,
                    'company_logo' => $employer->company_logo,
                    'representative_first_name' => $employer->representative_first_name,
                    'representative_middle_name' => $employer->representative_middle_name,
                    'representative_last_name' => $employer->representative_last_name,
                    'representative_designation' => $employer->representative_designation,
                    'representative_contact_number' => $employer->representative_contact_number,
                    'representative_is_owner' => $employer->representative_is_owner,
                    'mobile_number' => $employer->mobile_number,
                    'verification_status' => $employer->verification_status,
                    'verified_at' => $employer->verified_at,
                    'rejection_reason' => $employer->rejection_reason,
                ],
                'documents' => $employer->documents->map(fn ($doc) => [
                    'document_id' => $doc->document_id,
                    'document_type' => $doc->document_type,
                    'verification_status' => $doc->verification_status,
                    'uploaded_at' => $doc->uploaded_at,
                ]),
                'required_documents' => $employer->getRequiredDocuments(),
                'optional_documents' => $employer->getOptionalDocuments(),
                'all_required_uploaded' => $employer->hasAllRequiredDocuments(),
                'can_post_jobs' => $employer->canPostJobs(),
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    private function authenticatedEmployer(Request $request): Employer
    {
        $user = $request->user();

        abort_unless($user instanceof Employer, 403, 'Employer account required.');

        return $user;
    }

    private function documentDisk(): string
    {
        return (string) config('filesystems.employer_documents_disk', 'local');
    }

    private function deleteStoredDocument(string $path): void
    {
        $disk = $this->documentDisk();

        if (Storage::disk($disk)->exists($path)) {
            Storage::disk($disk)->delete($path);

            return;
        }

        // Compatibility for files uploaded before private storage was enabled.
        if ($disk !== 'public' && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    /**
     * Login for employers
     * POST /api/employer/login
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employer = Employer::where('email', $request->email)->first();

        if (! $employer || ! Hash::check($request->password, $employer->password)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        // Check if account is deleted (soft delete)
        if ($employer->deleted_at) {
            return response()->json(['error' => 'Account has been deactivated'], 403);
        }

        $token = $employer->createToken('employer_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'employer_id' => $employer->employer_id,
            'email' => $employer->email,
            'verification_status' => $employer->verification_status,
            'can_post_jobs' => $employer->canPostJobs(),
            'token' => $token,
        ], 200);
    }
}
