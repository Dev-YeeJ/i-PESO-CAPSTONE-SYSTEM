<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminRoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => AdminRole::query()->withCount('administrators')->orderBy('name')->get(),
            'available_modules' => AdminRole::MODULES,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $role = AdminRole::create($this->validatedData($request));

        return response()->json(['message' => 'Role created.', 'role' => $role], 201);
    }

    public function update(Request $request, AdminRole $role): JsonResponse
    {
        // System roles (Administrator/Staff) can't be renamed or deleted, but
        // their permissions must stay editable — that's how a PESO office
        // configures what its default "Staff" tier can see.
        $role->update([
            'permissions' => $this->validatedPermissions($request),
        ]);

        return response()->json(['message' => 'Role updated.', 'role' => $role->fresh()]);
    }

    public function destroy(AdminRole $role): JsonResponse
    {
        abort_if($role->is_system, 422, 'System roles cannot be deleted.');
        abort_if($role->administrators()->exists(), 422, 'Reassign staff off this role before deleting it.');

        $role->delete();

        return response()->json(['message' => 'Role deleted.']);
    }

    private function validatedData(Request $request): array
    {
        $name = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('admin_roles', 'name')],
        ])['name'];

        return [
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name).'-'.\Illuminate\Support\Str::random(6),
            'permissions' => $this->validatedPermissions($request),
            'is_system' => false,
        ];
    }

    private function validatedPermissions(Request $request): array
    {
        return $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => [Rule::in(array_keys(AdminRole::MODULES))],
        ])['permissions'];
    }
}
