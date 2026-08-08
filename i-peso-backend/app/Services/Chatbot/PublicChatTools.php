<?php

namespace App\Services\Chatbot;

use App\Models\CitizenCharterService;
use App\Models\GovernmentProgram;
use App\Models\JobFair;
use App\Models\JobVacancy;
use Illuminate\Support\Carbon;

/**
 * The four lookups the public assistant is allowed to perform.
 *
 * Every tool here reads ONLY data that is already public on the site — the
 * citizen's charter, published job postings, public job fairs, and open
 * programs. No tool touches a seeker profile, an application, or anything
 * else that would qualify as personal information under RA 10173, so nothing
 * sensitive can reach Google even in principle.
 *
 * Adding a tool that reads personal data would break that guarantee. Don't.
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
    public function declarations(): array
    {
        return [
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
    }

    /**
     * Dispatch a tool call by name.
     *
     * The name arrives from Gemini, so it is untrusted input — the match is
     * an explicit allowlist rather than a dynamic method call.
     */
    public function execute(string $name, array $args): array
    {
        return match ($name) {
            'search_citizen_charter' => $this->searchCitizenCharter((string) ($args['topic'] ?? '')),
            'search_job_vacancies' => $this->searchJobVacancies((string) ($args['keyword'] ?? '')),
            'list_job_fairs' => $this->listJobFairs(),
            'search_government_programs' => $this->searchGovernmentPrograms($args['keyword'] ?? null),
            default => ['error' => "Unknown lookup: {$name}"],
        };
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
        ];
    }

    private function searchJobVacancies(string $keyword): array
    {
        $query = JobVacancy::query()
            ->where('status', 'active')
            ->when($keyword !== '', fn ($builder) => $builder->where(
                fn ($inner) => $inner
                    ->where('job_title', 'like', "%{$keyword}%")
                    ->orWhere('general_term', 'like', "%{$keyword}%")
                    ->orWhere('job_description', 'like', "%{$keyword}%")
            ));

        $total = (clone $query)->count();

        $rows = $query->latest()->limit(self::MAX_ROWS)->get()->map(fn ($job) => [
            'job_title' => $job->job_title,
            'employment_type' => $job->employment_type,
            'work_setup' => $job->work_setup,
            'location' => $job->city_municipality ?: $job->location,
            'openings' => $job->vacancies_count,
            'experience_level' => $job->experience_level,
            'minimum_education' => $job->minimum_education,
            // Employers can opt out of showing pay. Honour that here — the
            // assistant must never surface a figure the employer hid.
            'salary' => $job->hide_salary
                ? 'Not disclosed by the employer'
                : $this->formatSalary($job->salary_min, $job->salary_max, $job->salary_type),
        ])->all();

        return [
            'total_matching' => $total,
            'showing' => count($rows),
            'vacancies' => $rows,
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
            ->where('program_status', 'open');

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
