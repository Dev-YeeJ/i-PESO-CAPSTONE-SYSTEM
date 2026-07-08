<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobSeeker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    // ── PRIVATE HELPERS ──────────────────────────────────────────────────────

    /**
     * Search all three user tables for a given email address.
     *
     * @return array{model: JobSeeker|Employer|Administrator, role: string}|null
     */
    private function findUserByEmail(string $email): ?array
    {
        $seeker = JobSeeker::where('email', $email)->first();
        if ($seeker) {
            return ['model' => $seeker, 'role' => 'seeker'];
        }

        $employer = Employer::where('email', $email)->first();
        if ($employer) {
            return ['model' => $employer, 'role' => 'employer'];
        }

        $admin = Administrator::where('email', $email)->first();
        if ($admin) {
            return ['model' => $admin, 'role' => 'administrator'];
        }

        return null;
    }

    /**
     * Generate a 6-digit OTP, cache it under a verify-specific key,
     * and send it via the OtpMail mailable.
     */
    private function generateAndSendOtp(string $email): void
    {
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        Cache::put("ipeso_otp_{$email}", Hash::make($otp), now()->addMinutes(10));
        Mail::to($email)->send(new OtpMail($otp));
    }

    private function normalizeMobileNumber(mixed $value): string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);

        if (str_starts_with($digits, '639')) {
            $digits = '0'.substr($digits, 2);
        } elseif (str_starts_with($digits, '9')) {
            $digits = '0'.$digits;
        }

        return substr($digits, 0, 11);
    }

    /**
     * Build the consistent user payload shape returned in every auth response.
     */
    private function buildUserPayload(
        JobSeeker|Employer|Administrator $user,
        string $role
    ): array {
        $name = match ($role) {
            'seeker'        => trim("{$user->first_name} {$user->last_name}"),
            'employer'      => $user->company_name,
            'administrator' => trim("{$user->first_name} {$user->last_name}"),
        };

        $payload = [
            'id'                => $user->getKey(),
            'name'              => $name,
            'email'             => $user->email,
            'role'              => $role,
            'email_verified_at' => $user->email_verified_at,
        ];

        // Add seeker-specific fields
        if ($role === 'seeker' && $user instanceof JobSeeker) {
            $payload['profile_completed']    = $user->profile_completed;
            $payload['verification_status']  = $user->verification_status ?? ($user->is_verified ? 'verified' : 'pending');
            $payload['first_name']           = $user->first_name;
            $payload['last_name']            = $user->last_name;
            $payload['mobile_number']        = $user->mobile_number;
        }

        if ($role === 'employer' && $user instanceof Employer) {
            $payload['company_name']        = $user->company_name;
            $payload['tin']                 = $user->tin;
            $payload['industry']            = $user->industry;
            $payload['company_type']        = $user->company_type;
            $payload['mobile_number']       = $user->mobile_number;
            $payload['verification_status'] = $user->verification_status;
        }

        return $payload;
    }

    // ── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────

    /**
     * POST /api/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        $role = $request->input('role');
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email'))),
            'first_name' => Str::of((string) $request->input('first_name'))->squish()->toString(),
            'last_name' => Str::of((string) $request->input('last_name'))->squish()->toString(),
            'mobile_number' => $this->normalizeMobileNumber($request->input('mobile_number')),
        ]);

        $rules = [
            'role'  => ['required', 'in:seeker,employer'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('job_seekers', 'email'),
                Rule::unique('employers', 'email'),
                Rule::unique('administrators', 'email'),
            ],
            'password' => ['required', 'confirmed', Password::min(8)],
        ];

        if ($role === 'seeker') {
            $rules['first_name']    = ['required', 'string', 'min:2', 'max:100', "regex:/^[\pL\s.'-]+$/u"];
            $rules['last_name']     = ['required', 'string', 'min:2', 'max:100', "regex:/^[\pL\s.'-]+$/u"];
            $rules['mobile_number'] = ['required', 'regex:/^09\d{9}$/'];
        } else {
            $rules['company_type'] = ['required', Rule::in([
                'sole_proprietorship',
                'corporation_partnership',
                'local_recruitment_agency',
                'overseas_recruitment_agency',
            ])];
        }

        $validated = $request->validate($rules);

        if ($this->findUserByEmail($validated['email'])) {
            return response()->json([
                'message' => 'The email address has already been registered.',
                'errors'  => ['email' => ['The email address has already been registered.']],
            ], 422);
        }

        DB::transaction(function () use ($role, $validated) {
            if ($role === 'seeker') {
                JobSeeker::create([
                    'first_name'    => $validated['first_name'],
                    'last_name'     => $validated['last_name'],
                    'email'         => $validated['email'],
                    'password'      => Hash::make($validated['password']),
                    'mobile_number' => $validated['mobile_number'],
                ]);
            } else {
                Employer::create([
                    'email'               => $validated['email'],
                    'password'            => Hash::make($validated['password']),
                    'company_type'        => $validated['company_type'],
                    'verification_status' => 'pending',
                ]);
            }
        });

        $this->generateAndSendOtp($validated['email']);

        return response()->json([
            'message' => 'Registration successful. Please check your email for your verification code.',
            'email'   => $validated['email'],
        ], 201);
    }

    /**
     * POST /api/auth/verify-otp
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp'   => ['required', 'string', 'size:6'],
        ]);

        $email      = mb_strtolower(trim($request->input('email')));
        $submitted  = $request->input('otp');
        $cached     = Cache::get("ipeso_otp_{$email}");
        $attemptKey = "ipeso_otp_attempts_{$email}";

        if ((int) Cache::get($attemptKey, 0) >= 5) {
            return response()->json([
                'message' => 'Too many failed attempts. Request a new verification code.',
            ], 429);
        }

        if (! $cached || ! Hash::check($submitted, $cached)) {
            Cache::put($attemptKey, (int) Cache::get($attemptKey, 0) + 1, now()->addMinutes(10));

            return response()->json([
                'message' => 'The verification code is invalid or has expired.',
            ], 422);
        }

        $result = $this->findUserByEmail($email);

        if (! $result) {
            return response()->json(['message' => 'User account not found.'], 404);
        }

        ['model' => $user, 'role' => $role] = $result;

        $user->forceFill(['email_verified_at' => Carbon::now()])->save();

        Cache::forget("ipeso_otp_{$email}");
        Cache::forget($attemptKey);

        $token = $user->createToken('ipeso_access_token')->plainTextToken;

        return response()->json([
            'message' => 'Email verified successfully. Welcome to i-PESO!',
            'token'   => $token,
            'user'    => $this->buildUserPayload($user, $role),
        ], 200);
    }

    /**
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email    = $request->input('email');
        $password = $request->input('password');

        $result = $this->findUserByEmail($email);

        if (! $result) {
            \Log::warning("Login attempt: User not found for email {$email}");

            return response()->json([
                'message' => 'These credentials do not match our records.',
            ], 401);
        }

        $user = $result['model'];
        $role = $result['role'];

        if (! Hash::check($password, $user->password)) {
            \Log::warning("Login attempt: Password mismatch for email {$email}");

            return response()->json([
                'message' => 'These credentials do not match our records.',
            ], 401);
        }

        if (! $user->email_verified_at) {
            $this->generateAndSendOtp($email);

            return response()->json([
                'message'          => 'Your email is not verified. A new code has been sent to your inbox.',
                'email_unverified' => true,
                'email'            => $email,
            ], 403);
        }

        // Revoke previous tokens — one active session per user
        $user->tokens()->delete();

        $token = $user->createToken('ipeso_access_token')->plainTextToken;

        \Log::info("Login successful for user {$email} with role {$role}");

        return response()->json([
            'message' => 'Login successful.',
            'token'   => $token,
            'user'    => $this->buildUserPayload($user, $role),
        ], 200);
    }

    /**
     * POST /api/auth/resend-otp
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        $email = mb_strtolower(trim($request->input('email')));

        $result = $this->findUserByEmail($email);

        if (! $result) {
            return response()->json([
                'message' => 'If that email exists, a new code has been sent.',
            ], 200);
        }

        if ($result['model']->email_verified_at) {
            return response()->json([
                'message' => 'This email address is already verified.',
            ], 422);
        }

        $cooldownKey = "ipeso_otp_resend_{$email}";
        if (! Cache::add($cooldownKey, true, now()->addSeconds(60))) {
            return response()->json([
                'message' => 'Please wait before requesting another verification code.',
            ], 429);
        }

        $this->generateAndSendOtp($email);
        Cache::forget("ipeso_otp_attempts_{$email}");

        return response()->json([
            'message' => 'A new 6-digit verification code has been sent to your email.',
        ], 200);
    }

    /**
     * POST /api/auth/forgot-password
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $result = $this->findUserByEmail($request->input('email'));

        if (! $result) {
            return response()->json([
                'message' => 'If that email is registered, a reset code has been sent.',
            ], 200);
        }

        $email = $request->input('email');
        $otp   = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put("ipeso_reset_{$email}", $otp, now()->addMinutes(10));
        Mail::to($email)->send(new OtpMail($otp));

        return response()->json([
            'message' => 'A 6-digit reset code has been sent to your email.',
            'email'   => $email,
        ], 200);
    }

    /**
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'otp'      => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $email     = $request->input('email');
        $submitted = $request->input('otp');
        $cached    = Cache::get("ipeso_reset_{$email}");

        if (! $cached || $cached !== $submitted) {
            return response()->json([
                'message' => 'The reset code is invalid or has expired.',
            ], 422);
        }

        $result = $this->findUserByEmail($email);

        if (! $result) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        ['model' => $user] = $result;

        $user->forceFill([
            'password' => Hash::make($request->input('password')),
        ])->save();

        Cache::forget("ipeso_reset_{$email}");

        return response()->json([
            'message' => 'Password reset successfully. You can now log in.',
        ], 200);
    }

    /**
     * GET /api/auth/me  [auth:sanctum]
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $role = match (true) {
            $user instanceof JobSeeker     => 'seeker',
            $user instanceof Employer      => 'employer',
            $user instanceof Administrator => 'administrator',
            default                        => 'unknown',
        };

        return response()->json([
            'user' => $this->buildUserPayload($user, $role),
        ], 200);
    }

    /**
     * POST /api/auth/logout  [auth:sanctum]
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ], 200);
    }
}
