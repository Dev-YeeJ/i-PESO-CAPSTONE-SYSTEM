<?php

namespace App\Http\Controllers\Api\Admin\ConstituentCRM;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Application;
use App\Models\Employer;
use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployerController extends Controller
{
    public function summary(): JsonResponse
    {
        abort_unless(auth()->user() instanceof Administrator, 403, 'Unauthorized');

        $monthStart = now()->startOfMonth();
        $vacancyColumn = Schema::hasTable('job_vacancies')
            ? ", SUM(CASE WHEN EXISTS (SELECT 1 FROM job_vacancies WHERE job_vacancies.employer_id = employers.employer_id AND job_vacancies.status = 'active') THEN 1 ELSE 0 END) AS with_active_vacancies"
            : ', 0 AS with_active_vacancies';

        $summary = Employer::query()->selectRaw(
            'COUNT(*) AS total'
            .", SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) AS verified"
            .", SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) AS pending"
            .", SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) AS rejected"
            .', SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_this_month'
            .$vacancyColumn,
            [$monthStart]
        )->first();

        $totalActiveVacancies = Schema::hasTable('job_vacancies')
            ? DB::table('job_vacancies')->where('status', 'active')->count()
            : 0;

        return response()->json([
            'total' => (int) ($summary->total ?? 0),
            'verified' => (int) ($summary->verified ?? 0),
            'pending' => (int) ($summary->pending ?? 0),
            'rejected' => (int) ($summary->rejected ?? 0),
            'with_active_vacancies' => (int) ($summary->with_active_vacancies ?? 0),
            'total_active_vacancies' => (int) $totalActiveVacancies,
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

        $query->withCount(['documents as documents_count']);
        $query->addSelect([
            DB::raw('(select count(*) from job_vacancies where job_vacancies.employer_id = employers.employer_id) as total_vacancies_count'),
            DB::raw('(select count(*) from job_vacancies where job_vacancies.employer_id = employers.employer_id and job_vacancies.status = "active") as active_vacancies_count'),
            DB::raw('(select count(*) from applications join job_vacancies on job_vacancies.post_id = applications.post_id where job_vacancies.employer_id = employers.employer_id) as applications_received_count'),
            DB::raw('(select count(*) from applications join job_vacancies on job_vacancies.post_id = applications.post_id where job_vacancies.employer_id = employers.employer_id and applications.status = "hired") as hired_count'),
        ]);

        if (Schema::hasTable('job_fair_employers')) {
            $query->withCount(['jobFairJoins as job_fair_participation_count']);
        }

        $sort = strtolower((string) $request->input('sort', 'latest'));
        switch ($sort) {
            case 'company_name':
                $query->orderBy('company_name');
                break;
            case 'active_vacancy_count':
                $query->orderByDesc('active_vacancies_count')->orderByDesc('created_at');
                break;
            case 'application_count':
                $query->orderByDesc('applications_received_count')->orderByDesc('created_at');
                break;
            case 'verification_status':
                $query->orderBy('verification_status')->orderByDesc('created_at');
                break;
            case 'latest':
            default:
                $query->latest();
                break;
        }

        $employers = $query->paginate($perPage);

        $employers->getCollection()->transform(function ($employer) {
            $employer->full_name = trim(implode(' ', array_filter([
                $employer->representative_first_name,
                $employer->representative_last_name,
            ])));
            $employer->business_address_summary = trim(implode(', ', array_filter([
                $employer->house_unit_street,
                $employer->barangay,
                $employer->city_municipality,
                $employer->province,
            ])));
            $employer->industry_business_type = $employer->industry ?: $employer->industry_type;
            $employer->missing_documents = (int) ($employer->documents_count ?? 0) === 0;
            $employer->missing_gps = empty($employer->latitude) || empty($employer->longitude);
            $employer->account_status = $employer->verification_status ?: ($employer->email_verified_at ? 'verified' : 'pending');
            $employer->document_status = (int) ($employer->documents_count ?? 0) > 0 ? 'uploaded' : 'missing';

            return $employer;
        });

        return response()->json($employers);
    }

    public function show(int $id): JsonResponse
    {
        $admin = auth()->user();

        if (! $admin instanceof Administrator) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $employer = Employer::query()->select([
            'employer_id',
            'company_type',
            'company_name',
            'tin',
            'trade_name',
            'industry',
            'company_size',
            'province',
            'province_code',
            'city_municipality',
            'city_code',
            'barangay',
            'barangay_code',
            'house_unit_street',
            'latitude',
            'longitude',
            'location_accuracy',
            'google_place_id',
            'complete_address',
            'full_address',
            'region_code',
            'location_verified_at',
            'company_description',
            'company_logo',
            'industry_type',
            'representative_name',
            'representative_first_name',
            'representative_middle_name',
            'representative_last_name',
            'representative_designation',
            'mobile_number',
            'representative_contact_number',
            'representative_is_owner',
            'profile_image',
            'verification_status',
            'verified_at',
            'rejection_reason',
            'verified_by_admin_id',
            'email_verified_at',
            'created_at',
            'updated_at',
        ])->findOrFail($id);

        $documents = [];
        if (Schema::hasTable('employer_documents')) {
            $documents = $employer->documents()->select(['document_id', 'employer_id', 'document_type', 'original_filename', 'mime_type', 'file_size', 'uploaded_at', 'verification_status', 'admin_notes', 'expiration_date'])->get()->toArray();
        }

        $vacancies = [];
        if (Schema::hasTable('job_vacancies')) {
            $vacancies = $employer->vacancies()->select(['post_id', 'job_title', 'status', 'created_at'])->get()->toArray();
        }

        $activeVacancies = collect($vacancies)->where('status', 'active')->values();
        $closedVacancies = collect($vacancies)->whereIn('status', ['closed', 'draft'])->values();

        $applications = [];
        if (Schema::hasTable('applications') && Schema::hasTable('job_vacancies')) {
            $applications = Application::query()
                ->whereHas('jobVacancy', function ($q) use ($employer) {
                    $q->where('employer_id', $employer->employer_id);
                })
                ->select(['apply_id', 'post_id', 'status', 'created_at'])
                ->get()
                ->toArray();
        }

        $jobFairParticipation = [];
        if (Schema::hasTable('job_fair_employers')) {
            $jobFairParticipation = $employer->jobFairJoins()->select(['id', 'job_fair_id', 'joined_at'])->get()->toArray();
        }

        $payload = $employer->toArray();
        $payload['company_profile'] = [
            'employer_id' => $employer->employer_id,
            'company_name' => $employer->company_name,
            'company_type' => $employer->company_type,
            'industry' => $employer->industry,
            'company_size' => $employer->company_size,
            'business_address' => trim(implode(', ', array_filter([
                $employer->house_unit_street,
                $employer->barangay,
                $employer->city_municipality,
                $employer->province,
            ]))),
            'gps_status' => empty($employer->latitude) || empty($employer->longitude) ? 'missing' : 'available',
            'verification_status' => $employer->verification_status,
            'rejection_reason' => $employer->rejection_reason,
        ];
        $payload['representative_information'] = [
            'representative_name' => $employer->representative_name,
            'representative_first_name' => $employer->representative_first_name,
            'representative_last_name' => $employer->representative_last_name,
            'representative_designation' => $employer->representative_designation,
            'mobile_number' => $employer->mobile_number,
            'representative_contact_number' => $employer->representative_contact_number,
            'representative_is_owner' => (bool) $employer->representative_is_owner,
            'email' => $employer->email,
        ];
        $payload['business_address'] = [
            'house_unit_street' => $employer->house_unit_street,
            'barangay' => $employer->barangay,
            'city_municipality' => $employer->city_municipality,
            'province' => $employer->province,
            'latitude' => $employer->latitude,
            'longitude' => $employer->longitude,
            'complete_address' => $employer->complete_address,
            'full_address' => $employer->full_address,
        ];
        $payload['verification_documents'] = $documents;
        $payload['verification_status'] = $employer->verification_status;
        $payload['verification_remarks'] = $employer->rejection_reason;
        $payload['active_vacancies_summary'] = [
            'total' => count($activeVacancies),
            'latest' => $activeVacancies[0] ?? null,
        ];
        $payload['closed_vacancies_summary'] = [
            'total' => count($closedVacancies),
            'latest' => $closedVacancies[0] ?? null,
        ];
        $payload['applications_summary'] = [
            'total' => count($applications),
            'hired_count' => collect($applications)->where('status', 'hired')->count(),
            'latest' => $applications[0] ?? null,
        ];
        $payload['job_fair_participation'] = $jobFairParticipation;
        $payload['data_quality_flags'] = [
            'missing_business_address' => empty($employer->house_unit_street) && empty($employer->barangay) && empty($employer->city_municipality) && empty($employer->province),
            'missing_gps' => empty($employer->latitude) || empty($employer->longitude),
            'missing_documents' => empty($documents),
            'no_active_vacancies' => empty($activeVacancies),
            'no_representative_contact' => empty($employer->representative_contact_number) && empty($employer->mobile_number),
            'rejected_documents' => collect($documents)->contains(fn ($document) => ($document['verification_status'] ?? null) === 'rejected'),
        ];
        $payload['required_documents'] = $employer->getRequiredDocuments();

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
     * Download the currently filtered employer directory as CSV.
     * GET /api/admin/employers/export
     */
    public function export(Request $request): StreamedResponse
    {
        abort_unless(auth()->user() instanceof Administrator, 403, 'Unauthorized');

        $query = $this->filteredQuery($request)->reorder('employer_id');
        $filename = 'employers-'.now()->format('Y-m-d').'.csv';

        ActivityLogger::log('exported_employers', sprintf(
            'Exported the employer directory (%d record(s)) as CSV.',
            (clone $query)->count()
        ));

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'wb');

            // BOM so Excel opens the file as UTF-8.
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, [
                'Employer ID', 'Company Name', 'Trade Name', 'Email', 'Company Type',
                'Industry', 'Company Size', 'Verification Status', 'Registered At',
            ]);

            $query->chunkById(500, function ($employers) use ($handle) {
                foreach ($employers as $employer) {
                    fputcsv($handle, [
                        $employer->employer_id,
                        $employer->company_name,
                        $employer->trade_name,
                        $employer->email,
                        $employer->company_type,
                        $employer->industry,
                        $employer->company_size,
                        $employer->verification_status,
                        optional($employer->created_at)->toDateTimeString(),
                    ]);
                }
            }, 'employer_id');

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
        $query = Employer::query()->select([
            'employer_id',
            'company_name',
            'company_type',
            'industry',
            'industry_type',
            'province',
            'city_municipality',
            'barangay',
            'house_unit_street',
            'latitude',
            'longitude',
            'representative_name',
            'representative_first_name',
            'representative_last_name',
            'mobile_number',
            'representative_contact_number',
            'email',
            'verification_status',
            'verified_at',
            'email_verified_at',
            'created_at',
        ]);

        $search = trim((string) $request->string('search'));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                    ->orWhere('representative_name', 'like', "%{$search}%")
                    ->orWhere('representative_first_name', 'like', "%{$search}%")
                    ->orWhere('representative_last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile_number', 'like', "%{$search}%")
                    ->orWhere('representative_contact_number', 'like', "%{$search}%") ;
            });
        }

        if ($request->filled('verification_status')) {
            $query->where('verification_status', $request->input('verification_status'));
        }

        if ($request->filled('company_type')) {
            $query->where('company_type', $request->input('company_type'));
        }

        if ($request->filled('industry')) {
            $industry = $request->input('industry').'%';
            $query->where(function ($industryQuery) use ($industry) {
                $industryQuery->where('industry', 'like', $industry)
                    ->orWhere('industry_type', 'like', $industry);
            });
        }

        if ($request->filled('province')) {
            $query->where('province', 'like', $request->input('province').'%');
        }

        if ($request->filled('city')) {
            $query->where('city_municipality', 'like', $request->input('city').'%');
        }

        if ($request->filled('barangay')) {
            $query->where('barangay', 'like', $request->input('barangay').'%');
        }

        if ($request->filled('has_active_vacancies')) {
            $hasActiveVacancies = $this->resolveBoolean($request->input('has_active_vacancies'));
            if ($hasActiveVacancies !== null) {
                $query->{$hasActiveVacancies ? 'whereHas' : 'whereDoesntHave'}('vacancies', function ($q) {
                    $q->where('status', 'active');
                });
            }
        }

        if ($request->filled('has_applications')) {
            $hasApplications = $this->resolveBoolean($request->input('has_applications'));
            if ($hasApplications !== null) {
                $query->{$hasApplications ? 'whereHas' : 'whereDoesntHave'}('vacancies.applications');
            }
        }

        if ($request->filled('has_job_fair')) {
            $hasJobFair = $this->resolveBoolean($request->input('has_job_fair'));
            if ($hasJobFair !== null) {
                $query->{$hasJobFair ? 'whereHas' : 'whereDoesntHave'}('jobFairJoins');
            }
        }

        if ($request->filled('document_status')) {
            $documentStatus = strtolower((string) $request->input('document_status'));
            if ($documentStatus === 'missing') {
                $query->whereDoesntHave('documents');
            } elseif ($documentStatus === 'uploaded') {
                $query->whereHas('documents');
            } elseif (in_array($documentStatus, ['pending', 'approved', 'rejected'], true)) {
                $query->whereHas('documents', function ($q) use ($documentStatus) {
                    $q->where('verification_status', $documentStatus);
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
