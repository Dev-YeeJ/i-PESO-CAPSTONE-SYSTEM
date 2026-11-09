<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/** The signed-in staff member's own account. */
class AdminAccountController extends Controller
{
    /**
     * Sets a new password. Required on first sign-in (and after the system
     * administrator issues a new temporary password) before any other admin
     * page opens; also usable any time afterwards.
     */
    public function changePassword(Request $request): JsonResponse
    {
        /** @var Administrator $admin */
        $admin = $request->user();

        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::min(8)->numbers()->symbols()],
        ], [
            'password.different' => 'Choose a password different from your current one.',
        ]);

        if (! Hash::check($request->input('current_password'), $admin->password)) {
            throw ValidationException::withMessages([
                'current_password' => [$admin->must_change_password
                    ? 'The temporary password is incorrect.'
                    : 'Your current password is incorrect.'],
            ]);
        }

        $wasTemporary = (bool) $admin->must_change_password;

        $admin->forceFill([
            'password' => $request->input('password'),
            'must_change_password' => false,
            'temporary_password_expires_at' => null,
            'password_changed_at' => now(),
        ])->save();

        // Other browsers/devices still holding the old password's session are signed out.
        $currentTokenId = $admin->currentAccessToken()?->getKey();
        $admin->tokens()->when($currentTokenId, fn ($query) => $query->whereKeyNot($currentTokenId))->delete();

        ActivityLogger::logAs($admin, 'changed_password', $wasTemporary
            ? 'Replaced the temporary password and finished setting up the account.'
            : 'Changed account password.');

        return response()->json([
            'message' => 'Your password has been updated.',
            'must_change_password' => false,
        ]);
    }
}
