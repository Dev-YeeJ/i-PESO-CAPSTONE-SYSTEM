<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmployerSkillDemand;
use App\Notifications\EmployerSkillDemandNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminEmployerSkillDemandController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $demands = EmployerSkillDemand::query()
            ->with([
                'employer:employer_id,company_name,industry,email,mobile_number',
                'vacancy:post_id,job_title',
                'occupation:id,title',
                'linkedProgram:program_id,program_name',
            ])
            ->when($request->string('status')->toString(), fn ($query, $status) => $query->where('status', $status))
            ->when($request->string('search')->toString(), function ($query, $search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('skill_name', 'like', "%{$search}%")
                        ->orWhereHas('employer', fn ($employers) => $employers->where('company_name', 'like', "%{$search}%"));
                });
            })
            ->latest('demand_id')
            ->paginate($request->integer('per_page', 20));

        return response()->json($demands);
    }

    public function updateStatus(Request $request, EmployerSkillDemand $employerSkillDemand): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['submitted', 'reviewed', 'linked_to_program', 'resolved', 'archived'])],
            'admin_remarks' => ['nullable', 'string', 'max:3000'],
            'linked_program_id' => [
                'nullable',
                'integer',
                'exists:government_programs,program_id',
                'required_if:status,linked_to_program',
            ],
        ]);

        $employerSkillDemand->update([
            ...$validated,
            'reviewed_by_admin_id' => $request->user()->getKey(),
            'reviewed_at' => now(),
        ]);
        $employerSkillDemand->load('employer', 'linkedProgram');
        $employerSkillDemand->employer->notify(new EmployerSkillDemandNotification(
            $employerSkillDemand,
            'status_changed',
        ));

        return response()->json([
            'message' => 'Employer skill demand updated.',
            'demand' => $employerSkillDemand,
        ]);
    }
}
