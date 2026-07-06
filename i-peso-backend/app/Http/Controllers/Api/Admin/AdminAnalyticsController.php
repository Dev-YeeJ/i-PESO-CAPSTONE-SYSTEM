<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Services\AdminAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAnalyticsController extends Controller
{
    public function index(Request $request, AdminAnalyticsService $analytics): JsonResponse
    {
        $this->authorizeAdmin();

        return response()->json($analytics->snapshot($this->filters($request)));
    }

    public function options(AdminAnalyticsService $analytics): JsonResponse
    {
        $this->authorizeAdmin();

        return response()->json($analytics->options());
    }

    private function filters(Request $request): array
    {
        return $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'period' => ['nullable', 'in:monthly,yearly'],
            'province' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:150'],
            'barangay' => ['nullable', 'string', 'max:150'],
            'broad_field' => ['nullable', 'string', 'max:255'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'skill' => ['nullable', 'string', 'max:150'],
            'employer_verification_status' => ['nullable', 'in:pending,verified,rejected'],
            'vacancy_status' => ['nullable', 'in:active,closed,draft'],
            'application_status' => ['nullable', 'in:pending,reviewed,shortlisted,interview,hired,rejected,withdrawn'],
        ]);
    }

    private function authorizeAdmin(): void
    {
        abort_unless(auth()->user() instanceof Administrator, 403, 'Unauthorized');
    }
}
