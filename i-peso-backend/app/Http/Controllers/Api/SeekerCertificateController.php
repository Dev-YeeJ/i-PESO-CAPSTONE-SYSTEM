<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use App\Models\SeekerCertificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SeekerCertificateController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $seeker = $this->seeker($request);
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'issuing_body' => ['required', 'string', 'max:255'],
            'issued_at' => ['nullable', 'date', 'before_or_equal:today'],
            'certificate_file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $file = $request->file('certificate_file');
        $path = $file->store("seeker_certificates/{$seeker->getKey()}", 'local');

        $certificate = $seeker->certificates()->create([
            'title' => $validated['title'],
            'issuing_body' => $validated['issuing_body'],
            'issued_at' => $validated['issued_at'] ?? null,
            'file_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);

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
            'issued_at' => $certificate->issued_at?->format('Y-m-d'),
            'original_filename' => $certificate->original_filename,
            'mime_type' => $certificate->mime_type,
            'file_size' => $certificate->file_size,
            'created_at' => $certificate->created_at,
        ];
    }
}
