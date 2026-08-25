<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobSeeker;
use App\Models\PushToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeekerPushTokenController extends Controller
{
    /** Register (or refresh ownership of) this device's Expo push token. */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker, 403, 'Seeker account required.');

        $validated = $request->validate([
            'token' => ['required', 'string', 'max:255'],
            'platform' => ['nullable', 'string', 'in:ios,android'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        // A token belongs to one physical device, not one account — if it
        // was previously registered under a different seeker (device
        // reassigned, shared device, account switch), reattach it here
        // instead of leaving a stale row pointing at the old owner.
        PushToken::updateOrCreate(
            ['token' => $validated['token']],
            [
                'tokenable_type' => JobSeeker::class,
                'tokenable_id' => $user->seeker_id,
                'platform' => $validated['platform'] ?? null,
                'device_name' => $validated['device_name'] ?? null,
                'last_used_at' => now(),
            ],
        );

        return response()->json(['message' => 'Push token registered.']);
    }

    /** Unregister this device's token, e.g. on logout, so it stops receiving pushes. */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker, 403, 'Seeker account required.');

        $validated = $request->validate([
            'token' => ['required', 'string', 'max:255'],
        ]);

        $user->pushTokens()->where('token', $validated['token'])->delete();

        return response()->json(['message' => 'Push token removed.']);
    }
}
