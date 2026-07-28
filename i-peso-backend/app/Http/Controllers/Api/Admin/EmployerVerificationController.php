<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Employer;
use App\Models\EmployerDocument;
use App\Notifications\EmployerVerificationProgressUpdated;
use App\Notifications\EmployerVerificationStatusChanged;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployerVerificationController extends Controller
{
    /**
     * Get all pending employer registrations
     * GET /api/admin/employers/pending
     */
    public function getPendingEmployers(): JsonResponse
    {
        try {
            $employers = Employer::where('verification_status', 'pending')
                ->with('documents')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'total' => $employers->count(),
                'employers' => $employers->map(function ($employer) {
                    $requiredDocuments = $employer->getRequiredDocuments();
                    $requiredUploaded = $employer->documents
                        ->whereIn('document_type', $requiredDocuments);
                    $approvedRequiredCount = $requiredUploaded
                        ->where('verification_status', 'approved')
                        ->count();

                    return [
                        'employer_id' => $employer->employer_id,
                        'email' => $employer->email,
                        'company_name' => $employer->company_name,
                        'company_type' => $employer->company_type,
                        'company_size' => $employer->company_size,
                        'representative_name' => $employer->representative_name,
                        'created_at' => $employer->created_at,
                        'documents_count' => $employer->documents->count(),
                        'required_documents' => $requiredDocuments,
                        'required_documents_count' => count($requiredDocuments),
                        'approved_required_documents_count' => $approvedRequiredCount,
                        'all_required_uploaded' => $employer->hasAllRequiredDocuments(),
                        'all_required_approved' => $approvedRequiredCount === count($requiredDocuments),
                    ];
                }),
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get employer details for review
     * GET /api/admin/employers/{employer_id}/review
     */
    public function reviewEmployer($employer_id): JsonResponse
    {
        try {
            $employer = Employer::with('documents')->findOrFail($employer_id);

            return response()->json([
                'employer' => [
                    'employer_id' => $employer->employer_id,
                    'email' => $employer->email,
                    'company_type' => $employer->company_type,
                    'company_name' => $employer->company_name,
                    'trade_name' => $employer->trade_name,
                    'industry' => $employer->industry,
                    'company_size' => $employer->company_size,
                    'complete_address' => $employer->complete_address,
                    'company_description' => $employer->company_description,
                    'company_logo' => $employer->company_logo,
                    'company_logo_url' => $employer->company_logo
                        ? Storage::disk('public')->url($employer->company_logo)
                        : null,
                    'representative_first_name' => $employer->representative_first_name,
                    'representative_middle_name' => $employer->representative_middle_name,
                    'representative_last_name' => $employer->representative_last_name,
                    'representative_designation' => $employer->representative_designation,
                    'representative_contact_number' => $employer->representative_contact_number,
                    'verification_status' => $employer->verification_status,
                    'created_at' => $employer->created_at,
                ],
                'documents' => $employer->documents->map(fn ($doc) => [
                    'document_id' => $doc->document_id,
                    'document_type' => $doc->document_type,
                    'original_filename' => $doc->original_filename,
                    'uploaded_at' => $doc->uploaded_at,
                    'verification_status' => $doc->verification_status,
                    'admin_notes' => $doc->admin_notes,
                ]),
                'required_documents' => $employer->getRequiredDocuments(),
                'uploaded_documents' => $employer->documents->pluck('document_type')->toArray(),
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Approve employer registration
     * POST /api/admin/employers/{employer_id}/approve
     */
    public function approveEmployer($employer_id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $employer = Employer::findOrFail($employer_id);

            // Verify all required documents are uploaded
            if (! $employer->hasAllRequiredDocuments()) {
                return response()->json([
                    'error' => 'Cannot approve: Not all required documents have been uploaded.',
                    'missing_documents' => array_diff(
                        $employer->getRequiredDocuments(),
                        $employer->documents->pluck('document_type')->toArray()
                    ),
                ], 422);
            }

            $unapprovedRequiredDocuments = $employer->documents()
                ->whereIn('document_type', $employer->getRequiredDocuments())
                ->where('verification_status', '!=', 'approved')
                ->get(['document_type', 'verification_status']);

            if ($unapprovedRequiredDocuments->isNotEmpty()) {
                return response()->json([
                    'error' => 'Review and approve every required document before approving the employer.',
                    'unapproved_documents' => $unapprovedRequiredDocuments,
                ], 422);
            }

            DB::transaction(function () use ($employer, $request, $validated) {
                $employer->update([
                    'verification_status' => 'verified',
                    'verified_at' => now(),
                    'rejection_reason' => null,
                    'verified_by_admin_id' => $request->user()->getKey(),
                ]);

                ActivityLog::create([
                    'user_type' => $request->user()::class,
                    'user_id' => $request->user()->getKey(),
                    'action' => 'approved_employer',
                    'description' => sprintf(
                        'Approved employer #%d (%s).%s',
                        $employer->employer_id,
                        $employer->email,
                        isset($validated['remarks']) ? " Remarks: {$validated['remarks']}" : ''
                    ),
                    'ip_address' => $request->ip(),
                ]);
            });

            $notificationQueued = $this->queueStatusNotification(
                $employer,
                'verified',
                $validated['remarks'] ?? null,
            );

            return response()->json([
                'message' => 'Employer approved successfully and notification queued.',
                'employer_id' => $employer->employer_id,
                'verification_status' => $employer->verification_status,
                'verified_at' => $employer->verified_at,
                'notification_queued' => $notificationQueued,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Reject employer registration with reason
     * POST /api/admin/employers/{employer_id}/reject
     */
    public function rejectEmployer($employer_id, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|min:10',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $employer = Employer::findOrFail($employer_id);

            DB::transaction(function () use ($employer, $request) {
                $employer->update([
                    'verification_status' => 'rejected',
                    'verified_at' => null,
                    'rejection_reason' => $request->rejection_reason,
                    'verified_by_admin_id' => $request->user()->getKey(),
                ]);

                $employer->vacancies()->where('status', 'active')->update([
                    'status' => 'closed',
                ]);

                ActivityLog::create([
                    'user_type' => $request->user()::class,
                    'user_id' => $request->user()->getKey(),
                    'action' => 'rejected_employer',
                    'description' => sprintf(
                        'Rejected employer #%d (%s). Reason: %s',
                        $employer->employer_id,
                        $employer->email,
                        $request->rejection_reason
                    ),
                    'ip_address' => $request->ip(),
                ]);
            });

            $notificationQueued = $this->queueStatusNotification(
                $employer,
                'rejected',
                $request->rejection_reason,
            );

            return response()->json([
                'message' => 'Employer registration rejected and notification queued.',
                'employer_id' => $employer->employer_id,
                'verification_status' => $employer->verification_status,
                'rejection_reason' => $employer->rejection_reason,
                'notification_queued' => $notificationQueued,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Finalize employer verification in a single action.
     *
     * Every uploaded document is treated as APPROVED by default. Only the
     * documents listed in `rejected_documents` are marked rejected (with a
     * preset reason). If any *required* document ends up rejected or was never
     * uploaded, the employer is rejected; otherwise the employer is approved.
     *
     * POST /api/admin/employers/{employer_id}/finalize
     */
    public function finalizeVerification($employer_id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rejected_documents' => ['nullable', 'array'],
            'rejected_documents.*.document_id' => ['required', 'integer'],
            'rejected_documents.*.reason' => ['required', 'string', 'min:10', 'max:1000'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $employer = Employer::with('documents')->findOrFail($employer_id);

            $rejectedReasons = collect($validated['rejected_documents'] ?? [])
                ->keyBy('document_id')
                ->map(fn ($entry) => $entry['reason']);

            $requiredTypes = $employer->getRequiredDocuments();
            $uploadedTypes = $employer->documents->pluck('document_type')->all();
            $missingRequired = array_values(array_diff($requiredTypes, $uploadedTypes));

            // Compile the rejection narrative and decide the outcome.
            $rejectionLines = [];
            $rejectedRequired = false;

            foreach ($employer->documents as $document) {
                if ($rejectedReasons->has($document->document_id)) {
                    $rejectionLines[] = $this->documentLabel($document->document_type).': '.$rejectedReasons->get($document->document_id);
                    if (in_array($document->document_type, $requiredTypes, true)) {
                        $rejectedRequired = true;
                    }
                }
            }

            foreach ($missingRequired as $type) {
                $rejectionLines[] = $this->documentLabel($type).': Required document was not submitted.';
            }

            $isRejection = $rejectedRequired || ! empty($missingRequired);
            $rejectionReason = implode(' | ', $rejectionLines);

            DB::transaction(function () use ($employer, $rejectedReasons, $isRejection, $rejectionReason, $validated, $request) {
                // Persist each document's decision (approved unless explicitly rejected).
                foreach ($employer->documents as $document) {
                    if ($rejectedReasons->has($document->document_id)) {
                        $document->update([
                            'verification_status' => 'rejected',
                            'admin_notes' => $rejectedReasons->get($document->document_id),
                        ]);
                    } else {
                        $document->update([
                            'verification_status' => 'approved',
                            'admin_notes' => null,
                        ]);
                    }
                }

                if ($isRejection) {
                    $employer->update([
                        'verification_status' => 'rejected',
                        'verified_at' => null,
                        'rejection_reason' => $rejectionReason,
                        'verified_by_admin_id' => $request->user()->getKey(),
                    ]);

                    $employer->vacancies()->where('status', 'active')->update(['status' => 'closed']);

                    ActivityLog::create([
                        'user_type' => $request->user()::class,
                        'user_id' => $request->user()->getKey(),
                        'action' => 'finalized_employer_rejected',
                        'description' => sprintf(
                            'Rejected employer #%d (%s) via unified review. Reason: %s',
                            $employer->employer_id,
                            $employer->email,
                            $rejectionReason
                        ),
                        'ip_address' => $request->ip(),
                    ]);
                } else {
                    $employer->update([
                        'verification_status' => 'verified',
                        'verified_at' => now(),
                        'rejection_reason' => null,
                        'verified_by_admin_id' => $request->user()->getKey(),
                    ]);

                    ActivityLog::create([
                        'user_type' => $request->user()::class,
                        'user_id' => $request->user()->getKey(),
                        'action' => 'finalized_employer_approved',
                        'description' => sprintf(
                            'Approved employer #%d (%s) via unified review.%s',
                            $employer->employer_id,
                            $employer->email,
                            ! empty($validated['remarks']) ? " Remarks: {$validated['remarks']}" : ''
                        ),
                        'ip_address' => $request->ip(),
                    ]);
                }
            });

            $notificationQueued = $this->queueStatusNotification(
                $employer,
                $isRejection ? 'rejected' : 'verified',
                $isRejection ? $rejectionReason : ($validated['remarks'] ?? null),
            );

            return response()->json([
                'message' => $isRejection
                    ? 'Employer registration rejected and notification queued.'
                    : 'Employer approved successfully and notification queued.',
                'outcome' => $isRejection ? 'rejected' : 'approved',
                'employer_id' => $employer->employer_id,
                'verification_status' => $employer->verification_status,
                'rejection_reason' => $employer->rejection_reason,
                'notification_queued' => $notificationQueued,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Human-readable label for a document type (mirrors the admin UI labels).
     */
    private function documentLabel(string $type): string
    {
        $labels = [
            'mayors_permit' => "Mayor's Permit",
            'bir_certificate' => 'BIR Certificate',
            'dti_certificate' => 'DTI Certificate',
            'sec_certificate' => 'SEC Certificate',
            'prpa_license' => 'PRPA License',
            'dme_poea_license' => 'DMW/POEA License',
            'philJobnet_proof' => 'PhilJobNet Proof',
            'government_id' => 'Government ID',
            'authorization_letter' => 'Authorization Letter',
        ];

        return $labels[$type] ?? ucwords(str_replace('_', ' ', $type));
    }

    /**
     * Stream an uploaded employer document to an authenticated administrator.
     * GET /api/admin/documents/{document_id}/view
     */
    public function viewDocument(Request $request, EmployerDocument $document): StreamedResponse
    {
        $disk = $this->documentStorageDisk($document);

        abort_unless(
            $disk !== null,
            404,
            'Document file not found.'
        );

        ActivityLog::create([
            'user_type' => $request->user()::class,
            'user_id' => $request->user()->getKey(),
            'action' => 'viewed_employer_document',
            'description' => sprintf(
                'Viewed employer document #%d (%s) for employer #%d.',
                $document->document_id,
                $document->document_type,
                $document->employer_id
            ),
            'ip_address' => $request->ip(),
        ]);

        return Storage::disk($disk)->response(
            $document->document_path,
            $document->original_filename,
            [
                'Content-Type' => $document->mime_type,
                'Content-Disposition' => 'inline; filename="'.$document->original_filename.'"',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]
        );
    }

    /**
     * Download an employer document for an official PESO purpose.
     * POST /api/admin/documents/{document_id}/download
     */
    public function downloadDocument(Request $request, EmployerDocument $document): StreamedResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:500'],
        ]);

        $disk = $this->documentStorageDisk($document);

        abort_unless(
            $disk !== null,
            404,
            'Document file not found.'
        );

        ActivityLog::create([
            'user_type' => $request->user()::class,
            'user_id' => $request->user()->getKey(),
            'action' => 'downloaded_employer_document',
            'description' => sprintf(
                'Downloaded employer document #%d (%s) for employer #%d. Reason: %s',
                $document->document_id,
                $document->document_type,
                $document->employer_id,
                $validated['reason']
            ),
            'ip_address' => $request->ip(),
        ]);

        return Storage::disk($disk)->download(
            $document->document_path,
            $document->original_filename,
            [
                'Content-Type' => $document->mime_type,
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store',
            ]
        );
    }

    /**
     * Review individual document
     * POST /api/admin/documents/{document_id}/review
     */
    public function reviewDocument($document_id, Request $request): JsonResponse
    {
        $notesRules = $request->input('verification_status') === 'rejected'
            ? ['required', 'string', 'min:10', 'max:1000']
            : ['nullable', 'string', 'max:1000'];

        $validator = Validator::make($request->all(), [
            'verification_status' => 'required|in:approved,rejected',
            'admin_notes' => $notesRules,
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $document = EmployerDocument::with('employer')->findOrFail($document_id);
            $previousStatus = $document->verification_status;

            $document->update([
                'verification_status' => $request->verification_status,
                'admin_notes' => $request->admin_notes,
            ]);

            ActivityLog::create([
                'user_type' => $request->user()::class,
                'user_id' => $request->user()->getKey(),
                'action' => 'reviewed_employer_document',
                'description' => sprintf(
                    'Marked employer document #%d (%s) as %s for employer #%d.%s',
                    $document->document_id,
                    $document->document_type,
                    $document->verification_status,
                    $document->employer_id,
                    $document->admin_notes ? " Notes: {$document->admin_notes}" : ''
                ),
                'ip_address' => $request->ip(),
            ]);

            $notificationQueued = true;
            if ($previousStatus !== $document->verification_status) {
                $event = $document->verification_status === 'rejected'
                    ? 'document_rejected'
                    : 'document_approved';

                if (
                    $document->verification_status === 'approved'
                    && in_array($document->document_type, $document->employer->getRequiredDocuments(), true)
                    && $this->allRequiredDocumentsApproved($document->employer)
                ) {
                    $event = 'all_required_documents_approved';
                }

                $notificationQueued = $this->queueProgressNotification(
                    $document->employer,
                    $event,
                    $document->document_type,
                    $document->admin_notes,
                );
            }

            return response()->json([
                'message' => 'Document review recorded.',
                'document_id' => $document->document_id,
                'verification_status' => $document->verification_status,
                'admin_notes' => $document->admin_notes,
                'notification_queued' => $notificationQueued,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Get verification statistics
     * GET /api/admin/employers/stats
     */
    public function getStats(): JsonResponse
    {
        try {
            $stats = [
                'pending' => Employer::where('verification_status', 'pending')->count(),
                'verified' => Employer::where('verification_status', 'verified')->count(),
                'rejected' => Employer::where('verification_status', 'rejected')->count(),
                'total' => Employer::count(),
            ];

            return response()->json($stats, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function queueStatusNotification(Employer $employer, string $status, ?string $remarks): bool
    {
        try {
            $employer->notify(new EmployerVerificationStatusChanged($status, $remarks));

            return true;
        } catch (\Throwable $exception) {
            Log::error('Unable to queue employer verification status notification.', [
                'employer_id' => $employer->getKey(),
                'email' => $employer->email,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    private function queueProgressNotification(
        Employer $employer,
        string $event,
        ?string $documentType = null,
        ?string $remarks = null,
    ): bool {
        try {
            $employer->notify(new EmployerVerificationProgressUpdated($event, $documentType, $remarks));

            return true;
        } catch (\Throwable $exception) {
            Log::error('Unable to queue employer verification progress notification.', [
                'employer_id' => $employer->getKey(),
                'event' => $event,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    private function allRequiredDocumentsApproved(Employer $employer): bool
    {
        $requiredDocuments = $employer->getRequiredDocuments();
        $approvedDocuments = $employer->documents()
            ->whereIn('document_type', $requiredDocuments)
            ->where('verification_status', 'approved')
            ->pluck('document_type')
            ->unique();

        return $approvedDocuments->count() === count($requiredDocuments);
    }

    private function documentStorageDisk(EmployerDocument $document): ?string
    {
        $configuredDisk = (string) config('filesystems.employer_documents_disk', 'local');

        if (Storage::disk($configuredDisk)->exists($document->document_path)) {
            return $configuredDisk;
        }

        // Compatibility for documents uploaded before private storage was enabled.
        if ($configuredDisk !== 'public' && Storage::disk('public')->exists($document->document_path)) {
            return 'public';
        }

        return null;
    }
}
