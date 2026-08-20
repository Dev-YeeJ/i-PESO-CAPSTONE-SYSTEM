# i-PESO Mobile — Job Seeker Feature Parity Build Prompt

## Mission

Bring `i-peso-mobile` (the React Native/Expo app) to full feature, flow, and logic parity with the job-seeker experience in `i-peso-frontend` (the web app), against the exact same Laravel backend (`i-peso-backend`). Every registration step, validation rule, screen, and business rule that exists for a job seeker on web must exist and behave identically on mobile — same fields, same validation, same API calls, same edge cases. Where the web app has a bug or an inconsistency, match it deliberately (noted below) rather than silently "fixing" it into a divergent behavior, unless a section below explicitly says to fix it.

This is not a rebuild. `i-peso-mobile` already has a working, fairly complete implementation — auth, 7-step onboarding, dashboard, job search/apply, applications, full profile, notifications, job fairs (read-only), program applications, citizen charter. Read the "Current State" section below before writing any code, and only build what's actually missing or broken.

**Do not start any other stack.** The existing app is Expo (managed workflow, SDK 54) + Expo Router (file-based routing) + TanStack Query v5 + Zustand + Axios + expo-secure-store, styled with plain `StyleSheet` against a hand-rolled token system in `theme/`. Continue in that exact stack. Where new capability is genuinely needed (a map, a QR renderer), use the React Native library called out in this doc — don't introduce a competing pattern (no new state library, no new form library, no UI kit, no CSS-in-JS).

---

## 1. Current State — what already exists in `i-peso-mobile` (verified, working)

Tech stack confirmed: `expo ~54.0.33`, `expo-router ~6.0.23`, `@tanstack/react-query ^5.101.2`, `zustand ^5.0.12`, `axios ^1.15.2`, `expo-secure-store ~15.0.8` (token storage, key `ipeso_token`), `expo-image`/`expo-image-picker`/`expo-document-picker`/`expo-file-system`/`expo-sharing` for media, `@expo-google-fonts/dm-sans` + `@expo-google-fonts/dm-serif-display`.

Working end to end, do not rebuild:
- **Auth**: register (seeker-only), OTP email verification, login (with role-gate rejecting non-seekers client-side), forgot/reset password, session persistence + auto-login via `authStore.initializeAuth()` reading `/auth/me` on boot, logout.
- **Onboarding**: all 7 NSRP steps (`app/onboarding.tsx` + `components/onboarding/Steps.tsx`), geocoding + PSGC resolution on the address step, re-entrant editing via `(seeker)/profile/edit.tsx` reusing the same step components.
- **Dashboard** (`(seeker)/index.tsx`): profile strength, next-best-action, quick stats, feed-mode job list (Recommended/Nearby/Latest).
- **Job search/browse** (`(seeker)/jobs.tsx`, `jobs/[id].tsx`): filters, sort, infinite scroll, save, apply, skill-gap modal.
- **Applications** (`(seeker)/applications.tsx`, `applications/[id].tsx`): list, detail, withdraw.
- **Profile** (`(seeker)/profile.tsx`, `profile/edit.tsx`): photo upload, resume generation/share, certificates, AI summary, analytics.
- **Notifications, job fairs (read-only), program applications, citizen charter.**

Route protection matches web: unauthenticated → `/login`; authenticated but `profile_completed: false` → `/onboarding`.

---

## 2. Gap list — build or fix these, in priority order

### 2a. Fix first — breaking bug
**Government Programs / Upskill Hub is calling dead endpoints.** `services/seekerService.ts`'s `getUpskillHub()` and `getRecommendedPrograms()` call `GET /seeker/upskill-hub` and `GET /seeker/upskill-hub/recommended` — **these routes do not exist on the backend anymore.** The backend only exposes `GET /seeker/government-programs`, `GET /seeker/government-programs/{id}`, `GET /seeker/government-programs/{id}/attachment`, `POST /seeker/government-programs/{id}/apply`. There is a complete, ready-to-apply migration guide already written at `i-peso-mobile/GOVERNMENT_PROGRAMS_MIGRATION.md` (service method renames, `ProgramEligibility`/`EligibilityBadge` component additions, file renames `upskill-hub.tsx` → `government-programs.tsx`, dropping the now-nonexistent `recommended`/`job_fairs` response fields). Apply it exactly as documented. See §4.5 below for the current, correct API contract to build against.

### 2b. Build — missing screens that exist on web

**Job Map** (parity target: `i-peso-frontend/src/pages/seeker/JobMapPage.jsx` + `src/services/jobMapService.js`). This is the single biggest gap. Web has a full map+list dual experience; mobile only has the flat list in `jobs.tsx`. Build:
- A map screen using **`react-native-maps`** (the standard RN mapping library — not installed yet, add it) with marker clustering (`react-native-map-clustering` or equivalent) and popups/callouts on tap.
- "Use current location" via **`expo-location`** (not installed yet, add it) — request foreground permission, get current position, feed into the `lat`/`lng` query params.
- Filter panel matching web's `JobMapFilters` exactly: `radius_km` (5/10/15/25/50), `min_match` (0/50/70/80), `sort` (distance/match/newest/salary), `job_type`, `salary_min`/`salary_max`, and toggles `hide_low_match`, `hide_applied`, `coordinates_only`, `saved_only`, `job_fair_only`, `upskill_recommended_only`, `certificate_match_only`, `can_apply_only`, plus `max_missing_skills` and `location_keyword`.
- Data source: `GET /seeker/job-map` (same controller/response shape as `/seeker/nearby-jobs` — see §4.3). Debounce filter changes ~400ms. If the response is a 422 with `code: "location_required"`, fall back to a `feed_mode: "latest"` call and show a location-missing notice, exactly as web does — don't hard-fail.
- **AI natural-language search**: a text box → `POST /seeker/nearby-jobs/ai-parse` with `{query}`. Build a client-side regex fallback parser for when that call fails or returns a 503 (Gemini can be unavailable — treat 503 as expected, not an error state), mirroring web's `parseRuleBasedMapQuery`.
- Job detail panel: for `match_deferred` (compact) jobs, lazily fetch full detail via `GET /seeker/job-map/{id}`.
- Apply and save use the exact same endpoints as the existing `jobs.tsx` screen (`POST /seeker/jobs/{id}/apply`, `POST /seeker/saved-jobs/{id}`) — reuse those mutations, don't duplicate them.
- "Report employer" modal: `POST /seeker/employers/{id}/report` with `{reason, description}` — `reason` one of `fake_job|misleading|abusive|discrimination|illegal_fees|other`, `description` min 10 chars max 2000.

**Employer Profile view** (parity target: `i-peso-frontend/src/pages/seeker/EmployerProfile.jsx`). Build a screen reachable from a job card/detail's employer name. `GET /seeker/employers/{id}` → `{employer: {employer_id, company_name, trade_name, industry, company_size, company_logo_url, full_address, company_description, verification_status, created_at}, vacancies: [...]}`. Note the `vacancies` array here is a **raw JobVacancy model dump**, not the enriched match-scored shape from job search — no match percentage, no saved/applied state. Design the screen accordingly (a simple list of the employer's other open postings, tap-through to the normal job detail).

**Digital QR Pass** — **do not build this yet.** The mobile app has `react-native-qrcode-svg` installed but unused, and job-fair listings currently say "walk-in only, no digital RSVP, QR pass, or app check-in." Investigation found the backend's RSVP route (`JobFairController::rsvp()`) exists as a controller method but **is not wired to any route** — there is no `POST /job-fairs/{id}/rsvp` reachable by anyone today, despite job objects in `/seeker/nearby-jobs` responses containing `job_fair.has_rsvp` / `actions.can_rsvp_job_fair` / `qr_pass_url` fields as if it exists. **This is a backend gap, not a mobile gap.** Before building a QR pass screen on mobile, either (a) get the backend route added first, or (b) confirm with the team that job-fair RSVP was intentionally descoped and the QR pass feature should stay out of scope entirely. Don't build a mobile screen against an API that doesn't exist.

**My Program Applications tracking** — this one is subtle: it's **fully built on web** (`src/pages/seeker/MyProgramApplications.jsx`, list + document upload) but has **no route** in the web router and isn't linked from anywhere — it's unreachable by web seekers today despite being complete code. Build the equivalent mobile screen (it's needed — `(seeker)/program-applications.tsx` already exists on mobile and works, per §1), but flag to the web team separately that they should add the missing route/nav-link to `MyProgramApplications.jsx` so both platforms are actually reachable. This prompt's scope is mobile, but don't silently let the web app stay broken while you fix mobile — call it out.

**AI Chatbot** — a complete, ready-to-implement spec already exists at `CHATBOT_MOBILE_HANDOFF.md` (repo root): exact API contract (`POST /chat/public`, no auth needed, `{message, history?}` → `{reply}`), copy, starter chips, Tagalog/English/Taglish handling, keyboard-handling guidance for RN, and a test checklist. Build it exactly as that document specifies — it says the backend is done and deployed. No chatbot screen currently exists in mobile.

### 2c. Cleanup — dead code and config gaps

- Remove `app/modal.tsx` (unused Expo template placeholder, not wired into the root `Stack.Screen` list).
- Remove template leftovers: `components/hello-wave.tsx`, `parallax-scroll-view.tsx`, `external-link.tsx`, `themed-text.tsx`, `themed-view.tsx` — confirm nothing imports them first, then delete.
- Remove the `@react-native-async-storage/async-storage` dependency — installed but zero references anywhere in the app (token storage is exclusively `expo-secure-store`).
- Add `android.package` and `ios.bundleIdentifier` to `app.json` — flagged in `i-peso-mobile/DEV_BUILD_GUIDE.md` as "MANDATORY, do this first," currently missing, blocks any real EAS/native build.
- Decide and document (don't leave ambiguous): web's "AI Enhance Bullets" feature on the profile/resume screen is **not real AI** — it's a hard-coded client-side string template (`enhanceResponsibilities()` in `SeekerProfile.jsx`), despite being labeled "AI Enhance." For mobile parity, either replicate that exact same fake-template behavior (recommended, for consistency — a real generative call here would silently diverge from web's actual output) or explicitly decide to make it a real AI call on both platforms as a deliberate joint change. Don't build a real AI call on mobile only while web fakes it — that's parity-breaking in the worst way (different real output for the same labeled feature).

### 2d. Deliberately out of scope for this pass
- No seeker-facing settings/account-management screen — **this doesn't exist on web either.** Not a mobile gap; don't add it unless separately requested for both platforms.
- No employer or admin flows — mobile is seeker-only by design (web app's mobile-facing scope), keep it that way.

---

## 3. Registration & Onboarding — exact field-by-field spec

Mobile already implements this (§1) — this section is the reference to verify against, and to use if any step needs rebuilding or re-verifying after backend changes. Two phases:

### Phase A — Account creation
`POST /auth/register` with `{role: "seeker", first_name, last_name, email, mobile_number, password, password_confirmation}`.
- `first_name`/`last_name`: required, string, min 2/max 100, regex `^[\p{L}\s.'-]+$`.
- `email`: required, valid email, max 255, unique across job_seekers/employers/administrators.
- `mobile_number`: required, normalize any `+639…`/`9…` input to `09XXXXXXXXX` before sending, must match `^09\d{9}$`.
- `password`: required, confirmed, min 8 chars, must contain a number and a symbol.
- Response `201`: `{message, email, dev_otp?}` (`dev_otp` only in local/debug — never rely on it in the built app). On success, route to email verification, carrying the email forward.

### Phase B — Email verification
`POST /auth/verify-otp` with `{email, otp}` (6-digit numeric). 5 failed attempts → 429 lockout. Success → `{message, token, user}` — **this is the only place a fresh seeker receives a token**; login is blocked until verified. Store the token, route to `/onboarding`.
Resend: `POST /auth/resend-otp` with `{email}` — always 200 even for unknown email (anti-enumeration); 60s cooldown → 429.

### Phase C — 7-step NSRP onboarding
Each step **saves to the backend immediately** on submit — there's no local-only draft. This is what gives save-and-resume behavior: a seeker who abandons onboarding and logs back in is routed straight back to onboarding by the `profile_completed` guard, though the client always restarts at step 1 (it doesn't fetch and resume at the last completed step number — match this, don't add resume-at-step logic unless you're deliberately improving both platforms together).

**Step 1 — Personal Information & Address** → `POST /seeker/step-1`
Fields: `first_name`, `middle_name` (optional), `last_name`, `suffix` (optional, one of `Jr.|Sr.|II|III|IV|V`), `date_of_birth` (must be ≥15 years ago), `sex` (`male|female`), `civil_status` (`single|married|widowed|separated`), `religion` (enum list — see backend contract below; `religion_other` required if `other`), `height_ft` (2.5–8.5, collect as feet/inches picker, convert to decimal), `tin` (optional), full address (`address_province`, `address_municipality_city`, `address_barangay`, `address_house_street` all required, plus PSGC `*_code` fields), `latitude`/`longitude`/`location_accuracy`/`google_place_id` (geocode the composed address client-side if not already resolved — best-effort, swallow geocoding failures), `disabilities[]` (min 1; if it contains `none`, that must be the *only* entry — enforce this client-side to match a real backend 422 rule; `disability_specification` required if `others` is selected).

**Step 2 — Employment Status** → `POST /seeker/step-2`
`employment_status` (`employed|unemployed`) branches:
- employed → `employment_type` (`wage_employed|self_employed`) → if self-employed, `self_employed_type` (enum + `others` free text).
- unemployed → `unemployment_months` (0–999), `unemployment_reason` (enum incl. `terminated_abroad` requiring a country, `others` requiring free text).
Plus, regardless of branch: `is_ofw` (+`ofw_country` if true), `is_former_ofw` (+`former_ofw_country` + `former_ofw_return_date`, not in the future, if true), `is_4ps_beneficiary` (+`household_id_4ps` matching `\d{2}-\d{2}-\d{2}-\d{3}-\d{5}` if true — auto-format as the user types).

**Step 3 — Job Preference** → `POST /seeker/step-3`
`preferred_occupations[]` (1–3, via a searchable occupation combobox backed by `POST /seeker/classify-occupation` — 3-layer catalog→dictionary→AI classification), `work_type_preference` (`part_time|full_time`), `preferred_work_location` (`local|overseas`), `preferred_locations_details[]` (1–3; local = province→city cascading picker, overseas = free-text country). **Business rule**: each occupation preference item must supply exactly one of a catalog `occupation_id` OR a free-text `general_term`/`raw_job_title` — never both. Payload key is `occupation_preferences` (array of `{occupation_id?, general_term?, broad_field?, role_function?, confidence?, raw_job_title?, source}`).

**Step 4 — Language/Dialect Proficiency** → `POST /seeker/step-4`
Per-language checkboxes for read/write/speak/understand across a fixed language list (English, Filipino, Cebuano, Ilocano, Hiligaynon, Bikol, Waray, Pangasinan, Kapampangan, Maranao, Maguindanao, Tausug, Mandarin, Spanish, Japanese, Korean, Arabic, French, German, Others [+ name]). At least one language with at least one proficiency checked is required. Rows where all four booleans are false get dropped before submit (match this — don't send empty rows).

**Step 5 — Education & Skills** → `POST /seeker/step-5`
`educations[]` (min 1): `level` (enum: elementary/secondary_non_k12/secondary_k12/senior_high_strand/vocational/tertiary/graduate_studies), `institution_name`, `course_strand` (required for vocational/senior_high_strand/tertiary/graduate_studies), `completion_status` (`graduated|undergraduate|currently_studying`) with status-specific required fields (`year_graduated` ≥ `year_started` if graduated; `undergrad_level_reached` + `undergrad_year_last_attended` if undergraduate; `expected_year_graduated` if currently studying), `year_started` (1950–current year). Reject duplicate rows (same institution+level+course+years). Skills: `dole_skills[]`/`technical_skills[]` combined capped at **20**, `soft_skills[]` capped at **10** — enforce these caps client-side to match the backend's combined-limit rule.

**Step 6 — Trainings & Eligibilities** → `POST /seeker/step-6`
Both lists fully optional overall; any row added must be complete. Trainings: `course` required, plus hours/institution/skills-acquired/certificates-received. Eligibilities: `type` (`civil_service|professional_license`) + `name` required if a row exists; `date_taken` not in the future; `valid_until` ≥ `date_taken`.

**Step 7 — Work Experience (terminal step)** → `POST /seeker/step-7`
Entirely optional ("Optional for first-time jobseekers"). Any row needs `company_name` + `position`; `start_date` not in the future; `end_date` ≥ `start_date` and not in the future unless `currently_employed`. **On success, set `profile_completed: true` locally and route to the dashboard** — this is the exit point from onboarding.

**Field-level error handling**: on any step, a 422 response's `errors` object maps directly onto per-field error state. Special case: server errors on `occupation_ids`/`occupation_preferences.*` should surface on the single `preferred_occupations` field in the UI, matching web's behavior.

---

## 4. Backend API contract — build against exactly this

Base path: everything below is prefixed `/api`. Auth: Sanctum bearer token (`Authorization: Bearer <token>`) — no cookies needed for a mobile client. Token format is standard Sanctum (`{id}|{40-char-secret}`); **logging in on a new device revokes all previous tokens** (one active session per account) — the app should expect to get logged out if the same account logs in elsewhere.

**No global response envelope.** Every endpoint hand-rolls its own shape — don't assume `{data, meta}` everywhere. Two different pagination shapes exist in the API (raw Laravel paginator on government-programs, a hand-built `pagination` object on notifications) — handle each endpoint's shape on its own terms.

**Validation errors**: standard Laravel 422, `{message: "The given data was invalid.", errors: {"field": ["message"]}}`.
**Auth/ownership errors**: 403 for wrong role, 404 (not 403) for accessing another user's resource — deliberate, to avoid leaking existence.
**Rate limiting**: a global 60 requests/minute baseline applies to every endpoint that doesn't declare its own explicit throttle. Endpoints with tighter explicit limits are noted below — respect them client-side (debounce, don't poll aggressively) rather than relying on the server to reject you gracefully.
**AI endpoints can return 503** when the underlying Gemini/Vertex service is unavailable/over quota — this is an expected, designed outcome (quota limits), not a bug. Build a "AI temporarily unavailable, try again" UX path for every AI-backed call, not a hard error screen.

### 4.1 Auth
| Method | Path | Throttle | Notes |
|---|---|---|---|
| POST | `/auth/register` | 5/min | see §3 Phase A |
| POST | `/auth/verify-otp` | 10/min | see §3 Phase B |
| POST | `/auth/login` | 10/min | 5 failed attempts/email → 429 for 15 min (separate from the route throttle). Wrong creds → 401 with a deliberately identical message for both "not found" and "bad password". Unverified email → 403 `{message, email_unverified: true, email}` and silently resends an OTP — route to verify-email on this response. |
| POST | `/auth/resend-otp` | 5/min | |
| POST | `/auth/forgot-password` | 5/min | always 200 for unknown email; 60s cooldown → 429 |
| POST | `/auth/reset-password` | 5/min | `{email, otp, password, password_confirmation}` — does **not** auto-login, no token in response, call `/auth/login` after |
| GET | `/auth/me` | — | `{user}` — call on app boot if a stored token exists, to rehydrate session |
| POST | `/auth/logout` | — | deletes only the current token |

**`user` object is NOT identical across every endpoint** — merge into your store, don't replace wholesale. The `/auth/*` shape includes `profile_completed`, `verification_status`; the `/seeker/step-N` response shape additionally includes `educ_attainment`/`form_validation_state` but omits `verification_status`. Design the auth store's update function as a shallow merge, matching web's `updateUser(partial)` pattern.

### 4.2 Seeker profile & registration steps
All under `[auth:sanctum]`, seeker-only (`403` if not a JobSeeker).

- `GET /seeker/dashboard-summary` — lightweight bootstrap: `{user: {seeker_id, first_name, middle_name, last_name, suffix, educ_attainment, latitude, longitude, profile_completed, has_profile_image, has_resume, occupations: [...max 1], dashboard_stats: {active_applications, skills, saved_jobs: [post_id...]}, profile_strength: {percentage, items, coreComplete, coreTotal}}}`. Use this for the dashboard, not the full profile fetch.
- `GET /seeker/profile` — the full profile, all relations eager-loaded, every field described in §3 plus `certificates[]`, `profile_image_url`, `has_resume`, `dashboard_stats`, `profile_strength`.
- `POST /seeker/step-1` through `/seeker/step-7` — see §3 for exact field/validation specs per step.
- ⚠️ `POST /seeker/profile` is routed but the backend investigation could not confirm a working `saveProfile` handler exists — **do not build against this as a fallback/single-submit path.** Use the 7 step endpoints exclusively. Verify with the backend team before ever calling this route.

**Profile image** (`multipart/form-data`):
- `POST /seeker/profile-image` — field `profile_image`, jpg/jpeg/png, max 2048 KB, min 300×300px, **must be square (1:1 ratio)** — validate aspect ratio client-side before upload to avoid a wasted round-trip. Uploading a new photo clears the seeker's generated resume server-side (forces regeneration).
- `GET /seeker/profile-image` — streams the image binary.
- `DELETE /seeker/profile-image` — removes it.

**Certificates** (`multipart/form-data`):
- `POST /seeker/certificates` — `title`, `issuing_body`, `category` (enum: training_certificate/tesda_nc_certificate/professional_certificate/seminar_certificate/workshop_certificate/employment_certificate/academic_certificate/other), `issued_at` (not future), `expires_at` (optional, after issued_at), `credential_number` (optional), `description` (optional, max 2000), `training_id` (optional, must be one of the seeker's own trainings), `certificate_file` (pdf/jpg/jpeg/png, max 5120 KB).
- `GET /seeker/certificates/{id}/view` — streams inline.
- `DELETE /seeker/certificates/{id}`.

**Saved jobs**: `POST /seeker/saved-jobs/{vacancyId}` toggles (no request body) — response includes the full updated `saved_jobs` array. **There is no separate "list saved jobs" endpoint** — get the list via `dashboard_stats.saved_jobs` or by calling job search with `saved_only=true`.

**Employer profile**: `GET /seeker/employers/{id}` — 404 unless the employer is verified. See §2b for the response shape (raw vacancy dumps, not match-scored).

**Report employer**: `POST /seeker/employers/{id}/report` (10/min) — `{reason: fake_job|misleading|abusive|discrimination|illegal_fees|other, description: min 10/max 2000 chars}`. Rejects 422 if the seeker already has a pending/investigating report against that employer.

### 4.3 Job search, detail, apply
**There is no generic job-listing endpoint.** All seeker job browsing goes through one controller mounted at two paths: `GET /seeker/nearby-jobs` and `GET /seeker/job-map` (identical behavior — the two URLs exist for the mobile/map UI vs. list UI split; use `nearby-jobs` for the plain list feed, `job-map` for the map screen, if you want to mirror web's naming, though functionally either works). Both throttled 60/min.

Query params (all optional unless noted): `radius_km` (1–500, default 15), `min_match` (0–100), `keyword` (max 100), `location_keyword` (max 100), `sort` (`distance|match|newest|salary`), `feed_mode` (`nearby|recommended|latest`, default `nearby`), `job_type` (max 60), `salary_min`/`salary_max`, boolean toggles `hide_low_match`/`hide_applied`/`coordinates_only`/`include_no_coordinates`/`saved_only`/`job_fair_only`/`upskill_recommended_only`/`certificate_match_only`/`can_apply_only`/`compact` (send as `"true"`/`"false"` strings), `max_missing_skills` (0–50), `lat`/`lng` (defaults to the seeker's stored location if omitted), `limit` (1–150, default 100), `job_id` (single-vacancy lookup).

If `feed_mode=nearby` and no coordinates are available anywhere (profile or query) → 422 `{message, code: "location_required", seeker, seeker_location, jobs: []}` — handle this as a "set your location" prompt, not a generic error.

Response: `{seeker, summary: {total_found, high_match_count, nearest_distance_km, applied_count, saved_count, job_fair_count, upskill_recommendation_count}, radius_km, feed_mode, location_available, origin, seeker_location, filters_applied, count, jobs: [...]}`.

**Full job object** (default, `compact=false`) includes a large `match` object (`total_score, percentage, eligible, eligibility_reasons, missing_critical_skills, skill_gaps, recommendations, ...`), full location fields, `has_applied`/`is_saved`/`application_id`/`application_status`, `certificate_match`, `job_fair`, `upskill`, `actions: {can_apply, can_save, can_rsvp_job_fair, can_download_resume}`. **`compact=true`** strips the match internals to `{match: null, match_deferred: true}` and stubs `certificate_match`/`job_fair`/`upskill` as `{deferred: true}` — use compact mode for map pins, full mode for list/detail.

Job detail: `GET /seeker/job-map/{id}` — returns `{job: <one full job object>, seeker}`. 404s if the job isn't active or is past its deadline (no "closed" status returned, just not found).

Apply: `POST /seeker/jobs/{id}/apply` (20/min), no body. Rejects 422 if the vacancy isn't active or the deadline passed. **Re-applying to the same job is not an error** — returns 200 with the existing application and `"You already applied to this job."` — don't treat that as a failure state in the UI. Success: 201 with the created application.

### 4.4 Applications
- `GET /seeker/applications` — `{count, applications: [...]}`, newest first.
- `GET /seeker/applications/{id}` — `{application}`. 404 if not the caller's.
- `POST /seeker/applications/{id}/withdraw` — no body. 422 if status is already `hired|rejected|withdrawn`.

Application object: `{apply_id, post_id, status, status_label, can_withdraw, match_percentage, employer_remarks, applied_at, status_changed_at, timeline: [...], job: {...}, interview: {...}|null, placement: {...}|null}`. Status values: `pending, reviewed, shortlisted, interview, hired, rejected, withdrawn`. `can_withdraw` is false once terminal (`hired`/`rejected`/`withdrawn`). Interview info (schedule, mode, venue/link) is embedded here — there's no separate interview endpoint; surface it inside the application detail screen, matching web (no dedicated "my interviews" screen).

### 4.5 Government programs (use this, not the stale upskill-hub endpoints — see §2a)
- `GET /seeker/government-programs?search=&category=&status=&per_page=12` — raw Laravel paginator under key `programs`, plus `categories: {name: count}`.
- `GET /seeker/government-programs/{id}` — `{program}`.
- `GET /seeker/government-programs/{id}/attachment` — file download.
- `GET /seeker/citizen-charter` — `{data: [...]}`.
- `POST /seeker/government-programs/{id}/apply` — no body (server evaluates eligibility from the stored profile). 422 if already applied / not open / deadline passed / no slots left.
- `GET /seeker/government-program-applications` — the seeker's own applications with nested program + documents.
- `POST /seeker/government-program-applications/{id}/documents` — multipart, `{document_type: requirement|certificate, document_name, file}` (pdf/jpg/jpeg/png/doc/docx, max 5120 KB). `certificate` type only allowed once `application_status === 'completed'`.
- `GET /seeker/government-program-applications/{id}/documents/{docId}` — file download.

Program object includes `eligibility: {score, breakdown...}` and `can_apply` (server-computed) — surface the eligibility breakdown, don't reimplement the eligibility logic client-side.

### 4.6 Notifications
- `GET /seeker/notifications?per_page=20` (1–50) → `{notifications: [...raw Laravel DB notifications...], unread_count, pagination: {current_page, last_page, total}}`.
- `GET /seeker/notifications/unread-count` → `{unread_count}` — poll this every ~30s for a badge, matching web, and also refetch on app-foreground.
- `PATCH /seeker/notifications/{id}/read`, `PATCH /seeker/notifications/read-all`.

`data` payload inside each notification is polymorphic per notification type — treat it as an opaque bag, route using `data.action_url` if present (matching web), and render generically by `type`/status color rather than hard-coding every notification class's shape.

### 4.7 AI-assisted endpoints (all can 503 — see note above)
- `POST /seeker/ai-profile-suggestions` (10/min)
- `POST /seeker/ai-professional-summary` (10/min) — `{existing_summary?}` → generated summary
- `POST /seeker/classify-occupation` (30/min) — `{title, limit?}` → `{raw_input, is_valid_job_input, needs_clarification, suggestions: [{occupation_title, general_term, confidence, source, ...}], invalid_reason}`. This is the one to use for the occupation picker (3-layer catalog→dictionary→AI, cached 30 min for valid results) — not `/seeker/ai-occupation-classification`, which is a legacy/unused duplicate on web.
- `POST /seeker/nearby-jobs/ai-parse` (10/min) — `{query}` → parsed map-search filters, see §2b.

### 4.8 Resume generation — returns a binary PDF, not JSON
`POST /seeker/resume/generate` (5/min) — `{professional_summary?, responsibility_overrides?}`. Requires the seeker to already have a profile photo uploaded (422 otherwise). **Response Content-Type is `application/pdf`, a raw file, not JSON** — handle this as a download/share flow (the app already has `expo-file-system` + `expo-sharing` installed for exactly this — use them, don't route this response through the normal JSON API error/success handling).

### 4.9 Occupation & skill catalogs (public, no auth)
- `GET /occupations?search=&limit=&mode=catalog|general` (60/min)
- `GET /skills?search=&category=technical|soft&limit=` (60/min, `category` required)

### 4.10 Job fairs
`GET /job-fairs` (auth required, any role) — public/upcoming/ongoing fairs. See §2b for the RSVP gap — don't build against a seeker RSVP endpoint, it doesn't exist yet.

### 4.11 Geo helpers (auth required, any role) — for address lookup during onboarding
`GET /geo/autocomplete` (30/min), `GET /geo/place/{placeId}` (20/min), `GET /geo/geocode` (20/min), `GET /geo/reverse` (20/min), `POST /geo/route` (15/min), `POST /geo/matrix` (5/min, batch — max 25×25, rejects if sources×targets > 625).

### 4.12 Analytics
`GET /seeker/analytics` (cached 60s server-side) → `{analytics: {total_views_30_days, search_appearances, recent_viewers: [...max 5]}}`.

### 4.13 Public chatbot
`POST /chat/public` (10/min, no auth) — `{message, history?: [{role: user|model, text}]}` → `{reply}`. See §2b — build this per `CHATBOT_MOBILE_HANDOFF.md`.

---

## 5. Known backend quirks — design around these, don't fight them

1. **No global response envelope or pagination convention.** Handle each endpoint's shape as documented above; don't build a generic "unwrap the response" helper that assumes consistency that doesn't exist.
2. **`user` object shape varies by endpoint** (§4.1) — merge, never replace, in the auth store.
3. **No "list saved jobs" endpoint** — derive from `dashboard_stats.saved_jobs` or `saved_only=true` on job search.
4. **Job fair RSVP is unimplemented server-side** despite job objects implying it exists (§2b) — don't build a mobile RSVP flow until the backend route exists.
5. **`POST /seeker/profile` legacy endpoint's handler is unverified** — use the 7-step endpoints only (§4.2).
6. **Resume generation returns binary, not JSON** (§4.8) — needs distinct client handling.
7. **AI endpoints legitimately 503** on quota exhaustion — this is expected, build graceful degradation everywhere an AI call is made, not a crash/error screen.

---

## 6. Acceptance criteria

For each area, "done" means:
- [ ] Government Programs screen uses the current `/seeker/government-programs*` endpoints exclusively; zero references to `/seeker/upskill-hub*` remain anywhere in the codebase.
- [ ] Job Map screen exists, matches every filter web offers, uses `react-native-maps` + `expo-location`, degrades gracefully on `location_required`, and reuses the existing apply/save mutations rather than duplicating them.
- [ ] Employer Profile screen exists and is reachable from a job card/detail.
- [ ] AI Chatbot screen exists, built per `CHATBOT_MOBILE_HANDOFF.md`, handles the `retryable` field on error responses.
- [ ] Every registration/onboarding field, validation rule, and enum value in §3 has a mobile equivalent that sends an identical payload shape to the backend (spot-check by diffing a captured request body against the Laravel `validate()` rules in §3/§4.2).
- [ ] No dead code remains: `app/modal.tsx`, unused template components, unused AsyncStorage dependency.
- [ ] `app.json` has `android.package` and `ios.bundleIdentifier` set.
- [ ] The "AI Enhance Bullets" behavior is a deliberate, documented match (or joint change) with web, not an accidental divergence.
- [ ] Every AI-backed call (profile suggestions, professional summary, occupation classification, map query parsing, chatbot) handles a 503 response with a "temporarily unavailable" UX, not a hard error.
- [ ] Resume generation is handled as a file download/share flow, confirmed working on-device (not just that the request succeeds).
