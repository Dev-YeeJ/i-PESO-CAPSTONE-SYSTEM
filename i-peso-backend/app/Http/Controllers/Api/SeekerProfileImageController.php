<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SeekerProfileImageController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $seeker = $this->seeker($request);
        $request->validate([
            'profile_image' => [
                'required',
                File::image()
                    ->types(['jpg', 'jpeg', 'png'])
                    ->max(2 * 1024)
                    ->dimensions(
                        Rule::dimensions()
                            ->minWidth(300)
                            ->minHeight(300)
                            ->ratio(1)
                    ),
            ],
        ], [
            'profile_image.dimensions' => 'The 2x2 photo must be square and at least 300 by 300 pixels.',
        ]);

        $this->deleteExistingImage($seeker);

        $file = $request->file('profile_image');
        $path = $file->storeAs(
            "seeker_profile_images/{$seeker->getKey()}",
            'profile.'.$file->extension(),
            'local'
        );

        $seeker->forceFill([
            'profile_image' => $path,
            'resume_path' => null,
        ])->save();

        return response()->json([
            'message' => 'Your 2x2 profile photo was uploaded successfully.',
            'profile_image_url' => '/api/seeker/profile-image',
        ]);
    }

    public function show(Request $request): StreamedResponse
    {
        $seeker = $this->seeker($request);
        abort_unless(filled($seeker->profile_image), 404, 'Profile photo not found.');

        $disk = Storage::disk('local')->exists($seeker->profile_image) ? 'local' : 'public';
        abort_unless(Storage::disk($disk)->exists($seeker->profile_image), 404, 'Profile photo not found.');

        return Storage::disk($disk)->response($seeker->profile_image, 'profile-photo', [
            'Content-Disposition' => 'inline',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $seeker = $this->seeker($request);
        $this->deleteExistingImage($seeker);
        $seeker->forceFill(['profile_image' => null, 'resume_path' => null])->save();

        return response()->json(['message' => 'Profile photo removed.']);
    }

    private function seeker(Request $request): JobSeeker
    {
        abort_unless($request->user() instanceof JobSeeker, 403, 'Job seeker account required.');

        return $request->user();
    }

    private function deleteExistingImage(JobSeeker $seeker): void
    {
        if (! filled($seeker->profile_image)) {
            return;
        }

        Storage::disk('local')->delete($seeker->profile_image);
        Storage::disk('public')->delete($seeker->profile_image);
    }
}
