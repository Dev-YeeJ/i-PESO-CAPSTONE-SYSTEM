<?php

// i-peso-backend/app/Http/Controllers/Api/Admin/ConstituentCRM/SeekerController.php

namespace App\Http\Controllers\Api\Admin\ConstituentCRM;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\JobSeeker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeekerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();

        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = JobSeeker::query();

        // Search by name or email
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%$search%")
                    ->orWhere('last_name', 'like', "%$search%")
                    ->orWhere('email', 'like', "%$search%");
            });
        }

        // Filter by profile completion
        if ($request->has('profile_completed')) {
            $profileCompleted = filter_var(
                $request->input('profile_completed'),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE,
            );

            if ($profileCompleted !== null) {
                $query->where('profile_completed', $profileCompleted);
            }
        }

        // Filter by province
        if ($request->has('province') && $request->province) {
            $query->where('address_province', $request->province);
        }

        $seekers = $query->paginate($request->get('per_page', 15));

        return response()->json($seekers);
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();

        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $seeker = JobSeeker::with([
            'disabilities:id,seeker_id,disability_type,disability_specification',
            'languages:id,seeker_id,language,language_other,can_read,can_write,can_speak,can_understand',
            'occupations:id,seeker_id,occupation_title,preference_order',
            'workLocations:id,seeker_id,location_type,location_name,location_code',
            'educations:id,seeker_id,level,institution_name,course_strand,completion_status,year_started,year_graduated,undergrad_level_reached,undergrad_year_last_attended,current_level',
            'trainings:id,seeker_id,course,hours_of_training,training_institution,skills_acquired,certificates_received',
            'eligibilities:id,seeker_id,type,name,date_taken,valid_until',
            'workExperiences:id,seeker_id,company_name,company_address,position,number_of_months,employment_status',
            'seekerSkills:id,seeker_id,skill_name,skill_type',
            'certificates:certificate_id,seeker_id,title,issuing_body,original_filename,mime_type,file_size,issued_at,created_at',
        ])->findOrFail($id);

        return response()->json($seeker);
    }
}
