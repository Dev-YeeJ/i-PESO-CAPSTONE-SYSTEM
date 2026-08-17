<?php

namespace App\Services;

use App\Models\JobSeeker;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class VertexAiSuggestionService
{
    public function __construct(
        private readonly GoogleCloudAccessTokenService $tokens
    ) {}

    public function suggest(JobSeeker $seeker, array $context = []): array
    {
        if (! config('services.vertex_ai.enabled')) {
            throw new RuntimeException('AI suggestions are disabled.');
        }

        [$http, $url] = $this->resolveHttpClientAndEndpoint();

        $response = $http
            ->timeout((int) config('services.vertex_ai.timeout', 30))
            ->post($url, $this->payload($seeker, $context));

        if (! $response->successful()) {
            throw new RuntimeException('AI did not return suggestions.');
        }

        return $this->normalizeResponse($response->json());
    }

    public function generateProfessionalSummary(JobSeeker $seeker, ?string $existingSummary = null): array
    {
        if (! config('services.vertex_ai.enabled')) {
            throw new RuntimeException('AI summary generation is disabled.');
        }

        [$http, $url] = $this->resolveHttpClientAndEndpoint();

        $seeker->loadMissing([
            'occupations',
            'seekerSkills',
            'educations',
            'trainings',
            'eligibilities',
            'workExperiences',
            'languages',
            'certificates',
        ]);

        $decoded = [];
        $summary = '';
        for ($attempt = 0; $attempt < 2 && $summary === ''; $attempt++) {
            $response = $http
                ->timeout((int) config('services.vertex_ai.timeout', 30))
                ->post($url, $this->professionalSummaryPayload($seeker, $existingSummary));

            if (! $response->successful()) {
                \Illuminate\Support\Facades\Log::error('Gemini API Error: ' . $response->body());
                throw new RuntimeException('AI could not generate a professional summary.');
            }

            $decoded = $this->decodeStructuredResponse($response->json());
            $summary = Str::of((string) Arr::get($decoded, 'summary'))->squish()->limit(1200, '')->toString();
        }

        if ($summary === '') {
            throw new RuntimeException('AI returned an empty professional summary after retrying.');
        }

        return [
            'summary' => $summary,
            'highlights_used' => $this->professionalSummaryHighlights($seeker),
            'source' => 'gemini',
        ];
    }

    public function classifyOccupationTitleEnhanced(string $title, int $limit = 5): array
    {
        if (! config('services.vertex_ai.enabled')) {
            throw new RuntimeException('AI suggestions are disabled.');
        }

        [$http, $url] = $this->resolveHttpClientAndEndpoint();

        $response = $http
            ->timeout((int) config('services.vertex_ai.timeout', 30))
            ->post($url, $this->occupationClassificationEnhancedPayload($title, $limit));

        if (! $response->successful()) {
            throw new RuntimeException('AI did not return occupation classifications.');
        }

        return $this->normalizeOccupationClassificationEnhancedResponse($response->json());
    }

    public function classifyOccupationTitle(string $title, int $limit = 5): array
    {
        if (! config('services.vertex_ai.enabled')) {
            throw new RuntimeException('AI suggestions are disabled.');
        }

        [$http, $url] = $this->resolveHttpClientAndEndpoint();

        $response = $http
            ->timeout((int) config('services.vertex_ai.timeout', 30))
            ->post($url, $this->occupationClassificationPayload($title, $limit));

        if (! $response->successful()) {
            throw new RuntimeException('AI did not return occupation classifications.');
        }

        return $this->normalizeOccupationClassificationResponse($response->json(), $limit);
    }

    public function parseMapQuery(string $query): array
    {
        if (! config('services.vertex_ai.enabled')) {
            throw new RuntimeException('AI suggestions are disabled.');
        }

        [$http, $url] = $this->resolveHttpClientAndEndpoint();

        $response = $http
            ->timeout((int) config('services.vertex_ai.timeout', 15))
            ->post($url, $this->mapQueryPayload($query));

        if (! $response->successful()) {
            throw new RuntimeException('AI did not return a valid parsing result.');
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text');
        if (! is_string($text) || trim($text) === '') {
            return [];
        }

        $decoded = json_decode($text, true);
        return is_array($decoded) ? $decoded : [];
    }



    /**
     * Resolve an HTTP client + endpoint URL.
     * Priority:
     *   1. Gemini REST API (GOOGLE_GEMINI_API_KEY) — no GCP project needed
     *   2. Vertex AI with OAuth access token (ADC / configured token)
     */
    private function resolveHttpClientAndEndpoint(): array
    {
        $model = trim((string) config('services.vertex_ai.model', 'gemini-3.1-flash-lite'));
        $timeout = (int) config('services.vertex_ai.timeout', 30);

        // 1. Gemini REST API (just needs an API key)
        $apiKey = trim((string) config('services.vertex_ai.gemini_api_key'));
        if ($apiKey !== '') {
            $url = sprintf(
                'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
                rawurlencode($model),
                $apiKey
            );
            return [Http::acceptJson()->timeout($timeout), $url];
        }

        // 2. Vertex AI
        $projectId = trim((string) config('services.vertex_ai.project_id'));
        $location  = trim((string) config('services.vertex_ai.location', 'us-central1'));
        $accessToken = $this->tokens->token();

        if ($projectId === '' || $location === '' || ! $accessToken) {
            throw new RuntimeException(
                'AI is not configured. Add GOOGLE_GEMINI_API_KEY to your .env file to enable AI features. '
                .'Get a free key at https://aistudio.google.com/app/apikey'
            );
        }

        $url = $this->endpoint($projectId, $location, $model);
        return [Http::acceptJson()->withToken($accessToken)->timeout($timeout), $url];
    }

    private function endpoint(string $projectId, string $location, string $model): string
    {
        return sprintf(
            'https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:generateContent',
            $location,
            rawurlencode($projectId),
            rawurlencode($location),
            rawurlencode($model)
        );
    }

    private function payload(JobSeeker $seeker, array $context): array
    {
        return [
            'contents' => [[
                'role' => 'user',
                'parts' => [[
                    'text' => $this->prompt($seeker, $context),
                ]],
            ]],
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 3000,
                'responseMimeType' => 'application/json',
                'responseSchema' => $this->responseSchema(),
            ],
        ];
    }

    private function professionalSummaryPayload(JobSeeker $seeker, ?string $existingSummary): array
    {
        return [
            'contents' => [[
                'role' => 'user',
                'parts' => [[
                    'text' => $this->professionalSummaryPrompt($seeker, $existingSummary),
                ]],
            ]],
            'generationConfig' => [
                'temperature' => 0.65,
                'maxOutputTokens' => 4096,
                'responseMimeType' => 'application/json',
                'responseSchema' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'summary' => ['type' => 'STRING'],
                    ],
                    'required' => ['summary'],
                ],
            ],
        ];
    }

    private function professionalSummaryPrompt(JobSeeker $seeker, ?string $existingSummary): string
    {
        $profile = [
            'target_roles' => $seeker->occupations->map(fn ($item) => array_filter([
                'title' => Str::of((string) ($item->occupation_title ?? $item->raw_job_title ?? $item->preferred_occupation))->lower()->title()->toString(),
                'job_family' => $item->general_term,
            ]))->values()->all(),
            'employment_status' => $seeker->employment_status,
            'work_type_preference' => Str::of((string) $seeker->work_type_preference)->replace('_', ' ')->squish()->toString(),
            'preferred_work_location' => Str::of((string) $seeker->preferred_work_location)->replace('_', ' ')->squish()->toString(),
            'education_attainment' => $seeker->educ_attainment,
            'education' => $seeker->educations->map(fn ($item) => array_filter([
                'level' => $item->level,
                'program' => $item->course_strand,
                'status' => $item->completion_status,
                'institution' => $item->institution_name,
                'honors' => $item->academic_honors,
                'completed_courses' => $item->completed_courses,
            ]))->values()->all(),
            'skills' => $seeker->seekerSkills->map(fn ($item) => array_filter([
                'name' => $item->skill_name,
                'type' => $item->skill_type,
                'proficiency' => $item->proficiency,
            ]))->values()->all(),
            'work_experience' => $seeker->workExperiences->map(fn ($item) => array_filter([
                'position' => $item->position,
                'responsibilities' => $this->cleanText($item->responsibilities, 400),
                'months' => $item->number_of_months,
                'employment_type' => $item->employment_status,
                'currently_employed' => $item->currently_employed,
            ]))->values()->all(),
            'training' => $seeker->trainings->map(fn ($item) => array_filter([
                'course' => $item->course,
                'institution' => $item->training_institution,
                'hours' => $item->hours_of_training,
                'skills_acquired' => $item->skills_acquired,
                'certificate' => $item->certificates_received,
            ]))->values()->all(),
            'eligibilities' => $seeker->eligibilities->map(fn ($item) => array_filter([
                'type' => $item->type,
                'name' => $item->name,
            ]))->values()->all(),
            'languages' => $seeker->languages->map(fn ($item) => array_filter([
                'language' => $item->language_other ?: $item->language,
                'read' => $item->can_read,
                'write' => $item->can_write,
                'speak' => $item->can_speak,
                'understand' => $item->can_understand,
            ]))->values()->all(),
            'certificates' => $seeker->certificates->map(fn ($item) => array_filter([
                'title' => $item->title,
                'issuer' => $item->issuing_body,
                'category' => $item->category,
            ]))->values()->all(),
        ];

        return 'Write one employer-facing professional summary for a Philippine PESO job seeker. '
            .'Use 70 to 110 words in one concise paragraph. Base every claim only on the supplied profile. '
            .'Never invent achievements, metrics, years of experience, credentials, or personality traits. '
            .'Prioritize the strongest evidence in this order: relevant work responsibilities, target role, technical skills, education, training or eligibility, languages, and work preference. '
            .'If the seeker has work experience, lead with their role and demonstrated capabilities. If they have no work experience, lead with education, training, transferable skills, and readiness for the target role without calling them inexperienced. '
            .'Use specific profile facts naturally; do not turn the paragraph into a list and do not include private or demographic information. '
            .'Write in direct resume-summary voice without first-person pronouns and never refer to the seeker as "this individual", "he", "she", or "they". '
            .'Do not describe a language as fluent unless fluency is explicitly stated; describe only the recorded read, write, speak, or understand capabilities. '
            .'Avoid generic openings such as "Motivated job seeker" and clichés such as "hardworking individual". Vary the sentence structure and opening on every generation. '
            .'If an existing summary is supplied, produce a materially different version while retaining accurate facts. '
            .'Return only JSON matching the response schema. '
            .'Existing summary: '.json_encode($this->cleanText($existingSummary, 1200), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).'. '
            .'Verified profile: '.json_encode($profile, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function professionalSummaryHighlights(JobSeeker $seeker): array
    {
        return collect()
            ->merge($seeker->workExperiences->pluck('position'))
            ->merge($seeker->occupations->map(fn ($item) => $item->occupation_title ?? $item->raw_job_title ?? $item->preferred_occupation))
            ->push($seeker->educ_attainment)
            ->merge($seeker->educations->pluck('course_strand'))
            ->merge($seeker->seekerSkills->pluck('skill_name')->take(3))
            ->merge($seeker->trainings->pluck('course'))
            ->merge($seeker->eligibilities->pluck('name'))
            ->merge($seeker->certificates->pluck('title'))
            ->filter(fn ($item) => is_string($item) && trim($item) !== '')
            ->map(fn ($item) => Str::of($item)->replace('_', ' ')->squish()->toString())
            ->unique(fn ($item) => Str::lower($item))
            ->take(8)
            ->values()
            ->all();
    }

    private function occupationClassificationEnhancedPayload(string $title, int $limit): array
    {
        return [
            'contents' => [[
                'role' => 'user',
                'parts' => [[
                    'text' => $this->occupationClassificationEnhancedPrompt($title, $limit),
                ]],
            ]],
            'generationConfig' => [
                'temperature' => 0.1,
                'maxOutputTokens' => 2500,
                'responseMimeType' => 'application/json',
                'responseSchema' => $this->occupationClassificationEnhancedSchema(),
            ],
        ];
    }

    private function occupationClassificationPayload(string $title, int $limit): array
    {
        return [
            'contents' => [[
                'role' => 'user',
                'parts' => [[
                    'text' => $this->occupationClassificationPrompt($title, $limit),
                ]],
            ]],
            'generationConfig' => [
                'temperature' => 0.1,
                'maxOutputTokens' => 2500,
                'responseMimeType' => 'application/json',
                'responseSchema' => $this->occupationClassificationSchema(),
            ],
        ];
    }

    private function mapQueryPayload(string $query): array
    {
        return [
            'contents' => [[
                'role' => 'user',
                'parts' => [[
                    'text' => $this->mapQueryPrompt($query),
                ]],
            ]],
            'generationConfig' => [
                'temperature' => 0.0,
                'maxOutputTokens' => 200,
                'responseMimeType' => 'application/json',
                'responseSchema' => $this->mapQuerySchema(),
            ],
        ];
    }

    private function prompt(JobSeeker $seeker, array $context): string
    {
        $profile = [
            'employment_status' => $context['employment_status'] ?? $seeker->employment_status,
            'target_job_description' => $this->cleanText($context['target_job_description'] ?? null, 300),
            'work_type_preference' => $context['work_type_preference'] ?? $seeker->work_type_preference,
            'education_summary' => $context['educ_attainment'] ?? $seeker->educ_attainment,
            'preferred_occupations' => $this->names($context['preferred_occupations'] ?? []),
            'technical_skills' => $this->strings($context['technical_skills'] ?? []),
            'soft_skills' => $this->strings($context['soft_skills'] ?? []),
            'trainings' => $this->summaries($context['trainings'] ?? [], ['course', 'skills_acquired']),
            'work_experiences' => $this->summaries($context['work_experiences'] ?? [], ['position', 'employment_status']),
        ];

        return 'You assist a Philippine PESO job seeker completing an i-PESO onboarding form. '
            .'Suggest realistic entry-level or local job occupations and profile skills. '
            .'Do not invent credentials, licenses, honors, certificates, or completed trainings. '
            .'Use simple job seeker language. Return only JSON that matches the schema. '
            .'Occupation suggestions must be concise standardized job titles or search phrases that can be shown directly in a dropdown. '
            .'For vague, local, new, or informal titles, include several likely searchable variants and broad job-family phrases. '
            .'Prefer terms that may match PSOC titles, classification codes, ISCO groups, aliases, general terms, or external source mappings. '
            .'Avoid sentences, fake jobs, joke titles, and overly narrow company-specific wording. '
            .'Skill suggestions must be skills the seeker might reasonably claim based on the profile, not required skills they do not have. '
            .'Profile context: '.json_encode($profile, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function occupationClassificationEnhancedPrompt(string $title, int $limit): string
    {
        $groups = collect(config('job_preferences.generalized_groups', []))
            ->map(fn (array $group) => [
                'label' => $group['label'],
            ])
            ->values()
            ->all();

        return 'You classify Philippine PESO job seeker preferred job titles into specific structured suggestions. '
            .'The user may type local, informal, Tagalog, new, misspelled, platform-specific, freelance, or very specific job titles. '
            .'1. Determine if the input is a valid job. Mark is_valid_job_input = false for "any job", "kahit ano", "anything", "none", etc. '
            .'2. Determine if the input is too vague and needs clarification (e.g. "manager", "freelancer", "staff"). Mark needs_clarification = true if so. '
            .'3. Provide up to '.$limit.' specific occupation title suggestions. For each, determine the best matching broad_field from the allowed list, and the role_function. '
            .'Choose broad_field ONLY from the allowed broad job families list. Do not create new broad families. '
            .'Use confidence 90-100 only when the suggestion is a clear match for the input, 70-89 when likely, 45-69 when uncertain or just guessing a vague input. '
            .'Return only JSON that matches the schema. '
            .'Raw job title: '.json_encode($title, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).'. '
            .'Allowed broad job families: '.json_encode($groups, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function occupationClassificationPrompt(string $title, int $limit): string
    {
        $groups = collect(config('job_preferences.generalized_groups', []))
            ->map(fn (array $group) => [
                'general_term' => Str::of((string) $group['term'])->lower()->squish()->toString(),
                'label' => $group['label'],
                'keywords' => $group['keywords'] ?? '',
                'patterns' => $group['patterns'] ?? '',
            ])
            ->values()
            ->all();

        return 'You classify Philippine PESO job seeker preferred job titles into broad i-PESO job families. '
            .'The user may type local, informal, new, misspelled, platform-specific, freelance, or very specific job titles. '
            .'Choose only from the allowed broad job families. Do not create new broad families. '
            .'Prefer the broad field that best represents the actual work performed, not the company, schedule, seniority, or platform. '
            .'If ambiguous, return up to '.$limit.' likely broad fields ordered by confidence. '
            .'Use confidence 90-100 only when the work type is clear, 70-89 when likely, 45-69 when uncertain. '
            .'Return only JSON that matches the schema. '
            .'Raw job title: '.json_encode($title, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).'. '
            .'Allowed broad job families: '.json_encode($groups, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function mapQueryPrompt(string $query): string
    {
        return 'You are an AI assistant parsing natural language queries for a job map search filter. '
            .'Extract filter parameters from the user\'s query. '
            .'Available parameters: radius_km (int), min_match (int), keyword (string), location_keyword (string), sort (distance, match, newest, salary), hide_applied, saved_only, job_fair_only, upskill_recommended_only, certificate_match_only, can_apply_only (booleans), and max_missing_skills (int). '
            .'Example 1: "Show me welding jobs within 10km" -> {"radius_km": 10, "keyword": "welding"} '
            .'Example 2: "High match jobs" -> {"sort": "match", "min_match": 80} '
            .'Example 3: "Jobs with 50% match" -> {"min_match": 50} '
            .'Example 4: "Nearest jobs" -> {"sort": "distance"} '
            .'Example 5: "Hide jobs I applied to" -> {"hide_applied": true} '
            .'Example 6: "Jobs at job fairs with training" -> {"job_fair_only": true, "upskill_recommended_only": true} '
            .'If no radius is mentioned, leave it null. '
            .'If no keyword is found, leave it null. '
            .'User Query: '.json_encode($query, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function responseSchema(): array
    {
        $suggestion = [
            'type' => 'OBJECT',
            'properties' => [
                'name' => ['type' => 'STRING'],
                'reason' => ['type' => 'STRING'],
            ],
            'required' => ['name', 'reason'],
        ];

        return [
            'type' => 'OBJECT',
            'properties' => [
                'occupations' => [
                    'type' => 'ARRAY',
                    'items' => $suggestion,
                    'maxItems' => 5,
                ],
                'technical_skills' => [
                    'type' => 'ARRAY',
                    'items' => $suggestion,
                    'maxItems' => 8,
                ],
                'soft_skills' => [
                    'type' => 'ARRAY',
                    'items' => $suggestion,
                    'maxItems' => 6,
                ],
            ],
            'required' => ['occupations', 'technical_skills', 'soft_skills'],
        ];
    }

    private function occupationClassificationEnhancedSchema(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'is_valid_job_input' => ['type' => 'BOOLEAN'],
                'needs_clarification' => ['type' => 'BOOLEAN'],
                'suggestions' => [
                    'type' => 'ARRAY',
                    'items' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'occupation_title' => ['type' => 'STRING'],
                            'broad_field' => ['type' => 'STRING'],
                            'role_function' => ['type' => 'STRING'],
                            'confidence' => ['type' => 'INTEGER'],
                            'reason' => ['type' => 'STRING'],
                        ],
                        'required' => ['occupation_title', 'broad_field', 'role_function', 'confidence', 'reason'],
                    ],
                ],
            ],
            'required' => ['is_valid_job_input', 'needs_clarification', 'suggestions'],
        ];
    }

    private function occupationClassificationSchema(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'classifications' => [
                    'type' => 'ARRAY',
                    'maxItems' => 5,
                    'items' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'general_term' => ['type' => 'STRING'],
                            'label' => ['type' => 'STRING'],
                            'confidence' => ['type' => 'INTEGER'],
                            'reason' => ['type' => 'STRING'],
                        ],
                        'required' => ['general_term', 'label', 'confidence', 'reason'],
                    ],
                ],
            ],
            'required' => ['classifications'],
        ];
    }

    private function mapQuerySchema(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'radius_km' => ['type' => 'INTEGER', 'nullable' => true],
                'min_match' => ['type' => 'INTEGER', 'nullable' => true],
                'keyword' => ['type' => 'STRING', 'nullable' => true],
                'location_keyword' => ['type' => 'STRING', 'nullable' => true],
                'sort' => ['type' => 'STRING', 'nullable' => true],
                'hide_applied' => ['type' => 'BOOLEAN', 'nullable' => true],
                'saved_only' => ['type' => 'BOOLEAN', 'nullable' => true],
                'job_fair_only' => ['type' => 'BOOLEAN', 'nullable' => true],
                'upskill_recommended_only' => ['type' => 'BOOLEAN', 'nullable' => true],
                'certificate_match_only' => ['type' => 'BOOLEAN', 'nullable' => true],
                'can_apply_only' => ['type' => 'BOOLEAN', 'nullable' => true],
                'max_missing_skills' => ['type' => 'INTEGER', 'nullable' => true],
            ],
        ];
    }

    private function normalizeResponse(array $response): array
    {
        $text = data_get($response, 'candidates.0.content.parts.0.text');
        if (! is_string($text) || trim($text) === '') {
            return $this->emptySuggestions();
        }

        $decoded = json_decode($text, true);
        if (! is_array($decoded)) {
            return $this->emptySuggestions();
        }

        return [
            'occupations' => $this->cleanSuggestions($decoded['occupations'] ?? []),
            'technical_skills' => $this->cleanSuggestions($decoded['technical_skills'] ?? []),
            'soft_skills' => $this->cleanSuggestions($decoded['soft_skills'] ?? []),
        ];
    }

    private function decodeStructuredResponse(array $response): array
    {
        foreach (array_reverse((array) data_get($response, 'candidates.0.content.parts', [])) as $part) {
            $text = is_array($part) ? ($part['text'] ?? null) : null;
            if (! is_string($text) || trim($text) === '') {
                continue;
            }

            $decoded = json_decode(trim($text), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private function normalizeOccupationClassificationEnhancedResponse(array $response): array
    {
        $decoded = json_decode((string) data_get($response, 'candidates.0.content.parts.0.text'), true);

        if (! is_array($decoded)) {
            throw new RuntimeException('Vertex AI returned invalid JSON for occupation classification.');
        }

        $isValid = (bool) Arr::get($decoded, 'is_valid_job_input', true);
        $needsClarification = (bool) Arr::get($decoded, 'needs_clarification', false);
        $suggestions = Arr::get($decoded, 'suggestions', []);

        $allowedGroups = collect(config('job_preferences.generalized_groups', []));

        $normalizedSuggestions = collect($suggestions)->map(function ($item) use ($allowedGroups) {
            $broadField = Str::of((string) Arr::get($item, 'broad_field'))->squish()->toString();
            $group = $allowedGroups->first(fn ($g) => Str::lower($g['label']) === Str::lower($broadField));
            
            $generalTerm = $group['term'] ?? 'other';

            return [
                'occupation_title' => Str::of((string) Arr::get($item, 'occupation_title'))->title()->toString(),
                'broad_field' => $group['label'] ?? $broadField,
                'general_term' => $generalTerm,
                'role_function' => Str::of((string) Arr::get($item, 'role_function'))->title()->toString(),
                'confidence' => max(0, min(100, (int) Arr::get($item, 'confidence', 70))),
                'source' => 'ai',
                'reason' => Str::of((string) Arr::get($item, 'reason'))->squish()->limit(160, '')->toString(),
                'occupation_id' => null,
                'psoc_code' => null,
            ];
        })->filter(fn ($s) => !empty($s['occupation_title']))->values()->all();

        return [
            'is_valid_job_input' => $isValid,
            'needs_clarification' => $needsClarification,
            'suggestions' => $normalizedSuggestions,
        ];
    }

    private function normalizeOccupationClassificationResponse(array $response, int $limit): array
    {
        $text = data_get($response, 'candidates.0.content.parts.0.text');
        if (! is_string($text) || trim($text) === '') {
            return [];
        }

        $decoded = json_decode($text, true);
        if (! is_array($decoded)) {
            return [];
        }

        $allowed = collect(config('job_preferences.generalized_groups', []))
            ->mapWithKeys(function (array $group) {
                $term = Str::of((string) $group['term'])->lower()->squish()->toString();

                return [$term => [
                    'general_term' => $term,
                    'label' => $group['label'],
                ]];
            });

        return collect($decoded['classifications'] ?? [])
            ->map(function ($item) use ($allowed) {
                $term = Str::of((string) Arr::get($item, 'general_term'))->lower()->squish()->toString();
                $match = $allowed->get($term);

                if (! $match) {
                    $label = Str::of((string) Arr::get($item, 'label'))->lower()->squish()->toString();
                    $match = $allowed->first(fn (array $group) => Str::of($group['label'])->lower()->squish()->toString() === $label);
                }

                if (! $match) {
                    return null;
                }

                return [
                    'id' => 'ai-general:'.$match['general_term'],
                    'title' => $match['label'],
                    'general_term' => $match['general_term'],
                    'broad_category' => $match['label'],
                    'source' => 'vertex_ai',
                    'is_general' => true,
                    'is_ai_generated' => true,
                    'match_type' => 'ai_broad_field',
                    'confidence' => max(0, min(100, (int) Arr::get($item, 'confidence', 70))),
                    'reason' => Str::of((string) Arr::get($item, 'reason'))->squish()->limit(160, '')->toString(),
                ];
            })
            ->filter()
            ->unique('general_term')
            ->sortByDesc('confidence')
            ->take($limit)
            ->values()
            ->all();
    }

    private function cleanSuggestions(array $suggestions): array
    {
        return collect($suggestions)
            ->map(fn ($item) => [
                'name' => Str::of((string) Arr::get($item, 'name'))->squish()->limit(80, '')->toString(),
                'reason' => Str::of((string) Arr::get($item, 'reason'))->squish()->limit(140, '')->toString(),
            ])
            ->filter(fn ($item) => $item['name'] !== '')
            ->unique(fn ($item) => Str::lower($item['name']))
            ->values()
            ->all();
    }

    private function names(array $items): array
    {
        return collect($items)
            ->map(fn ($item) => is_array($item)
                ? ($item['title'] ?? $item['name'] ?? $item['general_term'] ?? null)
                : $item)
            ->filter()
            ->take(5)
            ->values()
            ->all();
    }

    private function strings(array $items): array
    {
        return collect($items)
            ->filter(fn ($item) => is_string($item) && trim($item) !== '')
            ->map(fn ($item) => Str::of($item)->squish()->limit(80, '')->toString())
            ->take(12)
            ->values()
            ->all();
    }

    private function summaries(array $items, array $fields): array
    {
        return collect($items)
            ->map(fn ($item) => collect($fields)
                ->map(fn ($field) => is_array($item) ? ($item[$field] ?? null) : null)
                ->filter()
                ->join(' - '))
            ->filter()
            ->take(5)
            ->values()
            ->all();
    }

    private function cleanText(mixed $value, int $limit): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $clean = Str::of($value)->squish()->limit($limit, '')->toString();

        return $clean === '' ? null : $clean;
    }

    private function emptySuggestions(): array
    {
        return [
            'occupations' => [],
            'technical_skills' => [],
            'soft_skills' => [],
        ];
    }
}
