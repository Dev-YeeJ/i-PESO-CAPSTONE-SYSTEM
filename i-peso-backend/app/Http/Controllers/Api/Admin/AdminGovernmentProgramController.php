<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\FormatsGovernmentPrograms;
use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\GovernmentProgram;
use App\Notifications\GovernmentProgramNotification;
use App\Services\GovernmentProgramAnalyticsService;
use App\Services\SkillTaxonomyService;
use App\Services\UpskillRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminGovernmentProgramController extends Controller
{
    use FormatsGovernmentPrograms;

    private const CATEGORIES = [
        'job_fair',
        'spes',
        'tupad',
        'gip',
        'ofw_assistance',
        'livelihood_program',
        'tech_voc_training',
        'career_guidance',
        'citizen_charter',
        'other',
    ];

    private const RULE_FIELDS = [
        'age',
        'employment_status',
        'educ_attainment',
        'is_4ps_beneficiary',
        'is_ofw',
        'sex',
        'civil_status',
        'residency',
    ];

    private const RULE_OPS = ['between', 'gte', 'lte', 'in', 'equals', 'min_level'];

    public function index(Request $request): JsonResponse
    {
        $query = GovernmentProgram::query()
            ->with(['skills.skill', 'targetOccupation']);

        $query->when($request->string('search')->toString(), function ($query, $search) {
            $query->where(function ($nested) use ($search) {
                $nested->where('program_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('target_industry', 'like', "%{$search}%");
            });
        });
        $query->when($request->string('category')->toString(), fn ($query, $category) => $query->where('category', $category));
        $query->when($request->string('status')->toString(), fn ($query, $status) => $query->where('program_status', $status));
        $query->when($request->string('visibility')->toString(), fn ($query, $visibility) => $query->where('visibility', $visibility));
        $query->when($request->string('skill')->toString(), function ($query, $skill) {
            $query->whereHas('skills', fn ($skills) => $skills->where('skill_name', 'like', "%{$skill}%"));
        });

        $programs = $query->latest('program_id')->paginate($request->integer('per_page', 15));
        $programs->through(fn (GovernmentProgram $program) => $this->formatProgram($program));

        return response()->json($programs);
    }

    public function analytics(GovernmentProgramAnalyticsService $analytics): JsonResponse
    {
        return response()->json(['analytics' => $analytics->summary()]);
    }

    public function store(
        Request $request,
        SkillTaxonomyService $taxonomy,
        UpskillRecommendationService $recommendations,
    ): JsonResponse {
        $admin = $this->admin($request);
        $data = $this->validatedData($request);
        $skills = $data['skills'] ?? [];
        unset($data['skills']);

        $program = DB::transaction(function () use ($request, $admin, $data, $skills, $taxonomy) {
            $data['admin_id'] = $admin->admin_id;
            $data['slug'] = $this->uniqueSlug($data['program_name']);
            $data['available_slots'] = $data['total_slots'];
            $data['published_at'] = $data['program_status'] === 'open' ? now() : null;
            $data['attachment_path'] = $this->storeAttachment($request, null);

            $program = GovernmentProgram::create($data);
            $this->syncSkills($program, $skills, $taxonomy);

            return $program->fresh(['skills.skill', 'targetOccupation']);
        });

        if ($program->program_status === 'open') {
            $this->notifyRecommendedSeekers($program, $recommendations);
        }

        return response()->json([
            'message' => 'Government program created.',
            'program' => $this->formatProgram($program),
        ], 201);
    }

    public function show(GovernmentProgram $governmentProgram): JsonResponse
    {
        $governmentProgram->load(['skills.skill', 'targetOccupation']);

        return response()->json(['program' => $this->formatProgram($governmentProgram)]);
    }

    public function update(
        Request $request,
        GovernmentProgram $governmentProgram,
        SkillTaxonomyService $taxonomy,
        UpskillRecommendationService $recommendations,
    ): JsonResponse {
        $data = $this->validatedData($request, $governmentProgram);
        $skills = $data['skills'] ?? null;
        unset($data['skills']);
        $wasOpen = $governmentProgram->program_status === 'open';

        $program = DB::transaction(function () use ($request, $governmentProgram, $data, $skills, $taxonomy) {
            if (isset($data['program_name']) && $data['program_name'] !== $governmentProgram->program_name) {
                $data['slug'] = $this->uniqueSlug($data['program_name'], $governmentProgram->program_id);
            }
            if (($data['program_status'] ?? null) === 'open' && ! $governmentProgram->published_at) {
                $data['published_at'] = now();
            }
            if ($request->hasFile('attachment')) {
                $data['attachment_path'] = $this->storeAttachment($request, $governmentProgram->attachment_path);
            }

            if (isset($data['total_slots'])) {
                // Programs are announcements only -- nothing is booked through the
                // portal, so every slot stays available.
                $data['available_slots'] = (int) $data['total_slots'];
            }

            $governmentProgram->update($data);
            if (is_array($skills)) {
                $this->syncSkills($governmentProgram, $skills, $taxonomy);
            }

            return $governmentProgram->fresh(['skills.skill', 'targetOccupation']);
        });

        if (! $wasOpen && $program->program_status === 'open') {
            $this->notifyRecommendedSeekers($program, $recommendations);
        }

        return response()->json([
            'message' => 'Government program updated.',
            'program' => $this->formatProgram($program),
        ]);
    }

    public function destroy(GovernmentProgram $governmentProgram): JsonResponse
    {
        $governmentProgram->update([
            'program_status' => 'archived',
            'archived_at' => now(),
        ]);

        return response()->json(['message' => 'Government program archived.']);
    }

    public function attachment(GovernmentProgram $governmentProgram): StreamedResponse
    {
        abort_unless($governmentProgram->attachment_path, 404);
        abort_unless(Storage::disk('local')->exists($governmentProgram->attachment_path), 404);

        return Storage::disk('local')->download($governmentProgram->attachment_path);
    }

    private function validatedData(Request $request, ?GovernmentProgram $program = null): array
    {
        if ($request->filled('title') && ! $request->filled('program_name')) {
            $request->merge(['program_name' => $request->input('title')]);
        }

        // The rules builder posts eligibility_rules as a JSON string (nested arrays
        // don't survive multipart form encoding cleanly). Decode it before validating.
        if ($request->has('eligibility_rules') && is_string($request->input('eligibility_rules'))) {
            $decoded = json_decode($request->input('eligibility_rules'), true);
            $request->merge(['eligibility_rules' => is_array($decoded) ? $decoded : []]);
        }
        if ($request->is('api/admin/programs*')) {
            $legacyStatus = $request->input('status');
            $request->merge(array_filter([
                'category' => $request->input('category', $program ? null : 'other'),
                'total_slots' => $request->input('total_slots', $request->input('slot_limit')),
                'program_status' => $request->input('program_status', match ($legacyStatus) {
                    'completed' => 'completed',
                    'closed' => 'closed',
                    default => $legacyStatus ? 'open' : null,
                }),
                'visibility' => $request->input('visibility', $program ? null : 'public'),
                'start_date' => $request->input('start_date', $request->input('schedule')),
            ], fn ($value) => $value !== null));
        }

        return $request->validate([
            'program_name' => [$program ? 'sometimes' : 'required', 'string', 'max:255'],
            'category' => [$program ? 'sometimes' : 'required', Rule::in(self::CATEGORIES)],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description' => [$program ? 'sometimes' : 'required', 'string', 'max:30000'],
            'target_beneficiaries' => ['nullable', 'string', 'max:2000'],
            'eligibility_requirements' => ['nullable', 'array', 'max:50'],
            'eligibility_rules' => ['nullable', 'array', 'max:50'],
            'eligibility_rules.*.field' => ['required_with:eligibility_rules', 'string', Rule::in(self::RULE_FIELDS)],
            'eligibility_rules.*.op' => ['required_with:eligibility_rules', 'string', Rule::in(self::RULE_OPS)],
            'eligibility_rules.*.label' => ['nullable', 'string', 'max:200'],
            'eligibility_rules.*.weight' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'eligibility_rules.*.required' => ['nullable', 'boolean'],
            'eligibility_rules.*.min' => ['nullable', 'numeric'],
            'eligibility_rules.*.max' => ['nullable', 'numeric'],
            'eligibility_rules.*.value' => ['nullable'],
            'eligibility_rules.*.values' => ['nullable', 'array', 'max:20'],
            'eligibility_rules.*.values.*' => ['string', 'max:100'],
            'required_documents' => ['nullable', 'array', 'max:30'],
            'required_documents.*' => ['string', 'max:150'],
            'citizen_charter_steps' => ['nullable', 'array', 'max:30'],
            'citizen_charter_steps.*' => ['string', 'max:255'],
            'target_industry' => ['nullable', 'string', 'max:255'],
            'target_occupation_id' => ['nullable', 'integer', 'exists:occupations,id'],
            'venue' => ['nullable', 'string', 'max:255'],
            'location_address' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'application_deadline' => ['nullable', 'date'],
            'total_slots' => [$program ? 'sometimes' : 'required', 'integer', 'min:0', 'max:100000'],
            'program_status' => [$program ? 'sometimes' : 'required', Rule::in(['draft', 'open', 'closed', 'completed', 'archived'])],
            'visibility' => [$program ? 'sometimes' : 'required', Rule::in(['public', 'internal'])],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
            'skills' => ['nullable', 'array', 'max:50'],
            'skills.*.skill_id' => ['nullable', 'integer', 'exists:skill_catalog_entries,id'],
            'skills.*.name' => ['required_with:skills', 'string', 'max:150'],
            'skills.*.type' => ['nullable', Rule::in(['taught', 'required', 'target'])],
        ]);
    }

    private function syncSkills(GovernmentProgram $program, array $skills, SkillTaxonomyService $taxonomy): void
    {
        $program->skills()->delete();
        foreach ($skills as $entry) {
            $name = Str::squish((string) ($entry['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $skill = isset($entry['skill_id'])
                ? \App\Models\Skill::find($entry['skill_id'])
                : $taxonomy->resolve($name, 'technical');

            $program->skills()->create([
                'skill_id' => $skill?->id,
                'skill_name' => $skill?->name ?? $name,
                'type' => $entry['type'] ?? 'taught',
            ]);
        }
    }

    private function storeAttachment(Request $request, ?string $oldPath): ?string
    {
        if (! $request->hasFile('attachment')) {
            return $oldPath;
        }
        if ($oldPath) {
            Storage::disk('local')->delete($oldPath);
        }

        return $request->file('attachment')->store('government_programs/attachments', 'local');
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'program';
        $slug = $base;
        $counter = 2;
        while (GovernmentProgram::withTrashed()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->where('program_id', '!=', $ignoreId))
            ->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function notifyRecommendedSeekers(
        GovernmentProgram $program,
        UpskillRecommendationService $recommendations,
    ): void {
        $recommendations->recipientsForProgram($program)->each(
            fn ($seeker) => $seeker->notify(new GovernmentProgramNotification($program, 'recommendation_opened'))
        );
    }

    private function admin(Request $request): Administrator
    {
        /** @var Administrator $admin */
        $admin = $request->user();

        return $admin;
    }
}
