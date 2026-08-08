<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobFair;
use App\Models\JobFairAttendee;
use App\Models\JobFairEmployer;
use App\Models\JobFairVacancy;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Services\EstablishmentReportService;
use App\Services\JobFairReportService;
use App\Services\JobFairService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class JobFairController extends Controller
{
    public function index(Request $request, JobFairService $service): JsonResponse
    {
        $fairs = JobFair::query()
            ->where('is_public', true)
            ->whereIn('status', JobFairService::PUBLIC_STATUSES)
            ->orderByRaw('COALESCE(start_date, event_date) asc')
            // Same relations eventPayload() requests via loadMissing() —
            // loading them here means that call finds them already present
            // and skips its own query, instead of firing 3 more per fair.
            ->with([
                'requirements' => fn ($query) => $query->orderBy('sort_order'),
                'employerJoins.employer:employer_id,company_name,trade_name',
                'vacancyLinks.vacancy:post_id,job_title,vacancies_count,status',
            ])
            ->get()
            ->map(fn (JobFair $fair) => $service->eventPayload($fair, $request->user()));

        return response()->json(['data' => $fairs]);
    }

    public function rsvp(Request $request, int $id): JsonResponse
    {
        $seeker = $this->seeker($request);
        $fair = JobFair::findOrFail($id);

        if (! in_array($fair->status, ['upcoming', 'ongoing', 'active'], true)) {
            throw ValidationException::withMessages([
                'job_fair' => ['This job fair is no longer accepting RSVPs.'],
            ]);
        }

        $attendee = JobFairAttendee::firstOrCreate(
            [
                'job_fair_id' => $fair->job_fair_id,
                'seeker_id' => $seeker->seeker_id,
            ],
            [
                'qr_code_uuid' => (string) Str::uuid(),
            ],
        );

        $attendee->load('seeker.seekerSkills', 'jobFair');

        return response()->json([
            'message' => 'RSVP confirmed.',
            'pass' => $this->formatPass($attendee),
        ]);
    }

    public function employerJoin(Request $request, int $id): JsonResponse
    {
        $employer = $this->employer($request);
        $fair = JobFair::findOrFail($id);

        $validated = $request->validate([
            'vacancy_ids' => ['required', 'array', 'min:1'],
            'vacancy_ids.*' => [
                'integer',
                Rule::exists('job_vacancies', 'post_id')->where('employer_id', $employer->employer_id),
            ],
        ]);

        DB::transaction(function () use ($fair, $employer, $validated) {
            JobFairEmployer::updateOrCreate(
                [
                    'job_fair_id' => $fair->job_fair_id,
                    'employer_id' => $employer->employer_id,
                ],
                ['joined_at' => now()],
            );

            $vacancyIds = collect($validated['vacancy_ids'])->unique()->values();

            JobFairVacancy::query()
                ->where('job_fair_id', $fair->job_fair_id)
                ->where('employer_id', $employer->employer_id)
                ->whereNotIn('vacancy_id', $vacancyIds)
                ->delete();

            foreach ($vacancyIds as $vacancyId) {
                JobFairVacancy::updateOrCreate([
                    'job_fair_id' => $fair->job_fair_id,
                    'employer_id' => $employer->employer_id,
                    'vacancy_id' => $vacancyId,
                ]);
            }
        });

        return response()->json([
            'message' => 'Employer booth joined.',
            'job_fair' => $this->formatFair($fair->fresh(), $employer),
        ]);
    }

    public function scanQr(Request $request): JsonResponse
    {
        $employer = $this->employer($request);
        $validated = $request->validate([
            'qr_code_uuid' => ['required', 'uuid'],
            'job_fair_id' => ['nullable', 'integer', 'exists:job_fairs,job_fair_id'],
        ]);

        $attendee = JobFairAttendee::query()
            ->with(['jobFair', 'seeker.seekerSkills', 'seeker.educations', 'seeker.workExperiences', 'seeker.occupations'])
            ->where('qr_code_uuid', $validated['qr_code_uuid'])
            ->when($validated['job_fair_id'] ?? null, fn ($query, $fairId) => $query->where('job_fair_id', $fairId))
            ->firstOrFail();

        $this->ensureEmployerJoined($employer, $attendee->job_fair_id);

        $attendee->forceFill([
            'scanned_at' => now(),
            'is_attended' => true,
        ])->save();

        return response()->json([
            'message' => 'QR pass scanned.',
            'attendee' => $this->formatQueueAttendee($attendee->fresh(['jobFair', 'seeker.seekerSkills', 'seeker.educations', 'seeker.workExperiences', 'seeker.occupations'])),
        ]);
    }

    public function fastTrack(Request $request): JsonResponse
    {
        $employer = $this->employer($request);

        $validated = $request->validate([
            'job_fair_id' => ['required', 'integer', 'exists:job_fairs,job_fair_id'],
            'vacancy_id' => [
                'required',
                'integer',
                Rule::exists('job_vacancies', 'post_id')->where('employer_id', $employer->employer_id),
            ],
            'seeker_id' => ['nullable', 'integer', 'exists:job_seekers,seeker_id'],
            'qr_code_uuid' => ['nullable', 'uuid'],
            'action' => ['required', Rule::in(['qualified', 'near_hired', 'hots', 'reject'])],
            'placement_start_date' => ['required_if:action,hots', 'nullable', 'date'],
            'placement_salary' => ['required_if:action,hots', 'nullable', 'numeric', 'min:1'],
            'dole_mismatch_code' => ['required_if:action,reject', 'nullable', Rule::in(array_keys(EstablishmentReportService::EMPLOYER_MISMATCH_REASONS))],
            'seeker_mismatch_reason_code' => ['nullable', Rule::in(array_keys(EstablishmentReportService::SEEKER_MISMATCH_REASONS))],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        if (blank($validated['seeker_id'] ?? null) && blank($validated['qr_code_uuid'] ?? null)) {
            throw ValidationException::withMessages([
                'seeker' => ['Provide either seeker_id or qr_code_uuid.'],
            ]);
        }

        $this->ensureEmployerJoined($employer, (int) $validated['job_fair_id']);
        $this->ensureVacancyLinked($employer, (int) $validated['job_fair_id'], (int) $validated['vacancy_id']);

        $attendee = JobFairAttendee::query()
            ->where('job_fair_id', $validated['job_fair_id'])
            ->when($validated['seeker_id'] ?? null, fn ($query, $seekerId) => $query->where('seeker_id', $seekerId))
            ->when($validated['qr_code_uuid'] ?? null, fn ($query, $uuid) => $query->where('qr_code_uuid', $uuid))
            ->first();

        if (! $attendee) {
            throw ValidationException::withMessages([
                'seeker' => ['This seeker has not RSVP’d for the selected job fair.'],
            ]);
        }

        $application = DB::transaction(function () use ($validated, $employer, $attendee) {
            $status = match ($validated['action']) {
                'qualified' => 'shortlisted',
                'near_hired' => 'reviewed',
                'hots' => 'hired',
                'reject' => 'rejected',
            };

            $remarks = $validated['remarks'] ?? match ($validated['action']) {
                'qualified' => 'Qualified during job fair booth screening.',
                'near_hired' => 'Near hired during job fair booth screening.',
                'hots' => 'Hired on the spot during job fair.',
                'reject' => 'Rejected or mismatched during job fair booth screening.',
            };

            $application = Application::updateOrCreate(
                [
                    'post_id' => $validated['vacancy_id'],
                    'seeker_id' => $attendee->seeker_id,
                ],
                [
                    'job_fair_id' => $validated['job_fair_id'],
                    'status' => $status,
                    'status_changed_at' => now(),
                    'status_changed_by' => $employer->employer_id,
                    'employer_remarks' => $remarks,
                    'is_hots' => $validated['action'] === 'hots',
                    'dole_mismatch_code' => $validated['action'] === 'reject'
                        ? $validated['dole_mismatch_code']
                        : null,
                    'employer_mismatch_reason_code' => $validated['action'] === 'reject'
                        ? $validated['dole_mismatch_code']
                        : null,
                    'seeker_mismatch_reason_code' => $validated['action'] === 'reject'
                        ? ($validated['seeker_mismatch_reason_code'] ?? null)
                        : null,
                    'mismatch_reason_details' => $validated['action'] === 'reject'
                        ? ($validated['remarks'] ?? null)
                        : null,
                    'placement_start_date' => $validated['action'] === 'hots'
                        ? $validated['placement_start_date']
                        : null,
                    'placement_salary' => $validated['action'] === 'hots'
                        ? $validated['placement_salary']
                        : null,
                    'placement_captured_at' => $validated['action'] === 'hots' ? now() : null,
                ],
            );

            return $application->fresh(['jobVacancy.employer', 'jobSeeker.seekerSkills']);
        });

        return response()->json([
            'message' => 'Booth action saved.',
            'application' => [
                'apply_id' => $application->apply_id,
                'status' => $application->status,
                'is_hots' => (bool) $application->is_hots,
                'dole_mismatch_code' => $application->dole_mismatch_code,
                'employer_mismatch_reason_code' => $application->employer_mismatch_reason_code,
                'seeker_mismatch_reason_code' => $application->seeker_mismatch_reason_code,
                'seeker_id' => $application->seeker_id,
                'vacancy_id' => $application->post_id,
            ],
        ]);
    }

    public function exportRoiForm3(Request $request, int $id, EstablishmentReportService $reports)
    {
        $employer = $this->employer($request);
        $fair = JobFair::findOrFail($id);
        $this->ensureEmployerJoined($employer, $fair->job_fair_id);

        $data = $reports->build([
            'job_fair_id' => $fair->job_fair_id,
            'source' => 'job_fair',
        ], $employer);

        return $reports->downloadPdf($data, "job-fair-{$fair->job_fair_id}");
    }

    public function exportSprs(Request $request, int $id, JobFairReportService $reports)
    {
        abort_unless($request->user() instanceof Administrator, 403, 'Administrator account required.');

        $fair = JobFair::findOrFail($id);
        $summary = $reports->sprs($fair);

        $pdf = Pdf::loadView('pdf.job_fairs.sprs_1_6', [
            'fair' => $fair,
            'summary' => $summary,
        ])->setPaper('a4', 'portrait');

        return $pdf->download("sprs-1-6-job-fair-{$fair->job_fair_id}.pdf");
    }

    private function seeker(Request $request): JobSeeker
    {
        $user = $request->user();
        abort_unless($user instanceof JobSeeker, 403, 'Job seeker account required.');

        return $user;
    }

    private function employer(Request $request): Employer
    {
        $user = $request->user();
        abort_unless($user instanceof Employer, 403, 'Employer account required.');

        return $user;
    }

    private function ensureEmployerJoined(Employer $employer, int $fairId): void
    {
        abort_unless(
            JobFairEmployer::query()
                ->where('job_fair_id', $fairId)
                ->where('employer_id', $employer->employer_id)
                ->exists(),
            403,
            'Join this job fair before using booth tools.',
        );
    }

    private function ensureVacancyLinked(Employer $employer, int $fairId, int $vacancyId): void
    {
        abort_unless(
            JobFairVacancy::query()
                ->where('job_fair_id', $fairId)
                ->where('employer_id', $employer->employer_id)
                ->where('vacancy_id', $vacancyId)
                ->exists(),
            422,
            'Link this vacancy to the fair before taking booth actions.',
        );
    }

    private function formatFair(JobFair $fair, mixed $user = null): array
    {
        $fair->loadCount([
            'employerJoins as employers_count',
            'attendees as rsvps_count',
            'attendees as attendance_count' => fn ($query) => $query->where('is_attended', true),
            'applications as hots_count' => fn ($query) => $query->where('is_hots', true),
            'vacancyLinks as vacancies_count',
        ]);

        $response = [
            'job_fair_id' => $fair->job_fair_id,
            'title' => $fair->title,
            'description' => $fair->description,
            'start_date' => $fair->start_date?->toDateString() ?? $fair->event_date?->toDateString(),
            'end_date' => $fair->end_date?->toDateString() ?? $fair->event_date?->toDateString(),
            'event_date' => $fair->event_date?->toDateString(),
            'start_time' => $fair->start_time,
            'end_time' => $fair->end_time,
            'venue' => $fair->venue,
            'sector' => $fair->sector ?? 'local',
            'status' => $fair->status === 'ongoing' ? 'active' : $fair->status,
            'metrics' => [
                'employers_joined' => (int) $fair->employers_count,
                'seekers_rsvped' => (int) $fair->rsvps_count,
                'attendance' => (int) $fair->attendance_count,
                'hots' => (int) $fair->hots_count,
                'vacancies' => (int) $fair->vacancies_count,
            ],
        ];

        if ($user instanceof JobSeeker) {
            $attendee = JobFairAttendee::query()
                ->where('job_fair_id', $fair->job_fair_id)
                ->where('seeker_id', $user->seeker_id)
                ->first();

            $response['is_rsvped'] = (bool) $attendee;
            $response['pass'] = $attendee ? $this->formatPass($attendee->load('seeker.seekerSkills', 'jobFair')) : null;
        }

        if ($user instanceof Employer) {
            $response['is_joined'] = JobFairEmployer::query()
                ->where('job_fair_id', $fair->job_fair_id)
                ->where('employer_id', $user->employer_id)
                ->exists();
            $response['linked_vacancy_ids'] = JobFairVacancy::query()
                ->where('job_fair_id', $fair->job_fair_id)
                ->where('employer_id', $user->employer_id)
                ->pluck('vacancy_id')
                ->values();
        }

        return $response;
    }

    private function formatPass(JobFairAttendee $attendee): array
    {
        $seeker = $attendee->seeker;

        return [
            'job_fair_id' => $attendee->job_fair_id,
            'event_name' => $attendee->jobFair?->title,
            'venue' => $attendee->jobFair?->venue,
            'start_date' => $attendee->jobFair?->start_date?->toDateString() ?? $attendee->jobFair?->event_date?->toDateString(),
            'name' => trim("{$seeker?->first_name} {$seeker?->last_name}"),
            'seeker_id' => $attendee->seeker_id,
            'qr_code_uuid' => $attendee->qr_code_uuid,
            'skills' => $seeker?->seekerSkills
                ->pluck('skill_name')
                ->filter()
                ->take(5)
                ->values()
                ->all() ?? [],
        ];
    }

    private function formatQueueAttendee(JobFairAttendee $attendee): array
    {
        $seeker = $attendee->seeker;

        return [
            'job_fair_id' => $attendee->job_fair_id,
            'seeker_id' => $attendee->seeker_id,
            'qr_code_uuid' => $attendee->qr_code_uuid,
            'scanned_at' => $attendee->scanned_at?->toISOString(),
            'name' => trim("{$seeker?->first_name} {$seeker?->last_name}"),
            'email' => $seeker?->email,
            'mobile_number' => $seeker?->mobile_number,
            'educ_attainment' => $seeker?->educ_attainment,
            'employment_status' => $seeker?->employment_status,
            'skills' => $seeker?->seekerSkills->pluck('skill_name')->filter()->values()->all() ?? [],
            'occupations' => $seeker?->occupations ?? [],
            'educations' => $seeker?->educations ?? [],
            'work_experiences' => $seeker?->workExperiences ?? [],
        ];
    }

    private function sprsSummary(JobFair $fair): array
    {
        return [
            '1.6.1_fairs_conducted_local' => in_array($fair->sector, ['local', 'both'], true) ? 1 : 0,
            '1.6.2_fairs_conducted_overseas' => in_array($fair->sector, ['overseas', 'both'], true) ? 1 : 0,
            '1.6.3_total_fairs_conducted' => 1,
            '1.6.4_establishments_participated' => $fair->employerJoins()->count(),
            '1.6.5_job_vacancies_solicited' => JobFairVacancy::query()
                ->where('job_fair_id', $fair->job_fair_id)
                ->join('job_vacancies', 'job_fair_vacancies.vacancy_id', '=', 'job_vacancies.post_id')
                ->sum('job_vacancies.vacancies_count'),
            '1.6.6_job_applicants_registered' => $fair->attendees()->count(),
            '1.6.7_total_hots' => $fair->applications()->where('is_hots', true)->count(),
        ];
    }
}
