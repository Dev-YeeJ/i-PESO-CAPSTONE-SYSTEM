<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\FormatsGovernmentPrograms;
use App\Http\Controllers\Controller;
use App\Models\GovernmentProgram;
use App\Models\GovernmentProgramApplicationDocument;
use App\Models\ProgramApplication;
use App\Notifications\GovernmentProgramNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminGovernmentProgramApplicationController extends Controller
{
    use FormatsGovernmentPrograms;

    public function index(Request $request, GovernmentProgram $governmentProgram): JsonResponse
    {
        $applications = $governmentProgram->applications()
            ->with([
                'seeker:seeker_id,first_name,middle_name,last_name,email,mobile_number,educ_attainment,employment_status,address_barangay,address_municipality_city,address_province',
                'documents',
                'certificate',
                'reviewer:admin_id,first_name,last_name',
            ])
            ->when($request->string('status')->toString(), fn ($query, $status) => $query->where('application_status', $status))
            ->latest('prog_apply_id')
            ->paginate($request->integer('per_page', 20));

        $applications->through(fn (ProgramApplication $application) => [
            ...$this->formatProgramApplication($application),
            'eligibility_snapshot' => $application->eligibility_snapshot,
            'seeker' => [
                'seeker_id' => $application->seeker->seeker_id,
                'name' => trim("{$application->seeker->first_name} {$application->seeker->middle_name} {$application->seeker->last_name}"),
                'email' => $application->seeker->email,
                'mobile_number' => $application->seeker->mobile_number,
                'education' => $application->seeker->educ_attainment,
                'employment_status' => $application->seeker->employment_status,
                'address' => $application->seeker->getFullAddress(),
            ],
            'reviewer' => $application->reviewer ? trim("{$application->reviewer->first_name} {$application->reviewer->last_name}") : null,
        ]);

        return response()->json([
            'program' => [
                'program_id' => $governmentProgram->program_id,
                'title' => $governmentProgram->program_name,
                'available_slots' => $governmentProgram->available_slots,
                'total_slots' => $governmentProgram->total_slots,
            ],
            'applications' => $applications,
        ]);
    }

    public function updateStatus(Request $request, ProgramApplication $programApplication): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in([
                'pending',
                'under_review',
                'qualified',
                'for_interview',
                'approved',
                'rejected',
                'completed',
                'cancelled',
            ])],
            'remarks' => ['nullable', 'string', 'max:3000', 'required_if:status,rejected'],
        ]);

        $application = DB::transaction(function () use ($request, $programApplication, $validated) {
            $application = ProgramApplication::query()->lockForUpdate()->findOrFail($programApplication->prog_apply_id);
            $program = GovernmentProgram::query()->lockForUpdate()->findOrFail($application->program_id);
            $previous = $application->application_status;
            $next = $validated['status'];
            $previousUsesSlot = in_array($previous, ['approved', 'completed'], true);
            $nextUsesSlot = in_array($next, ['approved', 'completed'], true);

            if (! $previousUsesSlot && $nextUsesSlot && $program->total_slots > 0) {
                if ($program->available_slots < 1) {
                    throw ValidationException::withMessages(['status' => ['No program slots are available.']]);
                }
                $program->decrement('available_slots');
            } elseif ($previousUsesSlot && ! $nextUsesSlot && $program->total_slots > 0) {
                $program->update([
                    'available_slots' => min($program->total_slots, $program->available_slots + 1),
                ]);
            }

            $application->update([
                'application_status' => $next,
                'admin_remarks' => $validated['remarks'] ?? $application->admin_remarks,
                'reviewed_by_admin_id' => $request->user()->getKey(),
                'reviewed_at' => now(),
                'completed_at' => $next === 'completed' ? now() : $application->completed_at,
                'cancelled_at' => $next === 'cancelled' ? now() : null,
            ]);

            return $application->fresh(['program.skills', 'seeker', 'documents', 'certificate']);
        });

        $application->seeker->notify(new GovernmentProgramNotification(
            $application->program,
            'application_status_changed',
            $application,
        ));
        $this->recordSmsPrototype($application);

        return response()->json([
            'message' => 'Application status updated.',
            'application' => $this->formatProgramApplication($application),
        ]);
    }

    public function legacyReview(
        Request $request,
        GovernmentProgram $governmentProgram,
        ProgramApplication $programApplication,
    ): JsonResponse {
        abort_unless($programApplication->program_id === $governmentProgram->program_id, 404);
        $request->merge([
            'status' => $request->input('action') === 'approve' ? 'approved' : 'rejected',
        ]);

        return $this->updateStatus($request, $programApplication);
    }

    public function legacyBulkReview(Request $request, GovernmentProgram $governmentProgram): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'remarks' => ['nullable', 'string', 'max:3000', 'required_if:action,reject'],
        ]);

        foreach ($validated['ids'] as $id) {
            $application = $governmentProgram->applications()->findOrFail($id);
            $childRequest = Request::create('', 'POST', [
                'status' => $validated['action'] === 'approve' ? 'approved' : 'rejected',
                'remarks' => $validated['remarks'] ?? null,
            ]);
            $childRequest->setUserResolver(fn () => $request->user());
            $this->updateStatus($childRequest, $application);
        }

        return response()->json(['message' => 'Bulk review completed.']);
    }

    public function document(
        ProgramApplication $programApplication,
        GovernmentProgramApplicationDocument $document,
    ): StreamedResponse {
        abort_unless($document->application_id === $programApplication->prog_apply_id, 404);
        abort_unless(Storage::disk('local')->exists($document->file_path), 404);

        return Storage::disk('local')->response($document->file_path, $document->original_filename, [
            'Content-Type' => $document->mime_type,
            'Content-Disposition' => 'inline; filename="'.$document->original_filename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    private function recordSmsPrototype(ProgramApplication $application): void
    {
        if (! Schema::hasTable('sms_notifications') || blank($application->seeker->mobile_number)) {
            return;
        }

        DB::table('sms_notifications')->insert([
            'recipient_type' => $application->seeker::class,
            'recipient_id' => $application->seeker_id,
            'phone_number' => $application->seeker->mobile_number,
            'message_type' => 'government_program_status',
            'content' => "i-PESO: Your application for {$application->program->program_name} is now ".str_replace('_', ' ', $application->application_status).'.',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
