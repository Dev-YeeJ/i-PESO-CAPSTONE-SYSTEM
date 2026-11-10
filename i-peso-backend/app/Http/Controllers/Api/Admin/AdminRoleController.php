<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminRole;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminRoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => AdminRole::query()
                ->withCount('administrators')
                ->orderBy('name')
                ->get()
                ->map(fn (AdminRole $role) => $this->formatRole($role)),
            'available_modules' => AdminRole::MODULES,
            'access_levels' => AdminRole::LEVELS,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $name = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('admin_roles', 'name')],
        ])['name'];

        $role = AdminRole::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'permissions' => $this->validatedPermissions($request),
            'is_system' => false,
        ]);

        ActivityLogger::log('created_role', sprintf(
            'Created role "%s" with access to: %s.',
            $role->name,
            $this->describe($role->permissions)
        ));

        return response()->json(['message' => 'Role created.', 'role' => $this->formatRole($role->loadCount('administrators'))], 201);
    }

    public function update(Request $request, AdminRole $role): JsonResponse
    {
        // System roles (System Administrator, Office Manager, Aide, Intern)
        // can't be renamed or deleted, but their permissions stay editable —
        // that's how the office adjusts what each position can open. The
        // System Administrator always keeps full access regardless.
        abort_if($role->slug === 'administrator', 422, 'The System Administrator always has full access.');

        $before = AdminRole::normalizePermissions($role->permissions);
        $after = $this->validatedPermissions($request);

        $role->update(['permissions' => $after]);

        if ($before != $after) {
            ActivityLogger::log('updated_role_permissions', sprintf(
                'Changed access for role "%s" from [%s] to [%s].',
                $role->name,
                $this->describe($before),
                $this->describe($after)
            ));
        }

        return response()->json(['message' => 'Role updated.', 'role' => $this->formatRole($role->fresh()->loadCount('administrators'))]);
    }

    public function destroy(AdminRole $role): JsonResponse
    {
        abort_if($role->is_system, 422, 'System roles cannot be deleted.');
        abort_if($role->administrators()->exists(), 422, 'Reassign staff off this role before deleting it.');

        $role->delete();

        ActivityLogger::log('deleted_role', sprintf('Deleted role "%s".', $role->name));

        return response()->json(['message' => 'Role deleted.']);
    }

    /**
     * Expects {"permissions": {"employment_hub": "view", "government_dole": "manage"}}.
     * Modules left out (or set to "none") get no access.
     */
    private function validatedPermissions(Request $request): array
    {
        $request->validate(['permissions' => ['present', 'array']]);

        $errors = [];
        foreach ($request->input('permissions') as $module => $level) {
            if (! is_string($module) || ! isset(AdminRole::MODULES[$module])) {
                $errors["permissions.{$module}"] = 'Unknown module.';
            } elseif ($level !== AdminRole::NONE && ! isset(AdminRole::LEVELS[$level])) {
                $errors["permissions.{$module}"] = 'Access must be none, view or manage.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return AdminRole::normalizePermissions($request->input('permissions'));
    }

    private function formatRole(AdminRole $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'is_system' => $role->is_system,
            'access' => $role->accessMap(),
            'administrators_count' => $role->administrators_count ?? null,
        ];
    }

    private function describe(?array $permissions): string
    {
        $parts = [];
        foreach (AdminRole::normalizePermissions($permissions) as $module => $level) {
            $parts[] = AdminRole::MODULES[$module].' ('.strtolower(AdminRole::LEVELS[$level]).')';
        }

        return $parts === [] ? 'no modules' : implode(', ', $parts);
    }
}
