<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class LocationDataQualityController extends Controller
{
    /**
     * Get an overview of location data quality metrics
     * GET /api/admin/location-data-quality/metrics
     */
    public function metrics(): JsonResponse
    {
        return response()->json([
            'job_seekers' => [
                'total' => JobSeeker::count(),
                'with_coordinates' => JobSeeker::whereNotNull('latitude')->whereNotNull('longitude')->count(),
                'verified_location' => JobSeeker::whereNotNull('location_verified_at')->count(),
                'missing_coordinates' => JobSeeker::whereNull('latitude')->orWhereNull('longitude')->count(),
                'missing_psgc' => JobSeeker::whereNull('address_barangay_code')->count(),
            ],
            'employers' => [
                'total' => Employer::count(),
                'with_coordinates' => Employer::whereNotNull('latitude')->whereNotNull('longitude')->count(),
                'verified_location' => Employer::whereNotNull('location_verified_at')->count(),
                'missing_coordinates' => Employer::whereNull('latitude')->orWhereNull('longitude')->count(),
                'missing_psgc' => Employer::whereNull('barangay_code')->count(),
            ],
            'job_vacancies' => [
                'total' => JobVacancy::count(),
                'with_coordinates' => JobVacancy::whereNotNull('latitude')->whereNotNull('longitude')->count(),
                'verified_location' => JobVacancy::whereNotNull('location_verified_at')->count(),
                'missing_coordinates' => JobVacancy::whereNull('latitude')->orWhereNull('longitude')->count(),
                'missing_psgc' => JobVacancy::whereNull('barangay_code')->count(),
            ]
        ]);
    }

    /**
     * Get analytics on location distributions for Job Seekers and Job Vacancies
     * GET /api/admin/location-data-quality/analytics
     */
    public function analytics(): JsonResponse
    {
        $seekersByCity = JobSeeker::select('address_municipality_city as city', DB::raw('count(*) as count'))
            ->groupBy('address_municipality_city')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        $vacanciesByCity = JobVacancy::select('city_municipality as city', DB::raw('count(*) as count'))
            ->groupBy('city_municipality')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        return response()->json([
            'seekers_by_city' => $seekersByCity,
            'vacancies_by_city' => $vacanciesByCity,
        ]);
    }
}
