<?php

namespace App\Http\Controllers\Api\Admin\EmploymentHub;

use App\Http\Controllers\Controller;
use App\Models\JobVacancy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class JobVacancyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'closed', 'draft'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = JobVacancy::with(['employer.companyProfile', 'occupation']);

        // Search by job title or employer name
        if ($search = $filters['search'] ?? null) {
            $query->where(function ($q) use ($search) {
                $q->where('job_title', 'like', "%{$search}%")
                  ->orWhereHas('employer.companyProfile', function ($q) use ($search) {
                      $q->where('company_name', 'like', "%{$search}%")
                        ->orWhere('trade_name', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by status
        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        $vacancies = $query->latest()->paginate($filters['per_page'] ?? 15);

        return response()->json($vacancies);
    }

    /**
     * Display the specified resource.
     */
    public function show(JobVacancy $vacancy): JsonResponse
    {
        $vacancy->load([
            'employer.companyProfile',
            'employer.user',
            'occupation',
            'skillRequirements.skill',
            'certificationRequirements'
        ]);

        return response()->json($vacancy);
    }
}
