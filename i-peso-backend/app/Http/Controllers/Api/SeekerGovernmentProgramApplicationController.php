<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsGovernmentPrograms;
use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\GovernmentProgram;
use App\Models\GovernmentProgramApplicationDocument;
use App\Models\JobSeeker;
use App\Models\ProgramApplication;
use App\Notifications\GovernmentProgramNotification;
use App\Services\GovernmentProgramEligibilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SeekerGovernmentProgramApplicationController extends Controller
{
    use FormatsGovernmentPrograms;

    public function apply(
        Request $request,
        GovernmentProgram $governmentProgram,
        GovernmentProgramEligibilityService $eligibility,
    ): JsonResponse {
        $seeker = $this->seeker($request);

        $application = DB::transaction(function () use ($seeker, $governmentProgram, $eligibility) {
            $program = GovernmentProgram::query()->lockForUpdate()->findOrFail($governmentProgram->program_id);
            if ($program->applications()->where('seeker_id', $seeker->seeker_id)->exists()) {
                throw ValidationException::withMessages(['program' => ['You already applied to this program.']]);
            }
            if ($program->program_status !== 'open' || $program->visibility !== 'public') {
                throw ValidationException::withMessages(['program' => ['This program is not accepting applications.']]);
            }
            if ($program->application_deadline && $program->application_deadline->isPast() && ! $program->application_deadline->isToday()) {
                throw ValidationException::withMessages(['program' => ['The application deadline has passed.']]);
            }
            if ($program->total_slots > 0 && $program->available_slots < 1) {
                throw ValidationException::withMessages(['program' => ['This program is full.']]);
            }

            $snapshot = $eligibility->evaluate($seeker, $program);

            return $program->applications()->create([
                'seeker_id' => $seeker->seeker_id,
                'application_status' => 'pending',
                'eligibility_snapshot' => $snapshot,
                'eligibility_score' => $snapshot['score'],
            ])->fresh(['program.skills', 'documents', 'certificate']);
        });

        Administrator::query()->where('status', 'active')->get()->each(
            fn (Administrator $admin) => $admin->notify(new GovernmentProgramNotification(
                $application->program,
                'application_submitted',
                $application,
            ))
        );

        return response()->json([
            'message' => 'Program application submitted.',
            'application' => $this->formatProgramApplication($application),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $seeker = $this->seeker($request);
        $applications = $seeker->programApplications()
            ->with(['program.skills', 'documents', 'certificate'])
            ->latest('prog_apply_id')
            ->get()
            ->map(fn (ProgramApplication $application) => [
                ...$this->formatProgramApplication($application),
                'program' => $this->formatProgram($application->program, $seeker),
            ]);

        return response()->json(['data' => $applications]);
    }

    public function uploadDocument(Request $request, ProgramApplication $programApplication): JsonResponse
    {
        $seeker = $this->seeker($request);
        abort_unless($programApplication->seeker_id === $seeker->seeker_id, 404);
        $validated = $request->validate([
            'document_type' => ['required', Rule::in(['requirement', 'certificate'])],
            'document_name' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx', 'max:5120'],
        ]);

        if ($validated['document_type'] === 'certificate' && $programApplication->application_status !== 'completed') {
            throw ValidationException::withMessages([
                'document_type' => ['Certificates can be recorded after program completion.'],
            ]);
        }

        $file = $request->file('file');
        $path = $file->store("government_programs/applications/{$programApplication->prog_apply_id}", 'local');

        $document = DB::transaction(function () use ($programApplication, $seeker, $validated, $file, $path) {
            $document = $programApplication->documents()->create([
                'document_type' => $validated['document_type'],
                'document_name' => $validated['document_name'],
                'file_path' => $path,
                'original_filename' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);

            if ($validated['document_type'] === 'certificate') {
                $programApplication->certificate()->updateOrCreate([], [
                    'seeker_id' => $seeker->seeker_id,
                    'title' => $programApplication->program->program_name.' Completion Certificate',
                    'issuing_body' => 'Urdaneta City PESO',
                    'file_path' => $path,
                    'original_filename' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'issued_at' => today(),
                ]);
            }

            return $document;
        });

        return response()->json([
            'message' => 'Document uploaded securely.',
            'document' => [
                'document_id' => $document->document_id,
                'document_type' => $document->document_type,
                'document_name' => $document->document_name,
                'original_filename' => $document->original_filename,
                'mime_type' => $document->mime_type,
                'size' => $document->size,
            ],
        ], 201);
    }

    public function document(
        Request $request,
        ProgramApplication $programApplication,
        GovernmentProgramApplicationDocument $document,
    ): StreamedResponse {
        $seeker = $this->seeker($request);
        abort_unless($programApplication->seeker_id === $seeker->seeker_id, 404);
        abort_unless($document->application_id === $programApplication->prog_apply_id, 404);
        abort_unless(Storage::disk('local')->exists($document->file_path), 404);

        return Storage::disk('local')->response($document->file_path, $document->original_filename, [
            'Content-Type' => $document->mime_type,
            'Content-Disposition' => 'inline; filename="'.$document->original_filename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    private function seeker(Request $request): JobSeeker
    {
        abort_unless($request->user() instanceof JobSeeker, 403, 'Job seeker account required.');

        return $request->user();
    }
}
