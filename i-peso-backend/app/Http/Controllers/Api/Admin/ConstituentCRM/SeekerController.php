<?php
// i-peso-backend/app/Http/Controllers/Api/Admin/ConstituentCRM/SeekerController.php

namespace App\Http\Controllers\Api\Admin\ConstituentCRM;

use App\Http\Controllers\Controller;
use App\Mail\AccountVerificationStatusMail;
use App\Models\ActivityLog;
use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Models\SeekerDisability;
use App\Models\SeekerLanguage;
use App\Models\SeekerOccupation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SeekerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = JobSeeker::query();

        // Search by name or email
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%$search%")
                  ->orWhere('last_name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
            });
        }

        // Filter by profile completion
        if ($request->has('profile_completed')) {
            $query->where('profile_completed', (bool)$request->profile_completed);
        }

        // Filter by province
        if ($request->has('province') && $request->province) {
            $query->where('address_province', $request->province);
        }

        $seekers = $query->paginate($request->get('per_page', 15));

        return response()->json($seekers);
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $seeker = JobSeeker::with([
            'disabilities:id,seeker_id,disability_type,disability_specification',
            'languages:id,seeker_id,language,language_other,can_read,can_write,can_speak,can_understand',
            'occupations:id,seeker_id,occupation_title,preference_order',
        ])->findOrFail($id);

        return response()->json($seeker);
    }

    public function verify(Request $request, int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $remarksRules = $request->input('action') === 'reject'
            ? ['required', 'string', 'min:10', 'max:1000']
            : ['nullable', 'string', 'max:1000'];

        $validated = $request->validate([
            'action' => ['required', 'in:approve,reject'],
            'remarks' => $remarksRules,
        ]);

        $seeker = JobSeeker::findOrFail($id);
        $status = $validated['action'] === 'approve' ? 'verified' : 'rejected';
        $remarks = $validated['remarks'] ?? null;

        DB::transaction(function () use ($admin, $request, $remarks, $seeker, $status) {
            $seeker->update([
                'is_verified' => $status === 'verified',
                'verification_status' => $status,
                'verified_at' => now(),
                'verified_by' => $admin->admin_id,
                'verification_remarks' => $remarks,
            ]);

            ActivityLog::create([
                'user_type' => $admin::class,
                'user_id' => $admin->getKey(),
                'action' => $status === 'verified' ? 'approved_job_seeker' : 'rejected_job_seeker',
                'description' => sprintf(
                    '%s job seeker #%d (%s).%s',
                    ucfirst($status),
                    $seeker->seeker_id,
                    $seeker->email,
                    $remarks ? " Remarks: {$remarks}" : ''
                ),
                'ip_address' => $request->ip(),
            ]);
        });

        $notificationQueued = $this->queueStatusEmail(
            $seeker->email,
            new AccountVerificationStatusMail(
                trim("{$seeker->first_name} {$seeker->last_name}"),
                'Job Seeker',
                $status,
                $remarks,
            )
        );

        return response()->json([
            'message' => $status === 'verified'
                ? 'Seeker profile approved and notification queued.'
                : 'Seeker profile rejected and notification queued.',
            'notification_queued' => $notificationQueued,
            'seeker' => $seeker->fresh(),
        ]);
    }

    private function queueStatusEmail(string $email, AccountVerificationStatusMail $mail): bool
    {
        try {
            Mail::to($email)->queue($mail);

            return true;
        } catch (\Throwable $exception) {
            Log::error('Unable to queue seeker verification status email.', [
                'email' => $email,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    public function verificationQueue(): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $seekers = JobSeeker::where('profile_completed', true)
            ->where('verification_status', 'pending')
            ->paginate(15);

        return response()->json($seekers);
    }
}
