<?php

namespace App\Http\Controllers\Api\Admin\ConstituentCRM;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SeekerController extends Controller
{
    public function summary(): JsonResponse
    {
        abort_unless(auth()->user() instanceof Administrator, 403, 'Unauthorized');

        $monthStart = now()->startOfMonth();
        $applicationColumns = Schema::hasTable('applications')
            ? ', SUM(CASE WHEN EXISTS (SELECT 1 FROM applications WHERE applications.seeker_id = job_seekers.seeker_id) THEN 1 ELSE 0 END) AS with_applications'
                .", SUM(CASE WHEN EXISTS (SELECT 1 FROM applications WHERE applications.seeker_id = job_seekers.seeker_id AND applications.status = 'hired') THEN 1 ELSE 0 END) AS hired"
            : ', 0 AS with_applications, 0 AS hired';

        $summary = JobSeeker::query()->selectRaw(
            'COUNT(*) AS total'
            .', SUM(CASE WHEN profile_completed = 1 THEN 1 ELSE 0 END) AS complete'
            .', SUM(CASE WHEN profile_completed = 0 THEN 1 ELSE 0 END) AS incomplete'
            .', SUM(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END) AS missing_gps'
            .', SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_this_month'
            .$applicationColumns,
            [$monthStart]
        )->first();

        return response()->json([
            'total' => (int) ($summary->total ?? 0),
            'complete' => (int) ($summary->complete ?? 0),
            'incomplete' => (int) ($summary->incomplete ?? 0),
            'with_applications' => (int) ($summary->with_applications ?? 0),
            'hired' => (int) ($summary->hired ?? 0),
            'missing_gps' => (int) ($summary->missing_gps ?? 0),
            'new_this_month' => (int) ($summary->new_this_month ?? 0),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $admin = auth()->user();

        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = $this->filteredQuery($request);

        $perPage = (int) $request->input('per_page', 15);
        $perPage = max(1, min($perPage, 100));

        $countRelations = [
            'applications as applications_count',
            'certificates as certificates_count',
            'seekerSkills as skills_count',
        ];

        if (Schema::hasTable('job_fair_attendees')) {
            $countRelations[] = 'jobFairAttendances as job_fair_participation_count';
        }

        if (Schema::hasTable('applications')) {
            $countRelations['applications as hired_count'] = function ($q) {
                $q->where('status', 'hired');
            };
        }

        $query->withCount($countRelations);

        $sort = strtolower((string) $request->input('sort', 'latest'));
        switch ($sort) {
            case 'name':
                $query->orderBy('last_name')->orderBy('first_name');
                break;
            case 'profile_completion':
                $query->orderByDesc('profile_completed')->orderByDesc('created_at');
                break;
            case 'application_count':
                $query->orderByDesc('applications_count')->orderByDesc('created_at');
                break;
            case 'location':
                $query->orderBy('address_province')->orderBy('address_municipality_city')->orderBy('address_barangay');
                break;
            case 'latest':
            default:
                $query->latest();
                break;
        }

        $seekers = $query->paginate($perPage);

        $seekers->getCollection()->transform(function ($seeker) {
            $seeker->full_name = trim(implode(' ', array_filter([
                $seeker->first_name,
                $seeker->middle_name,
                $seeker->last_name,
                $seeker->suffix,
            ])));
            $seeker->location_summary = trim(implode(', ', array_filter([
                $seeker->address_barangay,
                $seeker->address_municipality_city,
                $seeker->address_province,
            ])));
            $seeker->preferred_occupation_summary = null;
            $seeker->broad_field_summary = null;
            $seeker->profile_completion_status = $seeker->profile_completed ? 'complete' : 'incomplete';
            $seeker->missing_gps = empty($seeker->latitude) || empty($seeker->longitude);
            $seeker->account_status = $seeker->is_verified ? 'verified' : ($seeker->verification_status ?: 'pending');

            return $seeker;
        });

        return response()->json($seekers);
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();

        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $seeker = JobSeeker::query()
            ->select([
                'seeker_id',
                'first_name',
                'middle_name',
                'last_name',
                'suffix',
                'mobile_number',
                'email',
                'password',
                'educ_attainment',
                'skills',
                'resume_path',
                'profile_image',
                'email_verified_at',
                'is_verified',
                'verification_status',
                'verified_at',
                'verified_by',
                'verification_remarks',
                'date_of_birth',
                'sex',
                'civil_status',
                'religion',
                'height_ft',
                'tin',
                'address_house_street',
                'address_barangay',
                'address_municipality_city',
                'address_province',
                'address_barangay_code',
                'address_city_code',
                'address_province_code',
                'latitude',
                'longitude',
                'is_4ps_beneficiary',
                'household_id_4ps',
                'is_first_time_jobseeker',
                'employment_status',
                'employment_type',
                'self_employed_type',
                'self_employed_type_others',
                'unemployment_months',
                'unemployment_reason',
                'unemployment_reason_others',
                'unemployment_terminated_country',
                'is_ofw',
                'ofw_country',
                'is_former_ofw',
                'former_ofw_country',
                'former_ofw_return_date',
                'work_type_preference',
                'preferred_work_location',
                'preferred_locations_details',
                'currently_in_school',
                'other_skills',
                'profile_completed',
                'profile_completed_at',
                'form_validation_state',
                'created_at',
                'updated_at',
            ])
            ->findOrFail($id);

        $education = [];
        if (Schema::hasTable('seeker_educations')) {
            $education = $seeker->educations()->select(['id', 'seeker_id', 'level', 'institution_name', 'course_strand', 'completion_status', 'year_started', 'year_graduated'])->get()->toArray();
        }

        $skills = [];
        if (Schema::hasTable('seeker_skills')) {
            $skills = $seeker->seekerSkills()->select(['id', 'seeker_id', 'skill_name', 'skill_type'])->get()->toArray();
        }

        $workExperience = [];
        if (Schema::hasTable('seeker_work_experiences')) {
            $workExperience = $seeker->workExperiences()->select(['id', 'seeker_id', 'company_name', 'company_address', 'position', 'number_of_months', 'employment_status'])->get()->toArray();
        }

        $trainings = [];
        if (Schema::hasTable('seeker_trainings')) {
            $trainings = $seeker->trainings()->select(['id', 'seeker_id', 'course', 'hours_of_training', 'training_institution', 'skills_acquired', 'certificates_received'])->get()->toArray();
        }

        $certificates = [];
        if (Schema::hasTable('seeker_certificates')) {
            $certificates = $seeker->certificates()->select(['certificate_id', 'seeker_id', 'title', 'issuing_body', 'original_filename', 'mime_type', 'file_size', 'issued_at', 'created_at'])->get()->map(function ($certificate) {
                $certificate->file_path = null;

                return $certificate;
            })->toArray();
        }

        $applications = [];
        if (Schema::hasTable('applications')) {
            $applications = $seeker->applications()->select(['apply_id', 'status', 'status_changed_at', 'created_at'])->get()->toArray();
        }

        $applicationStatusSummary = [];
        if (! empty($applications)) {
            $applicationStatusSummary = collect($applications)->groupBy('status')->map(fn ($items) => count($items))->toArray();
        }

        $jobFairParticipation = [];
        if (Schema::hasTable('job_fair_attendees')) {
            $jobFairParticipation = $seeker->jobFairAttendances()->select(['id', 'job_fair_id', 'created_at'])->get()->toArray();
        }

        $payload = $seeker->toArray();
        $payload['profile'] = [
            'seeker_id' => $seeker->seeker_id,
            'first_name' => $seeker->first_name,
            'middle_name' => $seeker->middle_name,
            'last_name' => $seeker->last_name,
            'suffix' => $seeker->suffix,
            'full_name' => trim(implode(' ', array_filter([
                $seeker->first_name,
                $seeker->middle_name,
                $seeker->last_name,
                $seeker->suffix,
            ]))),
            'email' => $seeker->email,
            'mobile_number' => $seeker->mobile_number,
            'location_summary' => trim(implode(', ', array_filter([
                $seeker->address_barangay,
                $seeker->address_municipality_city,
                $seeker->address_province,
            ]))),
            'employment_status' => $seeker->employment_status,
            'profile_completed' => (bool) $seeker->profile_completed,
            'profile_completion_status' => $seeker->profile_completed ? 'complete' : 'incomplete',
        ];
        $payload['education'] = $education;
        $payload['skills'] = $skills;
        $payload['work_experience'] = $workExperience;
        $payload['trainings'] = $trainings;
        $payload['certificates'] = $certificates;
        $payload['applications_summary'] = [
            'total' => count($applications),
            'hired_count' => collect($applications)->where('status', 'hired')->count(),
            'latest' => $applications[0] ?? null,
        ];
        $payload['application_status_summary'] = $applicationStatusSummary;
        $payload['job_fair_participation'] = $jobFairParticipation;
        $payload['data_quality_flags'] = [
            'missing_gps' => empty($seeker->latitude) || empty($seeker->longitude),
            'missing_preferred_occupation' => empty($skills) && empty($seeker->occupations()->count()),
            'no_skills' => empty($skills),
            'no_education' => empty($education),
            'no_certificates' => empty($certificates),
            'incomplete_profile' => ! (bool) $seeker->profile_completed,
            'no_contact_number' => empty($seeker->mobile_number),
            'no_applications' => empty($applications),
        ];

        return response()->json($payload);
    }

    private function resolveBoolean(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (bool) $value;
        }

        $normalized = strtolower((string) $value);
        if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
            return true;
        }

        if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
            return false;
        }

        return null;
    }
    /**
     * Download the currently filtered directory as CSV.
     * GET /api/admin/seekers/export
     */
    public function export(Request $request): StreamedResponse
    {
        abort_unless(auth()->user() instanceof Administrator, 403, 'Unauthorized');

        $query = $this->filteredQuery($request)->reorder('seeker_id');
        $filename = 'job-seekers-'.now()->format('Y-m-d').'.csv';

        // Exporting constituent contact details is a disclosure worth recording.
        ActivityLogger::log('exported_job_seekers', sprintf(
            'Exported the job seeker directory (%d record(s)) as CSV.',
            (clone $query)->count()
        ));

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'wb');

            // BOM so Excel opens the file as UTF-8.
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, [
                'Seeker ID', 'Full Name', 'Email', 'Mobile Number', 'Educational Attainment',
                'Employment Status', 'Barangay', 'City / Municipality', 'Province',
                'Profile Completed', 'Verification Status', 'Registered At',
            ]);

            $query->chunkById(500, function ($seekers) use ($handle) {
                foreach ($seekers as $seeker) {
                    fputcsv($handle, [
                        $seeker->seeker_id,
                        trim(implode(' ', array_filter([
                            $seeker->first_name,
                            $seeker->middle_name,
                            $seeker->last_name,
                            $seeker->suffix,
                        ]))),
                        $seeker->email,
                        $seeker->mobile_number,
                        $seeker->educ_attainment,
                        $seeker->employment_status,
                        $seeker->address_barangay,
                        $seeker->address_municipality_city,
                        $seeker->address_province,
                        $seeker->profile_completed ? 'Yes' : 'No',
                        $seeker->verification_status ?? ($seeker->is_verified ? 'verified' : 'pending'),
                        optional($seeker->created_at)->toDateTimeString(),
                    ]);
                }
            }, 'seeker_id');

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * Base query with every directory filter applied. Shared by the paginated
     * listing and the CSV export so the two can never disagree on what matches.
     */
    private function filteredQuery(Request $request): Builder
    {
        $query = JobSeeker::query()
            ->select([
                'seeker_id',
                'first_name',
                'middle_name',
                'last_name',
                'suffix',
                'mobile_number',
                'email',
                'educ_attainment',
                'employment_status',
                'address_barangay',
                'address_municipality_city',
                'address_province',
                'latitude',
                'longitude',
                'profile_completed',
                'is_verified',
                'verification_status',
                'created_at',
            ]);

        $search = trim((string) $request->string('search'));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile_number', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('suffix', 'like', "%{$search}%")
                    ->orWhere(function ($nameQuery) use ($search) {
                        $nameQuery->whereNotNull('first_name')->whereNotNull('last_name');
                        $nameQuery->whereRaw("first_name || ' ' || last_name like ?", ["%{$search}%"]);
                    });
            });
        }

        $profileCompleted = $this->resolveBoolean($request->input('profile_completed'));
        if ($profileCompleted !== null) {
            $query->where('profile_completed', $profileCompleted);
        }

        $profileStatus = $request->input('profile_status');
        if ($profileStatus !== null && $profileStatus !== '') {
            $normalized = strtolower((string) $profileStatus);
            if (in_array($normalized, ['complete', 'completed', '1', 'true', 'yes'], true)) {
                $query->where('profile_completed', true);
            } elseif (in_array($normalized, ['incomplete', 'pending', '0', 'false', 'no'], true)) {
                $query->where('profile_completed', false);
            }
        }

        if ($request->filled('employment_status')) {
            $query->where('employment_status', $request->input('employment_status'));
        }

        if ($request->filled('province')) {
            $query->where('address_province', 'like', $request->input('province').'%');
        }

        if ($request->filled('city')) {
            $query->where('address_municipality_city', 'like', $request->input('city').'%');
        }

        if ($request->filled('barangay')) {
            $query->where('address_barangay', 'like', $request->input('barangay').'%');
        }

        if ($request->filled('broad_field')) {
            $query->whereHas('occupations', function ($q) use ($request) {
                $q->where('broad_field', 'like', "%{$request->input('broad_field')}%")
                    ->orWhere('general_term', 'like', "%{$request->input('broad_field')}%" );
            });
        }

        if ($request->filled('preferred_occupation')) {
            $query->whereHas('occupations', function ($q) use ($request) {
                $q->where('occupation_title', 'like', "%{$request->input('preferred_occupation')}%")
                    ->orWhere('general_term', 'like', "%{$request->input('preferred_occupation')}%" );
            });
        }

        if ($request->filled('skill')) {
            $query->whereHas('seekerSkills', function ($q) use ($request) {
                $q->where('skill_name', 'like', "%{$request->input('skill')}%" );
            });
        }

        if ($request->filled('has_certificates')) {
            $hasCertificates = $this->resolveBoolean($request->input('has_certificates'));
            if ($hasCertificates !== null) {
                $query->{$hasCertificates ? 'whereHas' : 'whereDoesntHave'}('certificates');
            }
        }

        if ($request->filled('has_applications')) {
            $hasApplications = $this->resolveBoolean($request->input('has_applications'));
            if ($hasApplications !== null) {
                $query->{$hasApplications ? 'whereHas' : 'whereDoesntHave'}('applications');
            }
        }

        if ($request->filled('hired_status')) {
            $hiredStatus = strtolower((string) $request->input('hired_status'));
            if ($hiredStatus === 'hired') {
                $query->whereHas('applications', function ($q) {
                    $q->where('status', 'hired');
                });
            } elseif ($hiredStatus === 'not_hired') {
                $query->whereDoesntHave('applications', function ($q) {
                    $q->where('status', 'hired');
                });
            }
        }

        if ($request->filled('missing_gps')) {
            $missingGps = $this->resolveBoolean($request->input('missing_gps'));
            if ($missingGps !== null) {
                $query->where(function ($q) use ($missingGps) {
                    if ($missingGps) {
                        $q->whereNull('latitude')->orWhereNull('longitude');
                    } else {
                        $q->whereNotNull('latitude')->whereNotNull('longitude');
                    }
                });
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        return $query;
    }

}
