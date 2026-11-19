<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Application;
use App\Models\Employer;
use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Record search behind the ⌘K palette in each portal's top bar.
 *
 * Every portal only ever sees records it could already open elsewhere:
 * staff by module permission, employers only their own vacancies and the
 * people who applied to them, seekers only open listings. Each group returns
 * at most a handful of hits; the palette is for jumping, not browsing.
 *
 * Response: { groups: [{ key, heading, items: [{ type, id, title, subtitle }] }] }
 */
class GlobalSearchController extends Controller
{
    private const PER_GROUP = 5;

    public function admin(Request $request): JsonResponse
    {
        $admin = $request->user();
        abort_unless($admin instanceof Administrator, 403);
        $terms = $this->terms($request);

        $groups = [];

        if ($admin->hasModule('constituent_crm')) {
            $seekers = JobSeeker::query()
                ->where(fn (Builder $q) => $this->matchAllTerms($q, $terms, ['first_name', 'last_name', 'email']))
                ->orderBy('last_name')
                ->limit(self::PER_GROUP)
                ->get(['seeker_id', 'first_name', 'last_name', 'email', 'address_municipality_city']);

            $groups[] = $this->group('seekers', 'Job seekers', $seekers->map(fn (JobSeeker $s) => [
                'type' => 'seeker',
                'id' => $s->seeker_id,
                'title' => trim("{$s->first_name} {$s->last_name}") ?: $s->email,
                'subtitle' => collect([$s->email, $s->address_municipality_city])->filter()->implode(', '),
            ]));

            $employers = Employer::query()
                ->where(fn (Builder $q) => $this->matchAllTerms($q, $terms, ['company_name', 'trade_name', 'email']))
                ->orderBy('company_name')
                ->limit(self::PER_GROUP)
                ->get(['employer_id', 'company_name', 'trade_name', 'email', 'verification_status']);

            $groups[] = $this->group('employers', 'Employers', $employers->map(fn (Employer $e) => [
                'type' => 'employer',
                'id' => $e->employer_id,
                'title' => $e->trade_name ?: $e->company_name ?: $e->email,
                'subtitle' => collect([$e->trade_name && $e->company_name !== $e->trade_name ? $e->company_name : null, $this->statusLabel($e->verification_status)])->filter()->implode(', '),
            ]));
        }

        if ($admin->hasModule('employment_hub')) {
            $vacancies = JobVacancy::query()
                ->with('employer:employer_id,company_name,trade_name')
                ->where(fn (Builder $q) => $this->matchAllTerms($q, $terms, ['job_title', 'general_term']))
                ->latest()
                ->limit(self::PER_GROUP)
                ->get(['post_id', 'employer_id', 'job_title', 'status']);

            $groups[] = $this->group('vacancies', 'Job postings', $vacancies->map(fn (JobVacancy $v) => [
                'type' => 'vacancy',
                'id' => $v->post_id,
                'title' => $v->job_title,
                'subtitle' => collect([$v->employer?->trade_name ?: $v->employer?->company_name, $this->statusLabel($v->status)])->filter()->implode(', '),
            ]));
        }

        return $this->respond($groups);
    }

    public function employer(Request $request): JsonResponse
    {
        $employer = $request->user();
        abort_unless($employer instanceof Employer, 403);
        $terms = $this->terms($request);

        $vacancies = JobVacancy::query()
            ->where('employer_id', $employer->employer_id)
            ->where(fn (Builder $q) => $this->matchAllTerms($q, $terms, ['job_title', 'general_term']))
            ->withCount('applications')
            ->latest()
            ->limit(self::PER_GROUP)
            ->get(['post_id', 'job_title', 'status']);

        $applicants = Application::query()
            ->whereHas('jobVacancy', fn (Builder $v) => $v->where('employer_id', $employer->employer_id))
            ->whereHas('jobSeeker', fn (Builder $s) => $this->matchAllTerms($s, $terms, ['first_name', 'last_name']))
            ->with(['jobSeeker:seeker_id,first_name,last_name', 'jobVacancy:post_id,job_title'])
            ->latest()
            ->limit(self::PER_GROUP)
            ->get(['apply_id', 'post_id', 'seeker_id', 'status']);

        return $this->respond([
            $this->group('vacancies', 'Your vacancies', $vacancies->map(fn (JobVacancy $v) => [
                'type' => 'vacancy',
                'id' => $v->post_id,
                'title' => $v->job_title,
                'subtitle' => sprintf('%s, %d %s', $this->statusLabel($v->status), $v->applications_count, $v->applications_count === 1 ? 'applicant' : 'applicants'),
            ])),
            $this->group('applicants', 'Applicants', $applicants->map(fn (Application $a) => [
                'type' => 'applicant',
                'id' => $a->apply_id,
                'title' => trim("{$a->jobSeeker?->first_name} {$a->jobSeeker?->last_name}"),
                'subtitle' => collect([$a->jobVacancy?->job_title, $this->statusLabel($a->status)])->filter()->implode(', '),
            ])),
        ]);
    }

    public function seeker(Request $request): JsonResponse
    {
        abort_unless($request->user() instanceof JobSeeker, 403);
        $terms = $this->terms($request);

        $jobs = JobVacancy::query()
            ->where('status', 'active')
            ->whereNull('admin_hold_at')
            ->where(fn (Builder $q) => $q->whereNull('application_deadline')->orWhereDate('application_deadline', '>=', today()))
            ->whereHas('employer', fn (Builder $e) => $e->where('verification_status', 'verified'))
            ->where(function (Builder $q) use ($terms) {
                foreach ($terms as $term) {
                    $q->where(fn (Builder $one) => $one
                        ->where('job_title', 'like', $term)
                        ->orWhere('general_term', 'like', $term)
                        ->orWhereHas('employer', fn (Builder $e) => $e->where('company_name', 'like', $term)->orWhere('trade_name', 'like', $term)));
                }
            })
            ->with('employer:employer_id,company_name,trade_name')
            ->latest()
            ->limit(self::PER_GROUP)
            ->get(['post_id', 'employer_id', 'job_title', 'barangay', 'city_municipality']);

        $programs = GovernmentProgram::query()
            ->where('visibility', 'public')
            ->whereNotIn('program_status', ['draft', 'archived'])
            ->where(fn (Builder $q) => $this->matchAllTerms($q, $terms, ['program_name', 'target_industry']))
            ->orderByRaw("CASE program_status WHEN 'open' THEN 0 ELSE 1 END")
            ->limit(self::PER_GROUP)
            ->get(['program_id', 'program_name', 'program_status', 'category']);

        return $this->respond([
            $this->group('jobs', 'Open jobs', $jobs->map(fn (JobVacancy $j) => [
                'type' => 'job',
                'id' => $j->post_id,
                'title' => $j->job_title,
                'subtitle' => collect([$j->employer?->trade_name ?: $j->employer?->company_name, $j->barangay, $j->city_municipality])->filter()->implode(', '),
            ])),
            $this->group('programs', 'Government programs', $programs->map(fn (GovernmentProgram $p) => [
                'type' => 'program',
                'id' => $p->getKey(),
                'title' => $p->program_name,
                'subtitle' => collect([$p->category, $this->statusLabel($p->program_status)])->filter()->implode(', '),
            ])),
        ]);
    }

    /**
     * Each word becomes its own LIKE pattern, so "ana santos" finds Ana Santos
     * without database-specific CONCAT. Wildcards typed by the user are escaped.
     *
     * @return list<string>
     */
    private function terms(Request $request): array
    {
        $validated = $request->validate(['q' => ['required', 'string', 'min:2', 'max:80']]);

        return collect(preg_split('/\s+/', trim($validated['q'])))
            ->filter(fn ($word) => $word !== '')
            ->take(4)
            ->map(fn ($word) => '%'.str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $word).'%')
            ->values()
            ->all();
    }

    /** Every term must match at least one of the columns. */
    private function matchAllTerms(Builder $query, array $terms, array $columns): void
    {
        foreach ($terms as $term) {
            $query->where(function (Builder $one) use ($term, $columns) {
                foreach ($columns as $column) {
                    $one->orWhere($column, 'like', $term);
                }
            });
        }
    }

    private function group(string $key, string $heading, $items): array
    {
        return ['key' => $key, 'heading' => $heading, 'items' => collect($items)->values()->all()];
    }

    private function respond(array $groups): JsonResponse
    {
        return response()->json(['groups' => array_values(array_filter($groups, fn ($g) => $g['items'] !== []))]);
    }

    private function statusLabel(?string $status): ?string
    {
        return $status ? ucfirst(str_replace('_', ' ', $status)) : null;
    }
}
