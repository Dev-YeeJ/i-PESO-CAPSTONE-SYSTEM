<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use App\Models\SeekerCertificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class SeekerCertificateController extends Controller
{
    private const CATEGORIES = [
        'training_certificate',
        'tesda_nc_certificate',
        'professional_certificate',
        'seminar_certificate',
        'workshop_certificate',
        'employment_certificate',
        'academic_certificate',
        'first_time_jobseeker_certificate',
        'other',
    ];

    public function store(Request $request): JsonResponse
    {
        $seeker = $this->seeker($request);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'issuing_body' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', Rule::in(self::CATEGORIES)],
            'issued_at' => ['required', 'date', 'before_or_equal:today'],
            'expires_at' => ['nullable', 'date', 'after:issued_at'],
            'credential_number' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'training_id' => [
                'nullable',
                'integer',
                Rule::exists('seeker_trainings', 'id')
                    ->where(fn ($query) => $query->where('seeker_id', $seeker->getKey())),
            ],
            'certificate_file' => ['required', File::types(['pdf', 'jpg', 'jpeg', 'png'])->max(5 * 1024)],
        ]);

        $file = $request->file('certificate_file');
        $path = $file->store("seeker_certificates/{$seeker->getKey()}", 'local');
        if (! is_string($path) || $path === '') {
            throw ValidationException::withMessages([
                'certificate_file' => 'The proof file could not be stored. Please try again.',
            ]);
        }

        try {
            $certificate = DB::transaction(fn () => $seeker->certificates()->create([
                'title' => Str::squish($validated['title']),
                'issuing_body' => Str::squish($validated['issuing_body']),
                'category' => $validated['category'],
                'issued_at' => $validated['issued_at'],
                'expires_at' => $validated['expires_at'] ?? null,
                'credential_number' => filled($validated['credential_number'] ?? null)
                    ? Str::squish($validated['credential_number'])
                    : null,
                'description' => filled($validated['description'] ?? null)
                    ? Str::squish($validated['description'])
                    : null,
                'training_id' => $validated['training_id'] ?? null,
                'file_path' => $path,
                'original_filename' => $this->safeOriginalFilename($file->getClientOriginalName()),
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]));
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);

            throw $exception;
        }

        $certificate->load('training');

        return response()->json([
            'message' => 'Certificate uploaded successfully.',
            'certificate' => $this->payload($certificate),
        ], 201);
    }

    public function view(Request $request, SeekerCertificate $certificate): StreamedResponse
    {
        $this->authorizeOwner($request, $certificate);
        abort_unless(Storage::disk('local')->exists($certificate->file_path), 404, 'Certificate file not found.');

        return Storage::disk('local')->response(
            $certificate->file_path,
            $certificate->original_filename,
            [
                'Content-Type' => $certificate->mime_type,
                'Content-Disposition' => 'inline; filename="'.$certificate->original_filename.'"',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
            ]
        );
    }

    public function destroy(Request $request, SeekerCertificate $certificate): JsonResponse
    {
        $this->authorizeOwner($request, $certificate);
        Storage::disk('local')->delete($certificate->file_path);
        $certificate->delete();

        return response()->json(['message' => 'Certificate deleted.']);
    }

    private function seeker(Request $request): JobSeeker
    {
        abort_unless($request->user() instanceof JobSeeker, 403, 'Job seeker account required.');

        return $request->user();
    }

    private function authorizeOwner(Request $request, SeekerCertificate $certificate): void
    {
        $seeker = $this->seeker($request);
        abort_unless($certificate->seeker_id === $seeker->getKey(), 404);
    }

    private function payload(SeekerCertificate $certificate): array
    {
        return [
            'certificate_id' => $certificate->certificate_id,
            'title' => $certificate->title,
            'issuing_body' => $certificate->issuing_body,
            'category' => $certificate->category,
            'issued_at' => $certificate->issued_at ? Carbon::parse($certificate->issued_at)->toDateString() : null,
            'expires_at' => $certificate->expires_at ? Carbon::parse($certificate->expires_at)->toDateString() : null,
            'credential_number' => $certificate->credential_number,
            'description' => $certificate->description,
            'training_id' => $certificate->training_id,
            'training' => $certificate->training ? [
                'id' => $certificate->training->getKey(),
                'course' => $certificate->training->course,
                'training_institution' => $certificate->training->training_institution,
            ] : null,
            'original_filename' => $certificate->original_filename,
            'mime_type' => $certificate->mime_type,
            'file_size' => $certificate->file_size,
            'created_at' => $certificate->created_at,
        ];
    }

    private function safeOriginalFilename(string $filename): string
    {
        $basename = basename(str_replace('\\', '/', $filename));

        return Str::limit($basename !== '' ? $basename : 'certificate-file', 255, '');
    }
}
