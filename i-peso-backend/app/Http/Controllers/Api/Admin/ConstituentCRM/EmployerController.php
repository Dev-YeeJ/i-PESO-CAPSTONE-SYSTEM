<?php
// i-peso-backend/app/Http/Controllers/Api/Admin/ConstituentCRM/EmployerController.php

namespace App\Http\Controllers\Api\Admin\ConstituentCRM;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Employer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Employer::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('company_name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
            });
        }

        $employers = $query->paginate($request->get('per_page', 15));

        return response()->json($employers);
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();
        
        if (!$admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $employer = Employer::with('vacancies')->findOrFail($id);
        $employer->vacancies_count = $employer->vacancies->count();

        return response()->json($employer);
    }
}
