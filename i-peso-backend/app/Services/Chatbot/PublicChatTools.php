<?php

namespace App\Services\Chatbot;

use App\Models\CitizenCharterService;
use App\Models\Employer;
use App\Models\GovernmentProgram;
use App\Models\JobFair;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use Illuminate\Foundation\Auth\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

/**
 * The four lookups the public assistant is allowed to perform.
 *
 * Public tools read published site data. Authenticated tools are deliberately
 * separate and receive the already-authenticated model from the controller;
 * every private query is scoped by that model's primary key and returns only
 * the minimum fields needed to answer a status question.
 */
class PublicChatTools
{
    /**
     * Rows returned per lookup. Kept small deliberately: every row is fed back
     * to Gemini as input tokens, and the free tier is quota-limited. The total
     * count is reported separately so the assistant can still say "12 found".
     */
    private const MAX_ROWS = 5;

    /**
     * Function declarations in Gemini's schema format.
     *
     * The descriptions matter more than they look. Gemini decides whether to
     * call a tool from the description alone, so each one states *when* to
     * call it, not just what it returns.
     */
    public function declarations(?User $user = null): array
    {
        $declarations = [
            [
                'name' => 'search_citizen_charter',
                'description' => 'Look up official PESO service procedures: what documents are '
                    . 'required, the steps involved, how long processing takes, and any fees. '
                    . 'Call this whenever the user asks what they need to prepare, how to register, '
                    . 'how long something takes, whether a service costs money, or where the office is.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'topic' => [
                            'type' => 'string',
                            'description' => 'Service or topic, e.g. "registration", "job fair", "employer verification".',
                        ],
                    ],
                    'required' => ['topic'],
                ],
            ],
            [
                'name' => 'search_job_vacancies',
                'description' => 'Search currently posted job vacancies. Call this whenever the user '
                    . 'asks whether there is work available, what jobs are open, or asks about a '
                    . 'specific trade or position such as welder, caregiver, driver, or call center agent.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'keyword' => [
                            'type' => 'string',
                            'description' => 'Job title, trade, or skill to search for.',
                        ],
                    ],
                    'required' => ['keyword'],
                ],
            ],
            [
                'name' => 'list_job_fairs',
                'description' => 'List upcoming public job fairs with their dates, venues, and '
                    . 'registration deadlines. Call this whenever the user asks about job fair '
                    . 'schedules, when the next event is, or where a job fair will be held.',
            ],
            [
                'name' => 'search_government_programs',
                'description' => 'Search open government livelihood, training, and employment '
                    . 'programs, including who is eligible and what documents are needed. Call this '
                    . 'whenever the user asks about programs, scholarships, training, or assistance '
                    . 'for a specific group such as PWD, 4Ps beneficiaries, OFWs, or fresh graduates.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'keyword' => [
                            'type' => 'string',
                            'description' => 'Program name or beneficiary group. Omit to list all open programs.',
                        ],
                    ],
                ],
            ],
        ];

        if ($user instanceof JobSeeker) {
            $declarations[] = [
                'name' => 'get_my_seeker_activity',
                'description' => 'For an authenticated job seeker only: look up their own job applications, interview schedules, government-program applications, and job-fair registrations. Call this for questions about their personal application status or what they should do next. Never ask for an ID because the logged-in session supplies it.',
            ];
        }

        if ($user instanceof Employer) {
            $declarations[] = [
                'name' => 'get_my_employer_workspace',
                'description' => 'For an authenticated employer only: look up the employer account verification status, own vacancy status and applicant counts, job-fair participation, and placement-report summary. Call this for questions about the employer dashboard or their own records. Never ask for an employer ID because the logged-in session supplies it.',
            ];
        }

        return $declarations;
    }

    /**
     * Dispatch a tool call by name.
     *
     * The name arrives from Gemini, so it is untrusted input — the match is
     * an explicit allowlist rather than a dynamic method call.
     */
    public function execute(string $name, array $args, ?User $user = null): array
    {
        $topic = $this->safeString($args['topic'] ?? null);
        $keyword = $this->safeString($args['keyword'] ?? null);

        return match ($name) {
            'search_citizen_charter' => $this->searchCitizenCharter($topic ?? ''),
            'search_job_vacancies' => $this->searchJobVacancies($keyword ?? '', $user),
            'list_job_fairs' => $this->listJobFairs(),
            'search_government_programs' => $this->searchGovernmentPrograms($keyword),
            'get_my_seeker_activity' => $user instanceof JobSeeker
                ? $this->mySeekerActivity($user)
                : ['error' => 'This private lookup is only available to the authenticated job seeker.'],
            'get_my_employer_workspace' => $user instanceof Employer
                ? $this->myEmployerWorkspace($user)
                : ['error' => 'This private lookup is only available to the authenticated employer.'],
            default => ['error' => "Unknown lookup: {$name}"],
        };
    }

    private function safeString(mixed $value): ?string
    {
        if ($value === null) return null;
        if (! is_string($value)) return '';

        return mb_substr(trim($value), 0, 100);
    }

    private function mySeekerActivity(JobSeeker $seeker): array
    {
        if (! Schema::hasTable('applications') || ! Schema::hasTable('program_applications')) {
            return ['error' => 'Personal activity is temporarily unavailable. Ask the user to check their dashboard.'];
        }

        $applications = $seeker->applications()
            ->with(['jobVacancy:post_id,job_title', 'interviewSchedule:apply_id,schedule,mode_of_interview,venue_or_link,status'])
            ->latest()
            ->limit(self::MAX_ROWS)
            ->get()
            ->map(fn ($application) => [
                'job' => $application->jobVacancy?->job_title ?? 'Job application',
                'status' => $application->status ?: 'submitted',
                'submitted_at' => optional($application->created_at)->toIso8601String(),
                'interview' => $application->interviewSchedule ? [
                    'schedule' => optional($application->interviewSchedule->schedule)->toIso8601String(),
                    'mode' => $application->interviewSchedule->mode_of_interview,
                    'venue_or_link' => $application->interviewSchedule->venue_or_link,
                    'status' => $application->interviewSchedule->status,
                ] : null,
            ])->values()->all();

        $programApplications = $seeker->programApplications()
            ->with('program:program_id,program_name')
            ->latest()
            ->limit(self::MAX_ROWS)
            ->get()
            ->map(fn ($application) => [
                'program' => $application->program?->program_name ?? 'Government program',
                'status' => $application->application_status ?: $application->status ?: 'pending',
                'submitted_at' => optional($application->created_at)->toIso8601String(),
            ])->values()->all();

        $fairRegistrations = Schema::hasTable('job_fair_attendees')
            ? $seeker->jobFairAttendances()->with('jobFair:job_fair_id,title,start_date,end_date')->latest()->limit(self::MAX_ROWS)->get()->map(fn ($registration) => [
                'job_fair' => $registration->jobFair?->title ?? 'Job fair',
                'starts' => optional($registration->jobFair?->start_date)->toDateString(),
                'checked_in' => (bool) $registration->is_attended,
            ])->values()->all()
            : [];

        return [
            'source' => 'Private i-PESO records for the authenticated seeker',
            'retrieved_at' => now()->toIso8601String(),
            'job_applications' => $applications,
            'government_program_applications' => $programApplications,
            'job_fair_registrations' => $fairRegistrations,
            'note' => 'These are status summaries only. The dashboard remains the source for submitting, withdrawing, or changing records.',
        ];
    }

    private function myEmployerWorkspace(Employer $employer): array
    {
        $vacancies = Schema::hasTable('job_vacancies')
            ? $employer->vacancies()->withCount('applications')->latest()->limit(self::MAX_ROWS)->get()->map(fn ($vacancy) => [
                'title' => $vacancy->job_title,
                'status' => $vacancy->status,
                'openings' => $vacancy->vacancies_count,
                'applicants' => $vacancy->applications_count,
            ])->values()->all()
            : [];

        $fairParticipation = Schema::hasTable('job_fair_employers')
            ? $employer->jobFairJoins()->with('jobFair:job_fair_id,title,start_date,end_date')->latest()->limit(self::MAX_ROWS)->get()->map(fn ($join) => [
                'job_fair' => $join->jobFair?->title ?? 'Job fair',
                'status' => $join->participation_status,
                'starts' => optional($join->jobFair?->start_date)->toDateString(),
            ])->values()->all()
            : [];

        $reports = Schema::hasTable('employer_reports')
            ? $employer->reports()->latest()->limit(self::MAX_ROWS)->get()->map(fn ($report) => [
                'period' => $report->reporting_period ?? $report->report_month ?? null,
                'status' => $report->status,
            ])->values()->all()
            : [];

        return [
            'source' => 'Private i-PESO records for the authenticated employer',
            'retrieved_at' => now()->toIso8601String(),
            'company' => $employer->company_name ?: $employer->trade_name,
            'verification_status' => $employer->verification_status,
            'vacancies' => $vacancies,
            'job_fair_participation' => $fairParticipation,
            'placement_reports' => $reports,
            'note' => 'These are status summaries only. The employer dashboard remains the source for editing records and submitting reports.',
        ];
    }

    private function searchCitizenCharter(string $topic): array
    {
        $base = CitizenCharterService::query()
            ->where('status', 'active')
            ->orderBy('display_order');

        $matches = (clone $base)
            ->when($topic !== '', fn ($query) => $query->where(
                fn ($inner) => $inner
                    ->where('service_name', 'like', "%{$topic}%")
                    ->orWhere('description', 'like', "%{$topic}%")
            ))
            ->limit(self::MAX_ROWS)
            ->get();

        // A miss is more useful than an empty array: hand back the menu of
        // services so the assistant can offer options instead of dead-ending.
        if ($matches->isEmpty()) {
            return [
                'matches' => [],
                'available_services' => $base->limit(15)->pluck('service_name'),
                'note' => 'No exact match. Offer the user the closest available service above.',
            ];
        }

        return [
            'matches' => $matches->map(fn ($service) => [
                'service' => $service->service_name,
                'description' => $service->description,
                'requirements' => $service->requirements,
                'steps' => $service->steps,
                'processing_time' => $service->processing_time,
                'fees' => $service->fees,
                'office' => $service->responsible_office,
                'contact' => $service->contact_info,
            ])->all(),
            'source' => 'Live i-PESO Citizen Charter records',
            'retrieved_at' => now()->toIso8601String(),
        ];
    }

    private function searchJobVacancies(string $keyword, ?User $user = null): array
    {
        $query = JobVacancy::query()
            ->where('status', 'active')
            ->with('employer:employer_id,company_name,trade_name')
            ->when($keyword !== '', fn ($builder) => $builder->where(
                fn ($inner) => $inner
                    ->where('job_title', 'like', "%{$keyword}%")
                    ->orWhere('general_term', 'like', "%{$keyword}%")
                    ->orWhere('job_description', 'like', "%{$keyword}%")
            ));

        $total = (clone $query)->count();

        $rows = $query->latest()->limit(self::MAX_ROWS)->get()->map(function ($job) use ($user) {
            $data = [
                'post_id' => $job->post_id,
                'employer_id' => $job->employer_id,
                'job_title' => $job->job_title,
                'employer' => $job->employer?->company_name ?: $job->employer?->trade_name,
                'employment_type' => $job->employment_type,
                'work_setup' => $job->work_setup,
                'location' => $job->city_municipality ?: $job->location,
                'latitude' => $job->latitude,
                'longitude' => $job->longitude,
                'openings' => $job->vacancies_count,
                'experience_level' => $job->experience_level,
                'minimum_education' => $job->minimum_education,
                'application_deadline' => optional($job->application_deadline)->toDateString(),
                'required_skills' => $job->required_skills,
                // Employers can opt out of showing pay. Honour that here — the
                // assistant must never surface a figure the employer hid.
                'salary' => $job->hide_salary
                    ? 'Not disclosed by the employer'
                    : $this->formatSalary($job->salary_min, $job->salary_max, $job->salary_type),
            ];

            if ($user instanceof JobSeeker) {
                try {
                    $matcher = app(\App\Services\EnhancedJobMatchingService::class);
                    $match = $matcher->calculateMatch($job, $user);
                    $data['match_percentage'] = $match['total_score'];
                    $data['match_factors'] = [
                        'skills' => $match['factors']['skills']['score'] ?? 0,
                        'experience' => $match['factors']['experience']['score'] ?? 0,
                        'education' => $match['factors']['education']['score'] ?? 0,
                        'occupation' => $match['factors']['occupation']['score'] ?? 0,
                    ];
                } catch (\Exception $e) {
                    // Matcher unavailable or failed, fail silently for chat response
                }
            }

            return $data;
        })->all();

        return [
            'total_matching' => $total,
            'showing' => count($rows),
            'vacancies' => $rows,
            'source' => 'Live public i-PESO vacancy records',
            'retrieved_at' => now()->toIso8601String(),
            'note' => $total > 0
                ? 'Applying requires a free i-PESO job seeker account. Invite the user to register.'
                : 'No current match. Suggest registering so they are notified when a matching job is posted.',
        ];
    }

    private function listJobFairs(): array
    {
        $today = Carbon::today();

        $fairs = JobFair::query()
            ->where('is_public', true)
            // 'published' is not a real status — the enum is upcoming /
            // ongoing / completed / cancelled. A public, not-yet-completed
            // fair is what "upcoming" means here.
            ->whereIn('status', ['upcoming', 'ongoing'])
            ->where(fn ($query) => $query
                ->whereDate('end_date', '>=', $today)
                ->orWhereDate('start_date', '>=', $today))
            ->orderBy('start_date')
            ->limit(self::MAX_ROWS)
            ->with('requirements')
            ->get()
            ->map(fn ($fair) => [
                'title' => $fair->title,
                'description' => $fair->description,
                'venue' => $fair->venue,
                'full_address' => collect([$fair->venue, $fair->specific_address, $fair->barangay, $fair->city_municipality, $fair->province])->filter()->unique()->join(', '),
                'target_audience' => $fair->target_sector ?: 'All job seekers',
                'starts' => optional($fair->start_date)->toDateString(),
                'ends' => optional($fair->end_date)->toDateString(),
                'time' => trim(($fair->start_time ?? '') . ' - ' . ($fair->end_time ?? ''), ' -'),
                'registration_deadline' => optional($fair->submission_deadline)->toDateString(),
                'contact' => $fair->contact_email,
                'what_to_bring' => $fair->requirements
                    ->sortBy('sort_order')
                    ->map(fn ($requirement) => $requirement->label
                        . ($requirement->is_required ? '' : ' (optional)'))
                    ->values(),
            ])->all();

        return [
            'upcoming_job_fairs' => $fairs,
            'source' => 'Live public i-PESO job-fair records',
            'retrieved_at' => now()->toIso8601String(),
            'note' => $fairs === []
                ? 'No job fair is scheduled right now. Suggest checking back or registering for notifications.'
                : 'Attendance is free. If what_to_bring is empty for a fair, say the requirements are '
                    . 'not posted yet rather than guessing what to bring. Invite the user to register '
                    . 'so they can pre-register for the fair.',
        ];
    }

    private function searchGovernmentPrograms(?string $keyword): array
    {
        $base = GovernmentProgram::query()
            ->where('visibility', 'public')
            ->where('program_status', 'open')
            ->where(fn ($query) => $query
                ->whereNull('application_deadline')
                ->orWhereDate('application_deadline', '>=', Carbon::today()))
            ->where(fn ($query) => $query->where('total_slots', 0)->orWhere('available_slots', '>', 0));

        $filtered = (clone $base)
            ->when($keyword, fn ($query, $term) => $query->where(
                fn ($inner) => $inner
                    ->where('program_name', 'like', "%{$term}%")
                    ->orWhere('short_description', 'like', "%{$term}%")
                    ->orWhere('target_beneficiaries', 'like', "%{$term}%")
            ))
            ->limit(self::MAX_ROWS)
            ->get();

        // A generic keyword ("programs", "tulong") matches no program *name*
        // and would otherwise read as "there are none" — which is false and,
        // on a government portal, the worst possible answer. The catalogue is
        // small, so fall back to showing it rather than reporting nothing.
        $programs = $filtered->isEmpty()
            ? $base->limit(self::MAX_ROWS)->get()
            : $filtered;

        $programs = $programs
            ->map(fn ($program) => [
                'program' => $program->program_name,
                'category' => $program->category,
                'summary' => $program->short_description,
                'who_can_apply' => $program->target_beneficiaries,
                'eligibility' => $program->eligibility_requirements,
                'documents_needed' => $program->required_documents,
                'schedule' => $program->schedule,
                'venue' => $program->venue,
                'deadline' => optional($program->application_deadline)->toDateString(),
                'slots_left' => $program->available_slots,
            ])->all();

        return [
            'programs' => $programs,
            'source' => 'Live public i-PESO program records accepting applications',
            'retrieved_at' => now()->toIso8601String(),
            'note' => $programs === []
                ? 'No open program matches. Suggest the user check back or ask about job vacancies instead.'
                : 'Applying requires a free i-PESO account. Invite the user to register.',
        ];
    }

    private function formatSalary(mixed $min, mixed $max, ?string $type): string
    {
        if (! $min && ! $max) {
            return 'Not specified';
        }

        $period = $type ? " per {$type}" : '';

        if ($min && $max) {
            return 'PHP ' . number_format((float) $min) . ' - ' . number_format((float) $max) . $period;
        }

        return 'PHP ' . number_format((float) ($min ?: $max)) . $period;
    }
}
