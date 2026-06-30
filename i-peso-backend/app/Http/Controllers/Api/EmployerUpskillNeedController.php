<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Employer;
use App\Models\EmployerSkillDemand;
use App\Models\Skill;
use App\Notifications\EmployerSkillDemandNotification;
use App\Services\SkillTaxonomyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmployerUpskillNeedController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $demands = $this->employer($request)->skillDemands()
            ->with(['vacancy:post_id,job_title', 'occupation:id,title', 'linkedProgram:program_id,program_name'])
            ->latest('demand_id')
            ->paginate($request->integer('per_page', 20));

        return response()->json($demands);
    }

    public function store(Request $request, SkillTaxonomyService $taxonomy): JsonResponse
    {
        $employer = $this->employer($request);
        $data = $this->validatedData($request, $employer);
        $skill = $this->resolveSkill($data, $taxonomy);
        $data['skill_id'] = $skill?->id;
        $data['skill_name'] = $skill?->name ?? Str::squish($data['skill_name']);
        $data['status'] = 'submitted';

        $demand = $employer->skillDemands()->create($data)->load('employer', 'vacancy', 'occupation');
        Administrator::query()->where('status', 'active')->get()->each(
            fn (Administrator $admin) => $admin->notify(new EmployerSkillDemandNotification($demand, 'submitted'))
        );

        return response()->json(['message' => 'Skill demand submitted to PESO.', 'demand' => $demand], 201);
    }

    public function update(
        Request $request,
        EmployerSkillDemand $employerSkillDemand,
        SkillTaxonomyService $taxonomy,
    ): JsonResponse {
        $employer = $this->employer($request);
        $this->ensureOwnership($employer, $employerSkillDemand);
        abort_if(in_array($employerSkillDemand->status, ['resolved', 'archived'], true), 422, 'Resolved or archived demands cannot be edited.');
        $data = $this->validatedData($request, $employer, true);

        if (isset($data['skill_name']) || isset($data['skill_id'])) {
            $skill = $this->resolveSkill($data, $taxonomy);
            $data['skill_id'] = $skill?->id;
            $data['skill_name'] = $skill?->name ?? Str::squish($data['skill_name'] ?? $employerSkillDemand->skill_name);
        }
        $data['status'] = 'submitted';
        $data['reviewed_by_admin_id'] = null;
        $data['reviewed_at'] = null;
        $employerSkillDemand->update($data);

        return response()->json(['message' => 'Skill demand updated.', 'demand' => $employerSkillDemand->fresh(['vacancy', 'occupation'])]);
    }

    public function destroy(Request $request, EmployerSkillDemand $employerSkillDemand): JsonResponse
    {
        $this->ensureOwnership($this->employer($request), $employerSkillDemand);
        $employerSkillDemand->delete();

        return response()->json(['message' => 'Skill demand removed.']);
    }

    private function validatedData(Request $request, Employer $employer, bool $partial = false): array
    {
        return $request->validate([
            'skill_id' => ['nullable', 'integer', 'exists:skill_catalog_entries,id'],
            'skill_name' => [$partial ? 'sometimes' : 'required_without:skill_id', 'string', 'max:150'],
            'job_vacancy_id' => [
                'nullable',
                'integer',
                Rule::exists('job_vacancies', 'post_id')->where('employer_id', $employer->employer_id),
            ],
            'occupation_id' => ['nullable', 'integer', 'exists:occupations,id'],
            'workers_needed' => [$partial ? 'sometimes' : 'required', 'integer', 'min:1', 'max:100000'],
            'reason' => [$partial ? 'sometimes' : 'required', 'string', 'max:5000'],
            'preferred_training_timeline' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string', 'max:3000'],
        ]);
    }

    private function resolveSkill(array $data, SkillTaxonomyService $taxonomy): ?Skill
    {
        if (! empty($data['skill_id'])) {
            return Skill::find($data['skill_id']);
        }

        return filled($data['skill_name'] ?? null)
            ? $taxonomy->resolve($data['skill_name'], 'technical')
            : null;
    }

    private function employer(Request $request): Employer
    {
        abort_unless($request->user() instanceof Employer, 403, 'Employer account required.');

        return $request->user();
    }

    private function ensureOwnership(Employer $employer, EmployerSkillDemand $demand): void
    {
        abort_unless($demand->employer_id === $employer->employer_id, 404);
    }
}
