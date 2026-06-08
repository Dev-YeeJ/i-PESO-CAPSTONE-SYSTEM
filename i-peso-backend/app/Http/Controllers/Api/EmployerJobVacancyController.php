<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\JobVacancy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployerJobVacancyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $employer = $this->employer($request);
        $vacancies = $employer->vacancies()
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($vacancies);
    }

    public function store(Request $request): JsonResponse
    {
        $employer = $this->employer($request);
        $vacancy = $employer->vacancies()->create($this->validatedData($request));

        return response()->json([
            'message' => 'Job vacancy created successfully.',
            'vacancy' => $vacancy,
        ], 201);
    }

    public function show(Request $request, JobVacancy $vacancy): JsonResponse
    {
        $this->ensureOwnership($request, $vacancy);

        return response()->json($vacancy);
    }

    public function update(Request $request, JobVacancy $vacancy): JsonResponse
    {
        $this->ensureOwnership($request, $vacancy);
        $vacancy->update($this->validatedData($request));

        return response()->json([
            'message' => 'Job vacancy updated successfully.',
            'vacancy' => $vacancy->fresh(),
        ]);
    }

    public function destroy(Request $request, JobVacancy $vacancy): JsonResponse
    {
        $this->ensureOwnership($request, $vacancy);
        $vacancy->delete();

        return response()->json(['message' => 'Job vacancy deleted successfully.']);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'job_title' => ['required', 'string', 'max:255'],
            'employment_type' => ['required', 'string', 'max:50'],
            'location' => ['required', 'string', 'max:255'],
            'job_description' => ['required', 'string', 'max:10000'],
            'vacancies_count' => ['required', 'integer', 'min:1', 'max:10000'],
            'salary_min' => ['nullable', 'numeric', 'min:0'],
            'salary_max' => ['nullable', 'numeric', 'gte:salary_min'],
            'required_skills' => ['nullable', 'array'],
            'required_skills.*' => ['string', 'max:100'],
            'status' => ['required', Rule::in(['active', 'closed', 'draft'])],
        ]);
    }

    private function employer(Request $request): Employer
    {
        /** @var Employer $employer */
        $employer = $request->user();

        return $employer;
    }

    private function ensureOwnership(Request $request, JobVacancy $vacancy): void
    {
        abort_unless(
            $vacancy->employer_id === $this->employer($request)->employer_id,
            404
        );
    }
}
