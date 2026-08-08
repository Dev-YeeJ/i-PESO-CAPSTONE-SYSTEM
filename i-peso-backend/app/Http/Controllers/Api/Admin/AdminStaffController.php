<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminRole;
use App\Models\Administrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminStaffController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Administrator::query()
                ->with('adminRole:id,name,slug')
                ->orderBy('first_name')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', 'unique:administrators,email'],
            'mobile_number' => ['required', 'string', 'max:20'],
            'department' => ['nullable', 'string', 'max:100'],
            'admin_role_id' => ['required', 'integer', Rule::exists('admin_roles', 'id')],
        ]);

        $role = AdminRole::findOrFail($data['admin_role_id']);
        $temporaryPassword = Str::password(14);

        $staff = Administrator::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'mobile_number' => $data['mobile_number'],
            'department' => $data['department'] ?? null,
            'admin_role_id' => $role->id,
            'role' => $role->slug,
            'status' => 'active',
            'password' => Hash::make($temporaryPassword),
            'email_verified_at' => now(),
        ]);

        return response()->json([
            'message' => 'Staff account created.',
            'staff' => $staff->fresh('adminRole'),
            // Shown once — there is no email-invite flow yet, so the creating
            // admin is responsible for handing this to the new staff member.
            'temporary_password' => $temporaryPassword,
        ], 201);
    }

    public function update(Request $request, Administrator $staffMember): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'mobile_number' => ['sometimes', 'string', 'max:20'],
            'department' => ['nullable', 'string', 'max:100'],
            'admin_role_id' => ['sometimes', 'integer', Rule::exists('admin_roles', 'id')],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]);

        if (isset($data['admin_role_id'])) {
            $isSelf = $request->user()?->getKey() === $staffMember->getKey();
            $newRole = AdminRole::findOrFail($data['admin_role_id']);

            abort_if(
                $isSelf && $newRole->slug !== 'administrator',
                422,
                'You cannot remove your own administrator access.'
            );

            $data['role'] = $newRole->slug;
        }

        $staffMember->update($data);

        return response()->json(['message' => 'Staff account updated.', 'staff' => $staffMember->fresh('adminRole')]);
    }

    public function destroy(Request $request, Administrator $staffMember): JsonResponse
    {
        abort_if($request->user()?->getKey() === $staffMember->getKey(), 422, 'You cannot remove your own account.');

        $remainingAdministrators = Administrator::query()
            ->where('role', 'administrator')
            ->where('admin_id', '!=', $staffMember->admin_id)
            ->exists();

        abort_if(
            $staffMember->role === 'administrator' && ! $remainingAdministrators,
            422,
            'At least one Administrator account must remain.'
        );

        $staffMember->delete();

        return response()->json(['message' => 'Staff account removed.']);
    }
}
