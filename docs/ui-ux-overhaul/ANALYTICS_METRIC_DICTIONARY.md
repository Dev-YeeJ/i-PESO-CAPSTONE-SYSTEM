# Analytics Metric Dictionary

**Status: seeded (Phase 1).** These definitions are **proposed** and must be reconciled against the real implementation — `src/pages/admin/5-system-reports/labor-analytics/LaborAnalyticsPage.jsx`, `adminService`, and the Laravel analytics endpoints — during Phase 2. Where the app currently computes something differently, the code is the source of truth and this file gets corrected, not the other way around.

**Honesty rules (binding):**
- Every metric states its **date field**, **included/excluded statuses**, and **null/empty behavior**.
- **Never invent an unemployment rate** without a valid labor-force denominator. i-PESO holds *registrants*, not the working-age population, so any "unemployment"-style figure is a **registrant statistic**, labeled as such — not the official PSA unemployment rate.
- Forecasts are labeled **forecast**, separated from actuals, with method + minimum-data requirements shown.
- A green/positive indicator is only used when an increase is actually desirable (enforced in `StatCard` via `trendPositiveIsGood`).

---

## KPI metrics (template — fill exact fields in Phase 2)

### Registered job seekers
- **Meaning:** distinct seekers with an account in scope.
- **Formula:** `count(distinct seeker_id)` where `created_at` ≤ period end (cumulative) or within range (new).
- **Date field:** `seekers.created_at`. **Excludes:** soft-deleted. **Null:** show 0, not blank.
- **Comparison:** previous equal-length period. **Higher is better.**

### Active participants
- **Meaning:** seekers with activity (application/login/profile update) in range. **Confirm the exact activity definition in code.**
- **Excludes:** accounts with no activity in range. **Limitation:** depends on which events are logged.

### Active job vacancies
- **Formula:** `count(vacancies where status = 'open' AND (expires_at is null OR expires_at ≥ today))`. **Date field:** none (point-in-time). **Higher is better** (usually).

### Total applications
- **Formula:** `count(applications where created_at in range)`. **Date field:** `applications.created_at`.

### Hired this month
- **Formula:** `count(applications where status = 'hired' AND status_changed_at in month)`. **Confirm** the timestamp used is the hire event, not `created_at`.

### Placement rate
- **Formula:** `hired / applications` (or `hired / referred`) **in range** — **confirm numerator/denominator in code.** Express %. **Higher is better.**
- **Limitation:** sensitive to denominator choice; state it in the tooltip.

### Profile completion rate
- **Formula:** `count(seekers where profile_completed) / count(seekers)`. **Higher is better.**

### Pending employer verifications
- **Formula:** `count(employers where verification_status = 'pending')`. **Higher is worse** → use `trendPositiveIsGood={false}`. (This is also the value the admin sidebar badge should show instead of the literal "pending".)

---

## Distributions & rankings
Gender, educational attainment, skills, barangay/location, most-applied categories, employers by applications/hires, vacancies by category, application funnel (applied→reviewed→shortlisted→interview→offered→hired), applicant-to-hire conversion, job-fair outcomes.

For each in Phase 2 record: source table, grouping key, how nulls/"prefer not to say" are handled, and the exact status set for funnel stages. **Chart choice** per DESIGN_SYSTEM.md (line=trend, bar=category, stacked=composition, funnel=conversion, horizontal bar=long labels, map=geography, table=precise ranking; no pie with many slices, no 3D, no truncated axes).

---

## Backend data gaps (found during implementation)
These are needed to satisfy brief requirements without fabricating data. Documented here rather than editing the in-flight `adminService.js`.

- **KPI trend/comparison:** `adminService.getDashboardStats()` returns only current-period values (`total_seekers`, `active_vacancies`, `applications_this_month`, `hired_this_month`, `rejected_this_month`, `pending_verifications`, `profile_completion_rate`, `open_programs`, `upcoming_job_fairs`, `recent_registrations[]`, `recent_applications[]`). It returns **no previous-period values**, so the dashboard shows KPIs **without trend arrows** (rather than inventing a direction). To enable honest trends, the endpoint should add previous-period counterparts (e.g. `applications_prev_month`, `hired_prev_month`, …) or a `{ current, previous }` shape per KPI. Until then, `StatCard.trend` is intentionally omitted here.

## Predicted in-demand skills (forecast)
- **Separate** historical actuals from the forecast visually (solid vs dashed / distinct band).
- **Show:** forecast period, method/description, and confidence/uncertainty when available.
- **Minimum data:** define the threshold below which the forecast is suppressed and an honest "not enough data yet" message is shown instead.
- **Never** present a weak/low-data forecast as a confirmed outcome. Include a "How this prediction works" panel.
- **Confirm** in Phase 2 whether the backend produces a real model output or a heuristic, and label accordingly.
