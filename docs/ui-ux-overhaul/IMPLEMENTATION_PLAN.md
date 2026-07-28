# i-PESO UI/UX Overhaul — Implementation Plan

**Guiding constraints (from the brief, do not break):** keep API contracts, auth/roles, and business rules intact; no second design system; reuse existing components; real data only (no placeholder charts); measure before optimizing; don't clobber the ~40 in-flight uncommitted files.

**Working-tree caution:** these files are currently modified by the user and are **off-limits unless coordinated** — `AdminLayout`, `EmployerLayout`, `EmployerDetailPage`, `DOLEReportingPage`, `RegisterPage`, `ResetPasswordPage`, `EmployerATSBoard/Grid`, `EmployerJobFairDashboard`, `DocumentUploadZone`, `Step3DocumentUpload`, `JobMapPage`, `router/index.jsx`, `adminService.js`, `employerService.js`, plus `package.json`/`package-lock.json`. Foundation work is deliberately routed around them.

---

## Phasing (mirrors the brief) with risk rating

Risk: 🟢 additive/no visual change · 🟡 visible change, contained · 🔴 broad reskin / cross-cutting.

### Phase 1 — Audit & foundation  *(this pass)*
| Task | Risk | Notes |
|------|------|-------|
| Grounded audit + plan + design-system docs | 🟢 | Done in this pass |
| Baseline build metrics | 🟢 | Captured (`PERFORMANCE_REPORT.md`) |
| Expand tokens in `tailwind.config.js` (semantic/status/chart/focus/containers) — **additive only** | 🟢 | No existing utility changes value |
| Add `EmptyState`, `ErrorState`, `LoadingSkeleton` to `components/ui/` | 🟢 | Net-new, nothing imports them yet |
| Fix `StatCard` trend direction + a11y (backward compatible default) | 🟡 | Contained to one component |
| Delete dead `index.css`/`App.css` | 🟢 | Not imported anywhere |
| Verify `npm run build` | 🟢 | Gate |

**Deferred to a coordinated pass (needs user's in-flight files to settle):** single-source token *reconciliation* of the three navies (🔴 visible), and removing the `!important` blue→gold override hack by migrating 71 raw buttons (🟡×28 files). Plan below.

### Phase 2 — Admin dashboard & analytics
- Analytics metric dictionary (started) → audit each chart against a real question; kill decorative charts.
- KPI cards on shared `StatCard` with comparison + honest direction + tooltip + skeleton/empty/error.
- Analytics workspace: shared filter bar, URL-synced filters, "last updated", CSV export only where backend supports it.
- Lazy-load Recharts (the 361 kB chart bundle) so non-analytics pages don't pay for it.
- Dashboard IA: "needs attention today" first, not every metric at once.

### Phase 3 — Admin operations
- Employer verification: side-by-side doc review, checklist, reasons, audit history, confirm dialogs.
- Management tables on the existing `DataTable`: search/sort/filter/column-visibility/active-filter chips, responsive card fallback on mobile.
- Job fairs lifecycle; reports (SPRS 1.6, establishment, placement, ROI 3) with clear generated/draft/submitted/missing states.

### Phase 4 — Employer experience
- Dashboard (actionable), job-posting wizard (RHF + Zod + server-error mapping + draft save), applicant management (table + `@hello-pangea/dnd` Kanban already present), interview calendar (keep FullCalendar), reports.

### Phase 5 — Job seeker experience
- Onboarding (save/continue, progress, completion feedback), job discovery (filters + list/map + active chips + result count), job cards (decision-relevant only), job details (sticky mobile action bar), application status timeline with plain-language "what's next".

### Phase 6 — QA
- Vitest + RTL component tests, Playwright E2E for the critical flows, axe integration, responsive matrix, perf trace before/after, regression sweep, docs finalization.

**After every phase:** format → lint → build → check console/network → document changed files → focused commit (only if the repo workflow permits and the user asks).

---

## Token reconciliation strategy (Phase 2, 🔴 — needs sign-off)

The three navies must collapse to one. Recommended canonical set (retains the recognizable i-PESO navy+gold, improves contrast):

- **Primary navy** `#123563` (the sidebar value already in production) as `--color-primary`, with a 50–950 ramp.
- **Gold accent** `#f59e0b` (unchanged — already consistent).
- Map `brand-navy` (Tailwind) → same primary so `bg-brand-navy` and `bg-[--color-primary]` agree.
- Then delete the `.portal-shell button.bg-blue-600{…!important}` overrides and migrate the 71 raw buttons to `<Button>` in batches by role folder (each batch build-verified).

This is visible (some blues shift), so it ships as its own reviewed change, not silently in foundation.

---

## Reuse map (do NOT recreate)

| Need | Use existing |
|------|--------------|
| Button | `components/ui/Button.jsx` |
| Card | `components/ui/Card.jsx` (+`CardHeader`) |
| Data table | `pages/admin/_components/DataTable.jsx` |
| Page header | `pages/admin/_components/PageHeader.jsx` |
| KPI | `pages/admin/_components/StatCard.jsx` (fix trend) |
| Status pill | `pages/admin/_components/StatusBadge.jsx`, `components/ui/Badge.jsx` |
| Confirm dialog | `pages/admin/_components/ConfirmModal.jsx` |
| Charts | `recharts` |
| Server state | `@tanstack/react-query` |
| Forms | `react-hook-form` (+ add `zod` only when validation complexity justifies) |
| Toasts | `react-hot-toast` |
| Kanban DnD | `@hello-pangea/dnd` |

## New primitives to add (fill genuine gaps)
`EmptyState`, `ErrorState`, `LoadingSkeleton` (Phase 1) → later: `FilterBar`, `SearchInput`, `DateRangeFilter`, `ChartCard`, shared `Dialog` (with focus trap), consolidated `NotificationBell`, `Breadcrumbs`.

## Definition of done (per page)
Implemented · wired to real API · component/interaction test · responsive at the 6 breakpoints · keyboard + axe clean · build green.
