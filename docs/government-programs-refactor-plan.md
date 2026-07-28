# Government Programs Refactor + Eligibility Matching — Implementation Plan

> Hand-off design doc. Covers: (1) remove **Upskill Hub**, (2) turn **Government Programs** into an admin-managed announcement board with **structured DOLE requirements**, (3) add a **seeker eligibility & score-matching** algorithm with a clear match breakdown.

---

## 0. Critical context — read before touching anything

**"Upskill Hub" is not a separate module — it is the seeker/employer *view* of the existing `government_programs` table**, plus three extras: skill recommendations, employer "upskill needs" (`employer_skill_demands`), and "recommend a program to an applicant". Removing Upskill Hub means removing those **extras and the branding**, keeping the program core, and re-surfacing programs to seekers as a plain **Government Programs** board with eligibility.

**Your DB already scaffolds most of this — reuse it, don't recreate:**
- `government_programs` already has: `eligibility_requirements` (JSON), `required_documents` (JSON), `category`, `slug`, `short_description`, `start_date`/`end_date`/`application_deadline`, `total_slots`/`available_slots`, `program_status`, `visibility`, `published_at`, `contact_*`, `attachment_path`, soft deletes.
  - Migration: `2026_06_28_000001_expand_government_programs_for_upskill_hub.php`
- `program_applications` already has: `application_status`, **`eligibility_score`** (unsignedTinyInteger 0–100), **`eligibility_snapshot`** (JSON), `reviewed_by_admin_id`, `reviewed_at`.
- `job_seekers` already has the matchable fields: `date_of_birth`, `sex`, `civil_status`, `educ_attainment`, **`employment_status`** (`employed`/`unemployed`), `employment_type`, **`is_4ps_beneficiary`**, `is_ofw`, `is_former_ofw`, `address_barangay`/`_municipality_city`/`_province`.
  - Migration: `2026_05_30_100000_create_comprehensive_seeker_profile.php`

**Backend map** (`i-peso-backend/routes/api.php`):
- Admin: `AdminGovernmentProgramController`, `AdminGovernmentProgramApplicationController` — **keep & extend**.
- Seeker: `SeekerUpskillHubController` (hub/recommended/citizen-charter/show/attachment), `SeekerGovernmentProgramApplicationController` (apply/index/documents).
- Extras to remove: `SkillRecommendationController`, `EmployerUpskillNeedController` (+ `employer_skill_demands`), `EmployerGovernmentProgramController` (recommend-applicant).

**Frontend map** (`i-peso-frontend/src`):
- Seeker: `pages/seeker/UpskillHubPage.jsx`, `RecommendedPrograms.jsx`, `ProgramDetailsPage.jsx`, `MyProgramApplications.jsx`.
- Employer: `pages/employer/EmployerProgramsPage.jsx`, `EmployerUpskillNeedsPage.jsx`, `EmployerUpskillNeedForm.jsx`.
- Admin: `pages/admin/4-government-dole/government-programs/{GovernmentProgramsListPage,GovernmentProgramFormPage,ProgramApplicantsPage}.jsx`.
- Shared: `components/government-programs/{ProgramCard.jsx,programConstants.js}`, `services/governmentProgramService.js`.

---

## Part 1 — Remove the Upskill Hub module

Do this **after** Parts 2–4 land, so the seeker still has a programs page to land on.

### Backend
1. **`routes/api.php`** — delete these route groups (keep the plain program + application routes):
   - `/upskill-hub/programs`, `/upskill-hub/recommend-applicant` (employer)
   - `/upskill-needs` (all verbs)
   - `/skill-recommendations`, `/skill-gap-analysis`, `/learning-resources/{skill}`
   - seeker `/upskill-hub`, `/upskill-hub/recommended` → **replace** with `/government-programs` (list) using the new controller in Part 4. Keep `/government-programs/{id}`, `/apply`, `/government-program-applications`.
   - `/citizen-charter` → keep or drop (it's independent; recommend keep — it's a real PESO feature).
2. **Controllers** — delete `SkillRecommendationController`, `EmployerUpskillNeedController`, `EmployerGovernmentProgramController`. Split `SeekerUpskillHubController` → move `show`/`attachment`/list into a new `SeekerGovernmentProgramController` (Part 4); delete the `recommended`/skill parts.
3. **Models / tables** — new migration to `dropIfExists('employer_skill_demands')` and drop the FK `job_vacancies.hard_to_find_skills`/`training_needed`/`accepts_trainees` if unused. Delete `EmployerSkillDemand` model. (Leave `government_program_skills` — reusable as "skills taught".)
4. Remove references in `AdminAnalyticsController`/dashboards to `employer_skill_demands`, skill recommendations.

### Frontend
1. **Delete pages:** `seeker/UpskillHubPage.jsx`, `seeker/RecommendedPrograms.jsx`, `employer/EmployerProgramsPage.jsx`, `employer/EmployerUpskillNeedsPage.jsx`, `employer/EmployerUpskillNeedForm.jsx`. (Keep `MyProgramApplications.jsx` and `ProgramDetailsPage.jsx` — they become the Government Programs seeker views.)
2. **`router/index.jsx`** — remove `/seeker/upskill-hub`, `/seeker/upskill-hub/recommended`, and the employer upskill-needs/programs routes. Add `/seeker/government-programs` (list) + keep `/seeker/government-programs/:id` (rename from upskill-hub/:id). **grep the router for `upskill` to catch every path.**
3. **Navigation** — remove "Upskill Hub" / "Upskill Needs" items in `layouts/SeekerLayout.jsx`, `layouts/EmployerLayout.jsx`, and any admin nav; rename the seeker item to "Government Programs".
4. **`services/governmentProgramService.js`** — delete `seekerHub`, `recommendedPrograms`, `employerPrograms`, `employerNeeds`, `createEmployerNeed`, `recommendApplicant`, skill-recommendation calls; add `listSeekerPrograms`, `getSeekerProgram` (Part 6).
5. **grep sweep:** `grep -rin "upskill\|skill-recommendation\|skill.demand" i-peso-frontend/src` and clean every hit.

---

## Part 2 — Government Programs as an admin announcement board

The admin CRUD + publish already exists (`AdminGovernmentProgramController`, `program_status`, `published_at`, `visibility`). The **only real addition** is capturing **structured eligibility rules** instead of the current free-form `eligibility_requirements` string list.

**Design decision:** add a **new** typed column `eligibility_rules` (JSON) rather than overloading the existing free-form `eligibility_requirements` (keep the latter for human-readable prose shown to seekers). The admin form writes both: a rules array (for matching) + optional prose (for display).

Admin form (`GovernmentProgramFormPage.jsx`) gains a **"Eligibility rules" builder**: repeatable rows of `{ field, operator, value(s), weight, required }`, plus the existing free-text requirements and documents. See the rule schema in Part 4.

---

## Part 3 — Real-world DOLE program requirements (research)

> ⚠️ Exact thresholds (age, grades, income, days) **change per DOLE Department Order / regional issuance and year**. Ship these as **admin-editable defaults / seeder templates**, and tell the PESO admin to confirm against the current DOLE guidelines. Below are the standard national parameters.

| Program | Age | Education | Employment status | Poverty / income | Other | Maps to seeker field |
|---|---|---|---|---|---|---|
| **SPES** (RA 7323 as amended by RA 10917) | **15–30** | Currently enrolled student **or** out-of-school youth (OSY) intending to enroll | Not regularly employed | Parents' combined income ≤ regional poverty threshold (poverty-targeted); passing general average last term | Summer/short-term work | `date_of_birth`, `educ_attainment`, `employment_status`, `is_4ps_beneficiary` |
| **TUPAD** | **18+** | None required | Underemployed / self-employed with lost income / unemployed / **displaced** worker | Disadvantaged/marginalized household (4Ps prioritized) | 10–90 days community work; typically 1 member/household | `date_of_birth`, `employment_status`, `is_4ps_beneficiary` |
| **GIP** (Government Internship Program) | **18–30** | At least **high school graduate**; college students/grads for some posts | Not regularly employed | From poor/low-income families | 3–6 months internship in a govt office | `date_of_birth`, `educ_attainment`, `employment_status`, `is_4ps_beneficiary` |
| **DOLE-AKAP for OFWs** (Abot-Kamay ang Pagtulong) | 18+ | None | — | Distressed/displaced OFW | Must be an **OFW / former OFW** (documented or undocumented) | `is_ofw`, `is_former_ofw`, `former_ofw_return_date` |
| **DILP / Kabuhayan** (livelihood) | 18+ | None | Self-employed / unpaid family worker / marginalized | Disadvantaged household | Livelihood grant/starter kit | `employment_status`, `employment_type`, `is_4ps_beneficiary` |

> Note: "DOLE-AKAP" (OFW assistance) is distinct from the DSWD "AKAP" (Ayuda para sa Kapos ang Kita). Because the seeker schema already has `is_ofw`/`is_former_ofw`, model AKAP as the **OFW** program.

Ship these as a **`GovernmentProgramTemplateSeeder`** producing one program per template with pre-filled `eligibility_rules`.

---

## Part 4 — Eligibility & Score-Matching Algorithm

### 4a. Rule schema (`government_programs.eligibility_rules` JSON)
Each program stores an array of typed rules:
```jsonc
[
  { "field": "age",               "op": "between", "min": 15, "max": 30, "label": "Age 15–30 years old",        "weight": 2, "required": true },
  { "field": "employment_status", "op": "in",      "values": ["unemployed"],                 "label": "Currently unemployed", "weight": 2, "required": true },
  { "field": "educ_attainment",   "op": "min_level","value": "high_school_graduate",          "label": "At least high school graduate", "weight": 1, "required": false },
  { "field": "is_4ps_beneficiary","op": "equals",  "value": true,                             "label": "4Ps / low-income household",   "weight": 1, "required": false },
  { "field": "residency",         "op": "equals",  "value": "Urdaneta City",                  "label": "Resident of Urdaneta City",    "weight": 1, "required": false }
]
```
Supported `op`: `between` (age/number), `gte`/`lte`, `in` (enum), `equals` (bool/string), `min_level` (education ranking).

### 4b. Scoring model
- **Required rules gate eligibility.** If any `required` rule fails → **status = `not_eligible`**, regardless of score.
- **Score** = `round( sum(weight of met rules) / sum(weight of all rules) * 100 )`.
- **Status** (only when all required rules pass):
  - `100` → **Highly Eligible**
  - `60–99` → **Partially Eligible**
  - `< 60` → **Low Match** (still "eligible to apply" but weak)
- Each rule contributes a **breakdown item** `{ label, met, detail }` for the "why".

### 4c. Backend service — `app/Services/EligibilityMatchingService.php`
```php
<?php

namespace App\Services;

use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use Carbon\Carbon;

class EligibilityMatchingService
{
    // Ranking used by the "min_level" education operator (low → high).
    private const EDUCATION_RANK = [
        'elementary_undergraduate' => 1, 'elementary_graduate' => 2,
        'high_school_undergraduate' => 3, 'high_school_graduate' => 4,
        'senior_high_graduate' => 5, 'vocational' => 6,
        'college_undergraduate' => 7, 'college_graduate' => 8, 'post_graduate' => 9,
    ];

    /** @return array{score:int,status:string,label:string,breakdown:array} */
    public function evaluate(JobSeeker $seeker, GovernmentProgram $program): array
    {
        $rules = $program->eligibility_rules ?? [];
        if (empty($rules)) {
            return ['score' => 100, 'status' => 'eligible', 'label' => 'Eligible', 'breakdown' => []];
        }

        $totalWeight = 0; $metWeight = 0; $requiredFailed = false; $breakdown = [];

        foreach ($rules as $rule) {
            $weight = (float) ($rule['weight'] ?? 1);
            $totalWeight += $weight;
            [$met, $detail] = $this->checkRule($seeker, $rule);
            if ($met) { $metWeight += $weight; }
            if (! $met && ($rule['required'] ?? false)) { $requiredFailed = true; }

            $breakdown[] = [
                'label'    => $rule['label'] ?? $rule['field'],
                'met'      => $met,
                'required' => (bool) ($rule['required'] ?? false),
                'detail'   => $detail,
            ];
        }

        $score = $totalWeight > 0 ? (int) round($metWeight / $totalWeight * 100) : 100;

        if ($requiredFailed) {
            return ['score' => $score, 'status' => 'not_eligible', 'label' => 'Not Eligible', 'breakdown' => $breakdown];
        }
        if ($score >= 100) { $status = 'highly_eligible'; $label = 'Highly Eligible'; }
        elseif ($score >= 60) { $status = 'partially_eligible'; $label = 'Partially Eligible'; }
        else { $status = 'low_match'; $label = 'Low Match'; }

        return compact('score', 'status', 'label', 'breakdown');
    }

    /** @return array{0:bool,1:?string} [met, human detail] */
    private function checkRule(JobSeeker $seeker, array $rule): array
    {
        $field = $rule['field'] ?? null;

        switch ($field) {
            case 'age':
                $age = $seeker->date_of_birth ? Carbon::parse($seeker->date_of_birth)->age : null;
                if ($age === null) return [false, 'No birth date on file'];
                $min = $rule['min'] ?? 0; $max = $rule['max'] ?? 200;
                return [$age >= $min && $age <= $max, "Your age: {$age}"];

            case 'employment_status':
                $val = $seeker->employment_status;
                return [in_array($val, $rule['values'] ?? []), 'Status: '.($val ?? 'not set')];

            case 'educ_attainment':
                $have = self::EDUCATION_RANK[$seeker->educ_attainment] ?? 0;
                $need = self::EDUCATION_RANK[$rule['value']] ?? 0;
                return [$have >= $need, 'Your attainment: '.($seeker->educ_attainment ?? 'not set')];

            case 'is_4ps_beneficiary':
                return [(bool) $seeker->is_4ps_beneficiary === (bool) $rule['value'],
                        $seeker->is_4ps_beneficiary ? '4Ps member' : 'Not a 4Ps member'];

            case 'is_ofw':
                $isOfw = $seeker->is_ofw || $seeker->is_former_ofw;
                return [$isOfw === (bool) $rule['value'], $isOfw ? 'OFW / former OFW' : 'Not an OFW'];

            case 'sex':
                return [$seeker->sex === $rule['value'], 'Sex: '.($seeker->sex ?? 'not set')];

            case 'residency':
                return [strcasecmp((string) $seeker->address_municipality_city, (string) $rule['value']) === 0,
                        'City: '.($seeker->address_municipality_city ?? 'not set')];

            default:
                return [false, null];
        }
    }
}
```

### 4d. Where it runs
- **Seeker program list** (`SeekerGovernmentProgramController@index`): for each published program, call `evaluate($seeker, $program)` and attach `eligibility` to the payload (cache per request; it's cheap).
- **Seeker program detail** (`@show`): attach full `breakdown`.
- **At apply time** (`SeekerGovernmentProgramApplicationController@apply`): persist the result into the existing `program_applications.eligibility_score` + `eligibility_snapshot` columns (snapshot = the breakdown JSON) so the admin sees the applicant's eligibility as it was when they applied.

Controller sketch:
```php
// SeekerGovernmentProgramController@index
$seeker = $request->user()->jobSeeker;   // adjust to your auth relation
$programs = GovernmentProgram::query()
    ->where('program_status', 'open')->where('visibility', 'public')
    ->whereNotNull('published_at')
    ->orderByDesc('published_at')->paginate(15)
    ->through(function ($program) use ($seeker, $svc) {
        $program->eligibility = $svc->evaluate($seeker, $program); // {score,status,label,breakdown}
        return $program;
    });
```
Add `protected $casts = ['eligibility_rules' => 'array', 'eligibility_requirements' => 'array', 'required_documents' => 'array'];` to `GovernmentProgram`.

---

## Part 5 — Database schema updates

One migration. Everything else is **reuse**.

```php
// database/migrations/xxxx_add_eligibility_rules_to_government_programs.php
public function up(): void
{
    Schema::table('government_programs', function (Blueprint $t) {
        // Typed rules for the matching engine (free-form eligibility_requirements stays for display).
        $t->json('eligibility_rules')->nullable()->after('eligibility_requirements');
    });

    // OPTIONAL — only if you want explicit income matching beyond the 4Ps flag:
    Schema::table('job_seekers', function (Blueprint $t) {
        $t->enum('income_bracket', [
            'below_poverty', 'low', 'lower_middle', 'middle', 'upper',
        ])->nullable()->after('is_4ps_beneficiary');
    });
}
```
- `program_applications.eligibility_score` / `eligibility_snapshot` — **already exist**, just start writing to them.
- **Recommendation:** use `is_4ps_beneficiary` as the primary poverty signal (matches real DOLE targeting). Add `income_bracket` only if the PESO office wants finer income rules; then add an `income_bracket` `op` to the service.

---

## Part 6 — React snippets (seeker view)

### `EligibilityBadge.jsx`
```jsx
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from 'lucide-react'

const MAP = {
  highly_eligible:   { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  partially_eligible:{ cls: 'border-amber-200 bg-amber-50 text-amber-700',       Icon: AlertTriangle },
  low_match:         { cls: 'border-slate-200 bg-slate-100 text-slate-600',      Icon: MinusCircle },
  not_eligible:      { cls: 'border-red-200 bg-red-50 text-red-700',             Icon: XCircle },
  eligible:          { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
}

export default function EligibilityBadge({ eligibility }) {
  if (!eligibility) return null
  const { status, label, score } = eligibility
  const { cls, Icon } = MAP[status] ?? MAP.low_match
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}{status !== 'not_eligible' && ` · ${score}%`}
    </span>
  )
}
```

### `EligibilityBreakdown.jsx` (the "why")
```jsx
import { Check, X } from 'lucide-react'

export default function EligibilityBreakdown({ eligibility }) {
  const items = eligibility?.breakdown ?? []
  if (!items.length) return null
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-black text-slate-950">Why you matched</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              it.met ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {it.met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {it.label}{it.required && !it.met && <span className="ml-1 text-xs font-bold text-red-600">(required)</span>}
              </p>
              {it.detail && <p className="text-xs text-slate-500">{it.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Usage
- **List** (`SeekerGovernmentProgramsPage`): render `<EligibilityBadge eligibility={program.eligibility} />` on each `ProgramCard`; optionally sort "Highly Eligible" first.
- **Detail** (`ProgramDetailsPage`): show `<EligibilityBadge>` in the header + `<EligibilityBreakdown eligibility={program.eligibility} />` in the sidebar; **disable the Apply button** when `status === 'not_eligible'` (or warn, since some offices still allow applying). Reuse the existing `Dialog` confirm on apply.

---

## Part 7 — Execution order (do it in this sequence)
1. **Migration** — add `eligibility_rules` (+ optional `income_bracket`); `php artisan migrate`.
2. **Model casts** — `GovernmentProgram`: cast the JSON columns.
3. **Service** — `EligibilityMatchingService` (+ a Pest/PHPUnit test with a few profiles).
4. **Seeder** — `GovernmentProgramTemplateSeeder` with SPES/TUPAD/GIP/AKAP rules.
5. **Admin form** — rules builder in `GovernmentProgramFormPage.jsx` + validation in `AdminGovernmentProgramController@store/update`.
6. **Seeker endpoints** — new `SeekerGovernmentProgramController` attaching `eligibility`; write `eligibility_score`/`eligibility_snapshot` on apply.
7. **Seeker UI** — new `SeekerGovernmentProgramsPage`, wire `EligibilityBadge`/`EligibilityBreakdown` into card + detail.
8. **Remove Upskill Hub** (Part 1) — routes, controllers, `employer_skill_demands`, frontend pages/nav/service; grep-sweep `upskill`.
9. **Regression** — run backend tests + `npm run build` + click through admin create → seeker list/detail → apply.

## Verification
- **Admin:** create a "SPES 2026" program with rules (age 15–30, unemployed, ≥HS grad, 4Ps) → publish.
- **Seeker A** (age 22, unemployed, HS grad, 4Ps=yes) → **Highly Eligible 100%**, all ✅.
- **Seeker B** (age 40, employed) → **Not Eligible**, age + employment ❌ (required).
- **Seeker C** (age 20, unemployed, HS grad, 4Ps=no) → **Partially Eligible ~85%**, 4Ps ❌ (not required).
- Apply as A → `program_applications.eligibility_score = 100`, `eligibility_snapshot` holds the breakdown; admin applicants view shows it.
- `grep -rin "upskill" i-peso-backend/app i-peso-backend/routes i-peso-frontend/src` returns **nothing**.
