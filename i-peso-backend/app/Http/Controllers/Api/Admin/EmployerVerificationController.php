<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\EmployerDocument;
use App\Notifications\EmployerVerificationProgressUpdated;
use App\Notifications\EmployerVerificationStatusChanged;
use App\Services\ActivityLogger;
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
    public function getPendingEmployers(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'readiness' => ['nullable', 'in:ready,awaiting'],
            'sort' => ['nullable', 'in:oldest,newest'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        try {
            $query = Employer::query()
                ->where('verification_status', 'pending')
                // Excludes registrations still in progress (Steps 1-4 of the
                // onboarding wizard) — verification_status is 'pending' from
                // the moment the account is created, long before there's
                // anything for an admin to actually review.
                ->whereNotNull('registration_submitted_at')
                ->with('documents')
                ->when($filters['search'] ?? null, function ($builder, $search) {
                    $needle = '%'.addcslashes(trim($search), '%_\\').'%';

                    $builder->where(fn ($scoped) => $scoped
                        ->where('company_name', 'like', $needle)
                        ->orWhere('trade_name', 'like', $needle)
                        ->orWhere('email', 'like', $needle)
                        ->orWhere('representative_first_name', 'like', $needle)
                        ->orWhere('representative_last_name', 'like', $needle));
                });

            // A verification queue is worked oldest-first, so the employer who has
            // been waiting longest surfaces by default.
            $employers = $query
                ->orderBy('created_at', ($filters['sort'] ?? 'oldest') === 'newest' ? 'desc' : 'asc')
                ->paginate($filters['per_page'] ?? 15)
                ->withQueryString();

            $employers->setCollection(
                $employers->getCollection()->map(fn (Employer $employer) => $this->queueEntry($employer))
            );

            // Readiness depends on per-document status, so it is applied after
            // shaping rather than as a SQL predicate.
            if ($readiness = $filters['readiness'] ?? null) {
                $employers->setCollection(
                    $employers->getCollection()
                        ->filter(fn (array $entry) => $readiness === 'ready'
                            ? $entry['all_required_approved']
                            : ! $entry['all_required_approved'])
                        ->values()
                );
            }

            return response()->json([
                'total' => $employers->total(),
                'employers' => $employers->items(),
                'pagination' => [
                    'current_page' => $employers->currentPage(),
                    'last_page' => $employers->lastPage(),
                    'per_page' => $employers->perPage(),
                    'total' => $employers->total(),
                ],
                'summary' => $this->queueSummary(),
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $this->safeErrorMessage($e, 'Unable to load the verification queue.')], 500);
        }
    }

    /** Shape one pending employer for the verification queue. */
    private function queueEntry(Employer $employer): array
    {
        $requiredDocuments = $employer->getRequiredDocuments();

        $approvedRequiredCount = $employer->documents
            ->whereIn('document_type', $requiredDocuments)
            ->where('verification_status', 'approved')
            ->count();

        $pendingRequiredCount = $employer->documents
            ->whereIn('document_type', $requiredDocuments)
            ->where('verification_status', 'pending')
            ->count();

        // An employer is "ready for decision" when all required docs are uploaded
        // (pending or approved). This covers both new submissions and resubmissions
        // where docs were reset to pending after correction.
        $uploadedRequiredTypes = $employer->documents
            ->whereIn('document_type', $requiredDocuments)
            ->whereIn('verification_status', ['pending', 'approved'])
            ->pluck('document_type')
            ->unique();

        $allRequiredReady = count($requiredDocuments) > 0
            && $uploadedRequiredTypes->count() === count($requiredDocuments);

        // Carbon 3's diffInX() helpers return floats, so floor to whole hours
        // before splitting into days/hours for a clean, decimal-free display.
        $hoursWaiting = $employer->created_at ? (int) floor($employer->created_at->diffInHours(now())) : 0;

        return [
            'employer_id'                       => $employer->employer_id,
            'email'                             => $employer->email,
            'company_name'                      => $employer->company_name,
            'company_type'                      => $employer->company_type,
            'company_size'                      => $employer->company_size,
            'representative_name'               => $employer->representative_name,
            'created_at'                        => $employer->created_at,
            'days_waiting'                      => intdiv($hoursWaiting, 24),
            'hours_waiting'                     => $hoursWaiting % 24,
            'documents_count'                   => $employer->documents->count(),
            'rejected_documents_count'          => $employer->documents
                ->where('verification_status', 'rejected')
                ->count(),
            'required_documents'                => $requiredDocuments,
            'required_documents_count'          => count($requiredDocuments),
            'approved_required_documents_count' => $approvedRequiredCount,
            'pending_required_documents_count'  => $pendingRequiredCount,
            'all_required_uploaded'             => $employer->hasAllRequiredDocuments(),
            // True when all required docs are in a reviewable state (pending or approved)
            'all_required_approved'             => $allRequiredReady,
            // Flag resubmissions so the admin queue can show a distinct badge
            'is_resubmission'                   => ! empty($employer->rejection_reason),
        ];
    }

    /** Queue-wide counts, unaffected by the current filters. */
    private function queueSummary(): array
    {
        $pending = Employer::query()
            ->where('verification_status', 'pending')
            ->with('documents')
            ->get()
            ->map(fn (Employer $employer) => $this->queueEntry($employer));

        return [
            'pending' => $pending->count(),
            'ready_to_approve' => $pending->where('all_required_approved', true)->count(),
            'awaiting_documents' => $pending->where('all_required_uploaded', false)->count(),
            'waiting_over_7_days' => $pending->where('days_waiting', '>=', 7)->count(),
        ];
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
                    'viewed_at' => $doc->viewed_at,
                    'verification_status' => $doc->verification_status,
                    'admin_notes' => $doc->admin_notes,
                ]),
                'required_documents' => $employer->getRequiredDocuments(),
                'uploaded_documents' => $employer->documents->pluck('document_type')->toArray(),
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $this->safeErrorMessage($e, 'Unable to load this employer.')], 404);
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

                ActivityLogger::logAs($request->user(), 'approved_employer', sprintf(
                    'Approved employer #%d (%s).%s',
                    $employer->employer_id,
                    $employer->email,
                    isset($validated['remarks']) ? " Remarks: {$validated['remarks']}" : ''
                ));
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
            return response()->json(['error' => $this->safeErrorMessage($e, 'Unable to approve this employer.')], 500);
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

                ActivityLogger::logAs($request->user(), 'rejected_employer', sprintf(
                    'Rejected employer #%d (%s). Reason: %s',
                    $employer->employer_id,
                    $employer->email,
                    $request->rejection_reason
                ));
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
            return response()->json(['error' => $this->safeErrorMessage($e, 'Unable to reject this employer.')], 500);
        }
    }

    /**
     * Finalize employer verification in a single action.
     *
     * Every document's decision was already persisted the moment the admin made
     * it (see reviewDocument()) — this reads that state rather than trusting a
     * fresh payload from the frontend. Any required document still 'pending'
     * (opened but never explicitly rejected) is approved now by default. If any
     * *required* document ends up rejected or was never uploaded, the employer
     * is rejected; otherwise the employer is approved.
     *
     * POST /api/admin/employers/{employer_id}/finalize
     */
    public function finalizeVerification($employer_id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $employer = Employer::with('documents')->findOrFail($employer_id);

            // Require all required documents to be viewed by the admin before making a final decision
            $requiredDocs = $employer->getRequiredDocuments();
            $unviewedRequired = $employer->documents
                ->whereIn('document_type', $requiredDocs)
                ->where('verification_status', '!=', 'approved')
                ->where('viewed_at', null);

            if ($unviewedRequired->isNotEmpty()) {
                return response()->json([
                    'error' => 'You must view all required documents before completing the review.',
                    'unviewed_documents' => $unviewedRequired->pluck('document_type')
                ], 422);
            }

            $requiredTypes = $employer->getRequiredDocuments();
            $uploadedTypes = $employer->documents->pluck('document_type')->all();
            $missingRequired = array_values(array_diff($requiredTypes, $uploadedTypes));

            // Compile the rejection narrative and decide the outcome from what's
            // already persisted on each document (set via reviewDocument()).
            $rejectionLines = [];
            $rejectedRequired = false;

            foreach ($employer->documents as $document) {
                if ($document->verification_status === 'rejected') {
                    $rejectionLines[] = $this->documentLabel($document->document_type).': '.($document->admin_notes ?? 'Document requires correction.');
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

            DB::transaction(function () use ($employer, $isRejection, $rejectionReason, $validated, $request) {
                // Any document not already rejected is approved by default —
                // covers documents that were only ever viewed, never explicitly
                // flagged, preserving the existing "approve unless flagged" UX.
                foreach ($employer->documents as $document) {
                    if ($document->verification_status !== 'rejected') {
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

                    ActivityLogger::logAs($request->user(), 'finalized_employer_rejected', sprintf(
                        'Rejected employer #%d (%s) via unified review. Reason: %s',
                        $employer->employer_id,
                        $employer->email,
                        $rejectionReason
                    ));
                } else {
                    $employer->update([
                        'verification_status' => 'verified',
                        'verified_at' => now(),
                        'rejection_reason' => null,
                        'verified_by_admin_id' => $request->user()->getKey(),
                    ]);

                    ActivityLogger::logAs($request->user(), 'finalized_employer_approved', sprintf(
                        'Approved employer #%d (%s) via unified review.%s',
                        $employer->employer_id,
                        $employer->email,
                        ! empty($validated['remarks']) ? " Remarks: {$validated['remarks']}" : ''
                    ));
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
            return response()->json(['error' => $this->safeErrorMessage($e, 'Unable to finalize this employer verification.')], 500);
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
            'affidavit_of_undertaking' => 'Affidavit of Undertaking',
            'no_pending_case_certificate' => 'Certificate of No Pending Case (DOLE)',
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

        ActivityLogger::logAs($request->user(), 'viewed_employer_document', sprintf(
            'Viewed employer document #%d (%s) for employer #%d.',
            $document->document_id,
            $document->document_type,
            $document->employer_id
        ));

        if ($document->viewed_at === null) {
            $document->viewed_at = now();
            $document->save();
        }

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

        ActivityLogger::logAs($request->user(), 'downloaded_employer_document', sprintf(
            'Downloaded employer document #%d (%s) for employer #%d. Reason: %s',
            $document->document_id,
            $document->document_type,
            $document->employer_id,
            $validated['reason']
        ));

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
            $employer = $document->employer;
            // Captured before the update — drives whether this is a live intake
            // review (employer still 'pending', notification suppressed in favor
            // of the single consolidated notice finalize() sends) or a standalone
            // correction on an already-decided employer (notify immediately).
            $employerStatusBefore = $employer->verification_status;

            // Intentionally does NOT touch the employer's overall verification_status
            // here — that stays 'pending' for the whole review session so the admin's
            // review controls (EmployerDetailPage.jsx gates them on 'pending') never
            // disappear mid-session after just one document is rejected. The overall
            // verdict is decided once, at finalize(), by reading these persisted
            // per-document statuses.
            $document->update([
                'verification_status' => $request->verification_status,
                'admin_notes' => $request->admin_notes,
                'viewed_at' => $document->viewed_at ?? now(),
            ]);

            ActivityLogger::logAs($request->user(), 'reviewed_employer_document', sprintf(
                'Marked employer document #%d (%s) as %s for employer #%d.%s',
                $document->document_id,
                $document->document_type,
                $document->verification_status,
                $document->employer_id,
                $document->admin_notes ? " Notes: {$document->admin_notes}" : ''
            ));

            $notificationQueued = false;
            if ($employerStatusBefore !== 'pending' && $previousStatus !== $document->verification_status) {
                $event = $document->verification_status === 'rejected'
                    ? 'document_rejected'
                    : 'document_approved';

                if (
                    $document->verification_status === 'approved'
                    && in_array($document->document_type, $employer->getRequiredDocuments(), true)
                    && $this->allRequiredDocumentsApproved($employer)
                ) {
                    $event = 'all_required_documents_approved';
                }

                $notificationQueued = $this->queueProgressNotification(
                    $employer,
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
                'viewed_at' => $document->viewed_at?->toISOString(),
                'notification_queued' => $notificationQueued,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $this->safeErrorMessage($e, 'Unable to record this document review.')], 404);
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
            return response()->json(['error' => $this->safeErrorMessage($e, 'Unable to load verification statistics.')], 500);
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
