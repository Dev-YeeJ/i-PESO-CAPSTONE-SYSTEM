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
            throw new RuntimeException('Vertex AI suggestions are disabled.');
        }

        $projectId = trim((string) config('services.vertex_ai.project_id'));
        $location = trim((string) config('services.vertex_ai.location', 'us-central1'));
        $model = trim((string) config('services.vertex_ai.model', 'gemini-2.5-flash'));
        $accessToken = $this->tokens->token();

        if ($projectId === '' || $location === '' || $model === '' || ! $accessToken) {
            throw new RuntimeException('Vertex AI is not fully configured.');
        }

        $response = Http::acceptJson()
            ->withToken($accessToken)
            ->timeout((int) config('services.vertex_ai.timeout', 20))
            ->post($this->endpoint($projectId, $location, $model), $this->payload($seeker, $context));

        if (! $response->successful()) {
            throw new RuntimeException('Vertex AI did not return suggestions.');
        }

        return $this->normalizeResponse($response->json());
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
                'maxOutputTokens' => 900,
                'responseMimeType' => 'application/json',
                'responseSchema' => $this->responseSchema(),
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
