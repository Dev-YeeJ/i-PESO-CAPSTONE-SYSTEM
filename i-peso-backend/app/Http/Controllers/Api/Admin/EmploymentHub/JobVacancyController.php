<?php

namespace App\Http\Controllers\Api\Admin\EmploymentHub;

use App\Http\Controllers\Controller;
use App\Models\JobVacancy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobVacancyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = JobVacancy::with(['employer.companyProfile', 'occupation']);

        // Search by job title or employer name
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('job_title', 'like', "%{$search}%")
                  ->orWhereHas('employer.companyProfile', function ($q) use ($search) {
                      $q->where('company_name', 'like', "%{$search}%")
                        ->orWhere('trade_name', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by status
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $vacancies = $query->latest()->paginate($request->integer('per_page', 15));

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
