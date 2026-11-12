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
        'other',
    ];

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

    /**
     * Per-category defaults for the posting form.
     *
     * Category recommendations and scoring criteria come from one server-side
     * source. The form presents recommendations for administrator review and
     * generates scoring rules automatically; it does not expose weights or a
     * hand-authored rule editor.
     */
    public function presets(): JsonResponse
    {
        $presets = collect(config('government_program_presets', []))
            // Never offer a preset for a category the API would then reject.
            ->only(self::CATEGORIES)
            ->all();

        return response()->json(['presets' => $presets]);
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

        if ($request->is('api/admin/programs*')) {
            $legacyStatus = $request->input('status');
            $request->merge(array_filter([
                'category' => $request->input('category', $program ? null : 'other'),
                'total_slots' => $request->input('total_slots', $request->input('slot_limit')),
                'program_status' => $request->input('program_status', match ($legacyStatus) {
                    'completed' => 'completed',
                    'closed' => 'closed',
                    default => $program ? $program->program_status : 'open',
                }),
                'visibility' => $request->input('visibility', $program ? null : 'public'),
            ], fn ($value) => $value !== null));
        }

        // Government-program announcements are always public; visibility is
        // no longer an administrator-controlled posting option.
        $request->merge(['visibility' => 'public']);
        if (! $program && ! $request->filled('program_status')) {
            $request->merge(['program_status' => 'open']);
        }

        $data = $request->validate([
            'program_name' => [$program ? 'sometimes' : 'required', 'string', 'max:255'],
            'category' => [$program ? 'sometimes' : 'required', Rule::in(self::CATEGORIES)],
            'description' => [$program ? 'sometimes' : 'required', 'string', 'max:30000'],
            'eligibility_requirements' => ['nullable', 'array', 'max:50'],
            'eligibility_requirements.*' => ['string', 'max:1000'],
            'eligibility_rules' => ['prohibited'],
            'age_restriction_enabled' => ['sometimes', 'boolean'],
            'age_min' => ['nullable', 'integer', 'min:0', 'max:200'],
            'age_max' => ['nullable', 'integer', 'min:0', 'max:200'],
            'target_industry' => ['nullable', 'string', 'max:255'],
            'target_occupation_id' => ['nullable', 'integer', 'exists:occupations,id'],
            'location_address' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'application_deadline' => ['nullable', 'date', 'after_or_equal:today'],
            'total_slots' => [$program ? 'sometimes' : 'required', 'integer', 'min:0', 'max:100000'],
            'program_status' => ['nullable', Rule::in(['draft', 'open', 'closed', 'completed', 'archived'])],
            'visibility' => ['required', Rule::in(['public'])],
            'attachment' => ['nullable', 'file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
            'skills' => ['nullable', 'array', 'max:50'],
            'skills.*.skill_id' => ['nullable', 'integer', 'exists:skill_catalog_entries,id'],
            'skills.*.name' => ['required_with:skills', 'string', 'max:150'],
            'skills.*.type' => ['nullable', Rule::in(['taught', 'required', 'target'])],
        ]);

        $category = $data['category'] ?? $program?->category ?? 'other';
        $ageEnabledWasProvided = $request->exists('age_restriction_enabled');
        $ageEnabled = $ageEnabledWasProvided
            ? $request->boolean('age_restriction_enabled')
            : null;
        $ageMin = $request->input('age_min');
        $ageMax = $request->input('age_max');

        if ($ageEnabled === true && ($ageMin === null || $ageMax === null)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'age_min' => 'Enter both the minimum and maximum age.',
                'age_max' => 'Enter both the minimum and maximum age.',
            ]);
        }
        if ($ageEnabled === true && (int) $ageMin > (int) $ageMax) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'age_max' => 'Maximum age cannot be less than minimum age.',
            ]);
        }

        $presetRules = config("government_program_presets.{$category}.eligibility_rules", []);
        $rules = array_map(static function (array $rule): array {
            unset($rule['weight']);
            return $rule;
        }, array_values(array_filter($presetRules, 'is_array')));

        if ($ageEnabled === null && $program && $category === $program->category) {
            $existingAgeRule = collect($program->eligibility_rules ?? [])
                ->first(fn ($rule) => is_array($rule) && ($rule['field'] ?? null) === 'age');
            if ($existingAgeRule) {
                $ageEnabled = true;
                $ageMin = $existingAgeRule['min'] ?? null;
                $ageMax = $existingAgeRule['max'] ?? null;
            }
        }
        if ($ageEnabled === null) {
            $defaultAgeRule = collect($rules)->first(fn ($rule) => ($rule['field'] ?? null) === 'age');
            $ageEnabled = (bool) $defaultAgeRule;
            $ageMin = $defaultAgeRule['min'] ?? null;
            $ageMax = $defaultAgeRule['max'] ?? null;
        }

        if ($ageEnabled !== null) {
            $rules = array_values(array_filter($rules, fn ($rule) => ($rule['field'] ?? null) !== 'age'));
            if ($ageEnabled) {
                $rules[] = [
                    'field' => 'age',
                    'op' => 'between',
                    'min' => (int) $ageMin,
                    'max' => (int) $ageMax,
                    'label' => $this->ageRuleLabel((int) $ageMin, (int) $ageMax),
                    'required' => true,
                ];
            }
        }

        $requirements = array_values($data['eligibility_requirements'] ?? []);
        $legacyAgeRequirements = config("government_program_presets.{$category}.legacy_age_requirements", []);
        $requirements = array_values(array_filter(
            $requirements,
            static fn ($requirement) => (! is_array($requirement) || ($requirement['type'] ?? null) !== 'age_range')
                && ! in_array($requirement, $legacyAgeRequirements, true),
        ));
        if ($ageEnabled === true) {
            $requirements[] = [
                'type' => 'age_range',
                'min' => (int) $ageMin,
                'max' => (int) $ageMax,
                'label' => $this->ageRuleLabel((int) $ageMin, (int) $ageMax),
            ];
        }

        $data['eligibility_rules'] = $rules;
        $data['eligibility_requirements'] = $requirements;
        unset($data['age_restriction_enabled'], $data['age_min'], $data['age_max']);

        return $data;
    }

    private function ageRuleLabel(int $min, int $max): string
    {
        if ($max >= 200) {
            return "At least {$min} years old";
        }

        return $min === $max
            ? "Age {$min} years old"
            : "{$min} to {$max} years old";
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

    /**
     * Announces a newly opened program to the seekers its rules qualify.
     *
     * Notifications send synchronously — no queue worker runs on this
     * shared-hosting deployment (see GovernmentProgramNotification) — and
     * scoring every seeker against the rules is itself not cheap, so running
     * this inline held the admin's request open. set_time_limit(0) stopped PHP
     * cutting it off, but the browser still gave up around 30s and the host
     * returned a 504 while the send carried on unseen.
     *
     * defer() runs it after the response has been sent, so the admin gets the
     * posting back immediately and delivery continues server-side. Same fix
     * already applied to job fair publishing.
     */
    private function notifyRecommendedSeekers(
        GovernmentProgram $program,
        UpskillRecommendationService $recommendations,
    ): void {
        defer(function () use ($program, $recommendations) {
            set_time_limit(0);

            $recommendations->recipientsForProgram($program)->each(function ($seeker) use ($program) {
                try {
                    $seeker->notify(new GovernmentProgramNotification($program, 'recommendation_opened'));
                } catch (\Throwable $exception) {
                    // One unreachable seeker must not stop the announcement
                    // reaching everybody else — and nobody is watching this
                    // request any more, so it can only be reported.
                    report($exception);
                }
            });
        });
    }

    private function admin(Request $request): Administrator
    {
        /** @var Administrator $admin */
        $admin = $request->user();

        return $admin;
    }
}
