<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\StaffAccountMail;
use App\Models\AdminRole;
use App\Models\Administrator;
use App\Services\ActivityLogger;
use App\Support\StaffPositions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminStaffController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Administrator::query()
                ->with('adminRole')
                ->orderBy('first_name')
                ->get()
                ->map(fn (Administrator $staff) => $this->formatStaff($staff)),
            'positions' => StaffPositions::options(),
        ]);
    }

    /** Positions in chart order with the people in each, for the Org Chart page. */
    public function orgChart(): JsonResponse
    {
        $staff = Administrator::query()
            ->with('adminRole')
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get();

        $byPosition = $staff->groupBy(fn (Administrator $member) => $member->position ?: 'unassigned');
        $format = fn ($members) => collect($members)
            ->map(fn (Administrator $member) => $this->formatStaff($member))
            ->values();

        return response()->json([
            'positions' => array_map(
                fn (array $position) => $position + ['members' => $format($byPosition[$position['value']] ?? [])],
                StaffPositions::options()
            ),
            'unassigned' => $format($byPosition['unassigned'] ?? []),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'max:20'],
            // Sign-in checks seekers and employers first, so an email already
            // used there could never sign in as staff.
            'email' => [
                'required', 'email', 'max:255',
                Rule::unique('administrators', 'email'),
                Rule::unique('job_seekers', 'email'),
                Rule::unique('employers', 'email'),
            ],
            'mobile_number' => ['required', 'string', 'max:20'],
            'position' => ['required', Rule::in(StaffPositions::keys())],
            ...$this->internshipRules($request->input('position') === StaffPositions::OJT_INTERN),
        ], [
            'email.unique' => 'This email is already used by another account.',
            ...self::INTERNSHIP_MESSAGES,
        ]);

        // The position decides what someone can open (its role on the Roles page).
        $role = $this->roleFor($data['position']);

        $staff = Administrator::create(array_merge(
            $data,
            [
                'admin_role_id' => $role->id,
                'role' => $role->slug,
                'status' => 'active',
                // Replaced right away by the emailed temporary password.
                'password' => Str::random(40),
                'email_verified_at' => now(),
                'invited_at' => now(),
            ]
        ));

        $temporaryPassword = $staff->issueTemporaryPassword();
        $emailSent = $this->sendAccountEmail($staff, $temporaryPassword, StaffAccountMail::INVITE);

        ActivityLogger::log('created_staff', sprintf(
            'Created staff account %s (%s) as %s.%s',
            $this->displayName($staff),
            $staff->email,
            StaffPositions::label($staff->position),
            $emailSent ? ' Sign-in details emailed.' : ' The email could not be sent.'
        ));

        return response()->json($this->passwordResponse(
            $emailSent
                ? "Staff account created. Sign-in details were sent to {$staff->email}."
                : 'Staff account created, but the email could not be sent. Give them the temporary password below.',
            $staff,
            $emailSent,
            $temporaryPassword
        ), 201);
    }

    /**
     * Emails a new temporary password: a fresh invite if they never finished
     * setting up, otherwise a password reset that also signs them out.
     */
    public function sendPassword(Request $request, Administrator $staffMember): JsonResponse
    {
        abort_if($this->isSelf($request, $staffMember), 422, 'Use Change password to update your own password.');
        abort_unless($staffMember->isActive(), 422, 'Reactivate this account before sending a new password.');

        $isInvite = $staffMember->password_changed_at === null;

        $temporaryPassword = $staffMember->issueTemporaryPassword();
        if ($isInvite) {
            $staffMember->forceFill(['invited_at' => now()])->save();
        }
        $staffMember->tokens()->delete();

        $emailSent = $this->sendAccountEmail(
            $staffMember,
            $temporaryPassword,
            $isInvite ? StaffAccountMail::INVITE : StaffAccountMail::RESET
        );

        ActivityLogger::log($isInvite ? 'resent_staff_invite' : 'reset_staff_password', sprintf(
            '%s for %s (%s).%s',
            $isInvite ? 'Resent the account invite' : 'Issued a new temporary password',
            $this->displayName($staffMember),
            $staffMember->email,
            $emailSent ? '' : ' The email could not be sent.'
        ));

        return response()->json($this->passwordResponse(
            $emailSent
                ? "A new temporary password was sent to {$staffMember->email}."
                : 'A new temporary password was made, but the email could not be sent. Give them the password below.',
            $staffMember,
            $emailSent,
            $temporaryPassword
        ));
    }

    public function update(Request $request, Administrator $staffMember): JsonResponse
    {
        // Status changes go through deactivate()/reactivate(), which also
        // sign the account out and apply the last-administrator rule.
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'mobile_number' => ['sometimes', 'string', 'max:20'],
            'position' => ['sometimes', Rule::in(StaffPositions::keys())],
            ...$this->internshipRules(false),
        ], self::INTERNSHIP_MESSAGES);

        $becomesIntern = ($data['position'] ?? $staffMember->position) === StaffPositions::OJT_INTERN;
        if ($becomesIntern) {
            $this->ensureInternshipDetails($staffMember, $data);
        }

        $before = $this->comparable($staffMember, array_keys($data));

        // A new position brings that position's access with it.
        if (isset($data['position']) && $data['position'] !== $staffMember->position) {
            abort_if($this->isSelf($request, $staffMember), 422, 'You cannot change your own position.');

            $newRole = $this->roleFor($data['position']);

            if ($newRole->slug !== 'administrator') {
                $this->ensureAnotherActiveAdministrator($staffMember, 'Assign another active system administrator before changing this position.');
            }

            $data['admin_role_id'] = $newRole->id;
            $data['role'] = $newRole->slug;
        }

        $staffMember->update($data);

        $changed = array_keys(array_diff_assoc($this->comparable($staffMember, array_keys($before)), $before));

        if ($changed !== []) {
            ActivityLogger::log('updated_staff', sprintf(
                'Updated staff account %s (%s): %s.',
                $this->displayName($staffMember),
                $staffMember->email,
                implode(', ', array_map(fn ($field) => str_replace(['ojt_', '_'], ['internship ', ' '], $field), $changed))
            ));
        }

        return response()->json([
            'message' => 'Staff account updated.',
            'staff' => $this->formatStaff($staffMember->fresh('adminRole')),
        ]);
    }

    public function deactivate(Request $request, Administrator $staffMember): JsonResponse
    {
        abort_if($this->isSelf($request, $staffMember), 422, 'You cannot deactivate your own account.');

        if (! $staffMember->isActive()) {
            return response()->json(['message' => 'This account is already deactivated.', 'staff' => $this->formatStaff($staffMember->fresh('adminRole'))]);
        }

        $this->ensureAnotherActiveAdministrator($staffMember, 'At least one active system administrator must remain.');

        $staffMember->forceFill(['status' => 'inactive', 'deactivated_reason' => 'deactivated'])->save();

        // Signs them out on every browser and device right away.
        $staffMember->tokens()->delete();

        ActivityLogger::log('deactivated_staff', sprintf(
            'Deactivated staff account %s (%s).',
            $this->displayName($staffMember),
            $staffMember->email
        ));

        return response()->json(['message' => 'Staff account deactivated.', 'staff' => $this->formatStaff($staffMember->fresh('adminRole'))]);
    }

    public function reactivate(Administrator $staffMember): JsonResponse
    {
        if ($staffMember->isActive()) {
            return response()->json(['message' => 'This account is already active.', 'staff' => $this->formatStaff($staffMember->fresh('adminRole'))]);
        }

        abort_if(
            $staffMember->isIntern() && $staffMember->ojt_end_date && $staffMember->ojt_end_date->toDateString() < \App\Models\OjtTimeLog::today(),
            422,
            'This internship has already ended. Edit the internship end date first, then reactivate.'
        );

        $staffMember->forceFill(['status' => 'active', 'deactivated_reason' => null])->save();

        ActivityLogger::log('reactivated_staff', sprintf(
            'Reactivated staff account %s (%s).',
            $this->displayName($staffMember),
            $staffMember->email
        ));

        return response()->json(['message' => 'Staff account reactivated.', 'staff' => $this->formatStaff($staffMember->fresh('adminRole'))]);
    }

    private function sendAccountEmail(Administrator $staff, string $temporaryPassword, string $kind): bool
    {
        try {
            Mail::to($staff->email)->send(new StaffAccountMail(
                recipientName: $staff->first_name,
                positionLabel: StaffPositions::label($staff->position),
                email: $staff->email,
                temporaryPassword: $temporaryPassword,
                expiresAt: $staff->temporary_password_expires_at,
                kind: $kind,
            ));

            return true;
        } catch (\Throwable $exception) {
            report($exception);

            return false;
        }
    }

    /**
     * The temporary password is only returned when the email failed —
     * otherwise it lives solely in the staff member's inbox.
     */
    private function passwordResponse(string $message, Administrator $staff, bool $emailSent, string $temporaryPassword): array
    {
        return array_filter([
            'message' => $message,
            'staff' => $this->formatStaff($staff->fresh('adminRole')),
            'email_sent' => $emailSent,
            'temporary_password' => $emailSent ? null : $temporaryPassword,
        ], fn ($value) => $value !== null);
    }

    private function roleFor(string $position): AdminRole
    {
        return AdminRole::where('slug', StaffPositions::defaultRoleSlug($position))->firstOrFail();
    }

    private function isSelf(Request $request, Administrator $staffMember): bool
    {
        return $request->user()?->getKey() === $staffMember->getKey();
    }

    /** Keeps the office from locking itself out of staff management. */
    private function ensureAnotherActiveAdministrator(Administrator $staffMember, string $message): void
    {
        if (! $staffMember->isSystemAdministrator() || ! $staffMember->isActive()) {
            return;
        }

        $othersRemain = Administrator::query()
            ->where('role', 'administrator')
            ->where('status', 'active')
            ->where('admin_id', '!=', $staffMember->admin_id)
            ->exists();

        abort_unless($othersRemain, 422, $message);
    }

    private const INTERNSHIP_MESSAGES = [
        'ojt_school.required' => 'Enter the intern\'s school.',
        'ojt_required_hours.required' => 'Enter the required OJT hours.',
        'ojt_start_date.required' => 'Enter the internship start date.',
        'ojt_end_date.required' => 'Enter the internship end date.',
        'ojt_end_date.after_or_equal' => 'The end date must be on or after the start date.',
    ];

    /** School, required hours and dates: required when adding an intern. */
    private function internshipRules(bool $required): array
    {
        $presence = $required ? 'required' : 'nullable';

        return [
            'ojt_school' => [$presence, 'string', 'max:150'],
            'ojt_course' => ['nullable', 'string', 'max:150'],
            'ojt_required_hours' => [$presence, 'integer', 'min:1', 'max:2000'],
            'ojt_start_date' => [$presence, 'date'],
            'ojt_end_date' => [$presence, 'date', 'after_or_equal:ojt_start_date'],
        ];
    }

    /** Someone moved into the intern position needs the same details a new intern does. */
    private function ensureInternshipDetails(Administrator $staff, array $data): void
    {
        $missing = [];
        foreach (['ojt_school' => 'school', 'ojt_required_hours' => 'required OJT hours', 'ojt_start_date' => 'start date', 'ojt_end_date' => 'end date'] as $field => $label) {
            if (blank($data[$field] ?? $staff->{$field})) {
                $missing[$field] = "Enter the internship {$label}.";
            }
        }

        if ($missing !== []) {
            throw \Illuminate\Validation\ValidationException::withMessages($missing);
        }
    }

    /** Field values as plain strings, so dates and numbers compare cleanly. */
    private function comparable(Administrator $staff, array $fields): array
    {
        return array_map(
            fn ($value) => $value instanceof \DateTimeInterface ? $value->format('Y-m-d') : (string) $value,
            $staff->only($fields)
        );
    }

    private function formatStaff(Administrator $staff): array
    {
        return [
            'id' => $staff->admin_id,
            'first_name' => $staff->first_name,
            'middle_name' => $staff->middle_name,
            'last_name' => $staff->last_name,
            'suffix' => $staff->suffix,
            'name' => $this->displayName($staff),
            'email' => $staff->email,
            'mobile_number' => $staff->mobile_number,
            'position' => $staff->position,
            'position_label' => StaffPositions::label($staff->position),
            'status' => $staff->status,
            'account_status' => $this->accountStatus($staff),
            'invited_at' => $staff->invited_at,
            'temporary_password_expires_at' => $staff->must_change_password ? $staff->temporary_password_expires_at : null,
            'last_login_at' => $staff->last_login_at,
            'is_system_administrator' => $staff->isSystemAdministrator(),
            'role' => $staff->adminRole?->only(['id', 'name', 'slug']),
            'access' => $staff->accessMap(),
            'internship' => $staff->isIntern() ? [
                'school' => $staff->ojt_school,
                'course' => $staff->ojt_course,
                'required_hours' => $staff->ojt_required_hours,
                'start_date' => $staff->ojt_start_date?->toDateString(),
                'end_date' => $staff->ojt_end_date?->toDateString(),
            ] : null,
            'created_at' => $staff->created_at,
        ];
    }

    /** deactivated, invite_expired, invited (hasn't set a password yet) or active. */
    private function accountStatus(Administrator $staff): string
    {
        return match (true) {
            $staff->internshipEnded() => 'internship_ended',
            ! $staff->isActive() => 'deactivated',
            $staff->temporaryPasswordExpired() => 'invite_expired',
            (bool) $staff->must_change_password => 'invited',
            default => 'active',
        };
    }

    private function displayName(Administrator $staffMember): string
    {
        return trim(implode(' ', array_filter([
            $staffMember->first_name,
            $staffMember->middle_name ? mb_substr($staffMember->middle_name, 0, 1).'.' : null,
            $staffMember->last_name,
            $staffMember->suffix,
        ])));
    }
}
