# Reviews Pages: Photos, Logos and Profile Links — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show real 2x2 photos and company logos on the employer "Feedback on your hires" tab and the seeker "Reviews" page, link names to profiles, and fix the UX issues from the review.

**Architecture:** Additive API fields (`has_photo`, `application_id`, employer `logo`) plus one gated photo route `GET /api/employer/hires/{seeker}/photo`. Frontend adds two small presentational components (`HireAvatar`, `CompanyLogo`), two pure helpers (`sortHires`, `groupActionsByCompany`), and reworks `HiresTab.jsx` and `MyReviewsPage.jsx`.

**Tech Stack:** Laravel 11 + PHPUnit (sqlite in-memory test tables from `tests/Concerns/CreatesFeedbackTables.php`); React 19 + Vite + Vitest + Testing Library, TanStack Query, Tailwind, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-25-reviews-pages-profiles-design.md`

## Global Constraints

- Full profile link only for hires with `source: application`; placement hires get the photo but no link, tagged "From placement report".
- Photo route: allowed only if this employer has a `hired` application on one of its vacancies for the seeker, or a linked row in a placement report with status `approved`; otherwise 404. Headers: `Content-Disposition: inline`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store, no-cache, must-revalidate`.
- API changes are additive only (mobile app untouched). Logo is sent raw (`company_logo` path) and resolved in the frontend with `companyLogoUrl()`.
- No change to feedback visibility, moderation or the 3-review threshold.
- Run frontend tests from `C:\` cwd in PowerShell (`Set-Location C:\Users\jaime\i-peso-capstone-system\i-peso-frontend`), never a lowercase `c:/` cwd.
- Copy: "From placement report", "Show details" / "Hide details", "How this works", "Comments are private — only PESO and the worker read them.", "Show all (n)".

## Review Focus

1. A seeker flagged `has_photo` whose file is missing on disk: route 404s, avatar must fall back to initials (no broken image) — test in Task 3.
2. A company logo URL that fails to load: `CompanyLogo` must fall back to the building icon — test in Task 3.
3. A placement record from a `pending` or `rejected` report must not unlock the photo — test in Task 1.
4. One company with several jobs, and more than 4 companies: one row per company, each job its own Review button, "Show all (n)" toggle — test in Task 3.
5. A hire with no start date and no feedback must sort with the "waiting" group (it's ratable), not with "opens later" — test in Task 3.

---

### Task 1: Backend — hire photo route and hire payload fields

**Files:**
- Modify: `i-peso-backend/tests/Concerns/CreatesFeedbackTables.php` (add nullable `profile_image` to `job_seekers`, nullable `company_logo` to `employers`)
- Modify: `i-peso-backend/app/Http/Controllers/Api/EmployerFeedbackController.php` (`hireView`, new `hirePhoto`)
- Modify: `i-peso-backend/routes/api.php:144` (next to `/hires`)
- Test: `i-peso-backend/tests/Feature/EmployerFeedbackTest.php`

**Interfaces:**
- Produces: each item of `GET /api/employer/hires` → `hires[]` gains `has_photo: bool`, `application_id: int|null` (= `source_id` when `source === 'application'`).
- Produces: `GET /api/employer/hires/{seeker}/photo` → image stream or 404.

- [ ] **Step 1: Write the failing tests**

```php
public function test_hires_say_whether_a_photo_exists_and_which_application_they_came_from(): void
// hired application seeker with profile_image 'seeker_profile_images/1/a.jpg'; approved placement seeker without
// assert application hire: has_photo true, application_id === source_id
// assert placement hire: has_photo false, application_id null

public function test_employers_can_load_the_photo_of_anyone_they_hired(): void
// Storage::fake('local'); put 'seeker_profile_images/x.jpg'
// hired-application seeker → 200, header Content-Disposition 'inline', Cache-Control contains 'no-store'
// approved-placement seeker → 200

public function test_the_hire_photo_is_not_available_for_people_they_did_not_hire(): void
// seeker with photo + 'reviewed' application → 404
// seeker with photo on a 'pending' placement report → 404
// seeker hired by another employer → 404
// hired seeker whose profile_image file is missing → 404
```

- [ ] **Step 2: Run to verify they fail**

Run (in `i-peso-backend`): `php artisan test --filter=EmployerFeedbackTest`
Expected: the 3 new tests FAIL (missing keys / route 404 on allowed cases).

- [ ] **Step 3: Implement**
  - `hireView`: add `'has_photo' => filled($seeker->profile_image)` and `'application_id' => $source === 'application' ? $id : null`.
  - `public function hirePhoto(Request $request, int $seeker): StreamedResponse` — resolve employer via `$this->employer($request)`; check `Application::where('status','hired')->where('seeker_id',$seeker)->whereHas('jobVacancy', employer_id)` OR `PlacementRecord::where('employer_id',…)->where('seeker_id',$seeker)->whereHas('upload', status approved)`; `abort_unless(..., 404)`; then stream exactly like `EmployerApplicationController::seekerProfileImage` (local-then-public disk lookup, same headers).
  - Route: `Route::get('/hires/{seeker}/photo', [EmployerFeedbackController::class, 'hirePhoto'])->whereNumber('seeker');`

- [ ] **Step 4: Run to verify they pass**

Run: `php artisan test --filter=EmployerFeedbackTest`
Expected: all PASS.

- [ ] **Step 5: Commit** — `feat(reviews): hire photo route and photo/application fields on hires`

---

### Task 2: Backend — employer logo in seeker review payloads

**Files:**
- Modify: `i-peso-backend/app/Services/Feedback/FeedbackEligibility.php:51`
- Modify: `i-peso-backend/app/Services/Feedback/WorkerFeedbackVisibility.php:28`
- Modify: `i-peso-backend/app/Http/Controllers/Api/SeekerReviewController.php:186` (`ownReview`)
- Test: `i-peso-backend/tests/Feature/EmployerFeedbackTest.php`

**Interfaces:**
- Produces: in `GET /api/seeker/reviews`, `opportunities[].employer`, `employer_feedback[].employer`, `reviews[].employer` each become `{ id, name, logo: string|null }`.

- [ ] **Step 1: Write the failing test** `test_the_seeker_reviews_page_gets_each_employers_logo` — set `company_logo = 'company_logos/rice.png'` on the employer; seeker with a `reviewed` application, one review, one worker feedback; assert `opportunities.0.employer.logo`, `employer_feedback.0.employer.logo`, `reviews.0.employer.logo` all equal `'company_logos/rice.png'`.
- [ ] **Step 2: Run** `php artisan test --filter=test_the_seeker_reviews_page_gets_each_employers_logo` → FAIL (missing key).
- [ ] **Step 3: Implement** — add `'logo' => $employer->company_logo` (or `$review->employer?->company_logo` / `$feedback->employer?->company_logo`) to the three `employer` arrays. Ensure `ownReview`'s caller eager-loads `employer` (check `index`).
- [ ] **Step 4: Run** `php artisan test --filter=EmployerFeedbackTest` → all PASS; also `php artisan test --filter=Review` → PASS.
- [ ] **Step 5: Commit** — `feat(reviews): send employer logo on the seeker reviews page`

---

### Task 3: Frontend — shared pieces (avatar, logo, helpers)

**Files:**
- Create: `i-peso-frontend/src/pages/employer/reviews/HireAvatar.jsx`
- Create: `i-peso-frontend/src/components/reviews/CompanyLogo.jsx`
- Create: `i-peso-frontend/src/pages/employer/reviews/sortHires.js`
- Modify: `i-peso-frontend/src/services/employerFeedbackService.js` (add `getHirePhoto`)
- Modify: `i-peso-frontend/src/utils/reviews.js` (`openActions` adds `employerId`, `employerLogo`; new `groupActionsByCompany`)
- Test: `i-peso-frontend/src/pages/employer/reviews/__tests__/hiresUi.test.jsx`, `i-peso-frontend/src/utils/__tests__/reviews.test.js`, `i-peso-frontend/src/components/reviews/__tests__/CompanyLogo.test.jsx`

**Interfaces:**
- Produces: `employerFeedbackService.getHirePhoto(seekerId: number): Promise<Blob>` — `GET /employer/hires/{seekerId}/photo`, `responseType: 'blob'`.
- Produces: `<HireAvatar seekerId name hasPhoto size="md|lg" />` — blob fetch when `hasPhoto`, revokes object URL on unmount, initials gradient (existing `GRADIENTS`/`initials` moved here) on no photo or fetch error.
- Produces: `<CompanyLogo logo name size="sm|md" />` — `<img src={companyLogoUrl(logo)}>` with `onError` → `Building2` tile; no logo → `Building2` tile.
- Produces: `sortHires(hires): hires[]` — groups in order: ratable without feedback (`can_give_feedback && !feedback`), then not yet open (`!can_give_feedback && !feedback`), then rated; stable within group.
- Produces: `groupActionsByCompany(actions): { employerId, employerName, employerLogo, jobs: action[] }[]` — first-seen order.

- [ ] **Step 1: Write the failing tests**
  - `sortHires`: input `[rated, laterStart, waiting, noStartDateNoFeedback(can_give_feedback: true)]` → ids `[waiting, noStartDate, laterStart, rated]`.
  - `groupActionsByCompany`: two GreenCycle actions + one IchiTech → 2 groups, GreenCycle `jobs.length === 2`, order preserved.
  - `openActions` maps `employer.id`/`employer.logo` → `employerId`/`employerLogo`.
  - `HireAvatar`: `getHirePhoto` rejects → renders initials "LM" and no `img`; `hasPhoto: false` → service never called.
  - `CompanyLogo`: fire `error` on the img → building fallback shown (`data-testid="company-logo-fallback"`).
- [ ] **Step 2: Run** `npx vitest run src/pages/employer/reviews src/utils/__tests__/reviews.test.js src/components/reviews` → FAIL.
- [ ] **Step 3: Implement** the five units above.
- [ ] **Step 4: Run** same command → PASS.
- [ ] **Step 5: Commit** — `feat(reviews): hire avatar, company logo and grouping helpers`

---

### Task 4: Frontend — employer "Feedback on your hires" tab

**Files:**
- Modify: `i-peso-frontend/src/pages/employer/reviews/HiresTab.jsx`
- Test: `i-peso-frontend/src/pages/employer/reviews/__tests__/HiresTab.test.jsx`

**Interfaces:**
- Consumes: `HireAvatar`, `sortHires`, hire fields `has_photo`, `application_id`, `feedback.ratings`, `feedback.comment`, `feedback.updated_at`, `data.aspects`.

- [ ] **Step 1: Write the failing tests** (mock `employerFeedbackService`, render in `MemoryRouter` + `QueryClientProvider`):
  - application hire's name is a link to `/employer/ats/applicant/12`; placement hire's name is not a link and shows "From placement report".
  - cards render in `sortHires` order (assert headings order).
  - rated card: "Show details" reveals the four aspect labels with values and the comment; button then reads "Hide details".
  - banner shows "Comments are private — only PESO and the worker read them."; full text appears only after clicking "How this works".
- [ ] **Step 2: Run** `npx vitest run src/pages/employer/reviews/__tests__/HiresTab.test.jsx` → FAIL.
- [ ] **Step 3: Implement** — swap the initials span for `HireAvatar size="md"`; wrap name in `<Link>` when `application_id`; tag for placements; `visible = sortHires(filtered)`; per-card `useState` details toggle showing a 2-col aspect grid (label from `data.aspects`, `Stars` + value) and the comment in a quote block, plus "Updated {date}"; one-line banner with a disclosure button (`aria-expanded`).
- [ ] **Step 4: Run** same → PASS; `npx eslint src/pages/employer/reviews` → clean.
- [ ] **Step 5: Commit** — `feat(reviews): photos, profile links, details and ordering on hires tab`

---

### Task 5: Frontend — seeker Reviews page

**Files:**
- Modify: `i-peso-frontend/src/pages/seeker/MyReviewsPage.jsx`
- Test: `i-peso-frontend/src/pages/seeker/__tests__/MyReviewsPage.test.jsx`

**Interfaces:**
- Consumes: `CompanyLogo`, `groupActionsByCompany`, `employer.logo`, `employer_feedback[].updated_at`, `ratings[].value`, `would_rehire` (label "Yes" / "Maybe" / "No").

- [ ] **Step 1: Write the failing tests** (mock `reviewService.getMine`):
  - Ready to review: 2 GreenCycle jobs + 1 IchiTech → 2 company rows, 3 "Review" buttons; company name links to `/seeker/employers/{id}`.
  - 6 companies → 4 rows visible and a "Show all (6)" button; clicking shows 6.
  - Employer feedback: shows overall `4.0` for ratings 3,3,5,5; rehire pill text "Maybe"; the "Think something here is unfair" note appears exactly once with 2 feedback items.
  - Your reviews: company name links to the employer page.
- [ ] **Step 2: Run** `npx vitest run src/pages/seeker/__tests__/MyReviewsPage.test.jsx` → FAIL.
- [ ] **Step 3: Implement** — ready section: white card with `border-l-4 border-brand-gold`, grouped rows (CompanyLogo + linked name; jobs listed beneath each with `Button size="sm" icon={Star}` "Review"), show 4 then toggle. Feedback cards: header row (CompanyLogo, linked name, job title, `updated_at` date), overall average + rehire pill (Yes `emerald`, Maybe `amber`, No `slate`), compact aspect grid, comment as quote; single unfair-note after the list. Your reviews: CompanyLogo + linked name.
- [ ] **Step 4: Run** same → PASS; `npx eslint src/pages/seeker/MyReviewsPage.jsx` → clean.
- [ ] **Step 5: Commit** — `feat(reviews): logos, company links and grouped list on seeker reviews`

---

### Task 6: Verify the whole change

- [ ] **Step 1:** `php artisan test --filter="Feedback|Review"` (in `i-peso-backend`) → all PASS.
- [ ] **Step 2:** `npx vitest run src/pages/employer src/pages/seeker src/utils src/components/reviews` (from `C:\…\i-peso-frontend`) → all PASS.
- [ ] **Step 3:** `npx eslint` on every changed frontend file → no new errors; `npm run build` → succeeds.
- [ ] **Step 4:** Report results; push only when the user asks.
