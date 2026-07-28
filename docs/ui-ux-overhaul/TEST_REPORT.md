# Test Report

## Current state
- **Test harness is live:** Vitest + React Testing Library + jsdom + axe (`vitest-axe`), wired via `vite.config.js` (`test` block) and `src/test/setup.js` (jest-dom matchers, axe matchers, and the `ResizeObserver`/`matchMedia`/pointer-capture polyfills Radix needs). Run with `npm test` (or `npm run test:watch`).
- **44 tests passing across 9 files.**

| File | What it locks down |
|------|--------------------|
| `components/ui/__tests__/StatCard.test.jsx` | value/label/subtitle; **trend colours by good-vs-bad, not sign** (`trendPositiveIsGood`); a11y trend label; focusable hint tooltip |
| `components/ui/__tests__/feedback.test.jsx` | `EmptyState`/`ErrorState`/`LoadingSkeleton` roles, actions, retry, variants |
| `components/ui/__tests__/dialog.test.jsx` | `Dialog` accessible name/description, **Escape closes, focus stays trapped**, labelled close |
| `pages/admin/_components/__tests__/DataTable.test.jsx` | loading/error/empty states, `scope="col"` headers, caption, `onRowClick` |
| `test/a11y.test.jsx` | axe: no violations on StatCard/EmptyState/ErrorState/LoadingSkeleton/DataTable |
| `pages/seeker/__tests__/MyApplications.test.jsx` | renders apps + "what's next"; **withdraw uses Dialog not `window.confirm`**; empty/error+retry |
| `pages/admin/.../DashboardPage.test.jsx` | KPI cards from real stats; focusable metric tooltip; error+retry |
| `pages/admin/.../VerificationQueuePage.test.jsx` | ready-first ordering; progressbar; empty/error+retry |
| `pages/employer/__tests__/VacanciesPage.test.jsx` | renders; empty state; **delete confirms via Dialog not `window.confirm`** |

- **Build** (`npm run build`) and **lint** (`eslint`) remain green throughout.

## Known limits of the current suite (be honest)
- **axe in jsdom cannot check colour contrast** (no real canvas — it logs `getContext` warnings). Contrast of the navy unification / chart palette still needs a **real browser** (Lighthouse/axe DevTools).
- **No Playwright E2E yet** — no cross-page flows, no real responsive testing at the 6 breakpoints, no keyboard walkthrough in a real browser.
- Coverage is the reworked pages + shared primitives, **not** the ~47 untouched routes.

## Phase 1 verification performed
| Check | Result |
|-------|--------|
| Production build (`npm run build`) before changes | ✅ pass (~9.6s) |
| Production build after tokens + primitives + StatCard + dead-CSS removal | ✅ pass |
| Production build after shadcn integration (Radix Dialog/Tooltip, cn, theme) | ✅ pass (~8.2s), app entry +0.09 kB |
| shadcn deps install on React 19 | ✅ no peer conflicts |

Manual/runtime verification (render, keyboard, screen reader) of the new components is **[pending]** — see below.

## Test infrastructure
1. ✅ **Vitest + React Testing Library + jsdom** — installed and running (`@testing-library/jest-dom`, `@testing-library/user-event`).
2. ✅ **axe-core** (`vitest-axe`) — asserting no violations on the shared primitives (contrast excepted; see limits above).
3. ⬜ **Playwright** — end-to-end for critical flows across the 6 viewport widths. **Not yet added** — this is the main remaining test gap and the only way to cover real-browser responsive + contrast.

## Priority test cases (from the brief)
**Shared components (add first — high leverage):**
- `StatCard`: renders value/label; trend arrow direction; **`trendPositiveIsGood={false}` colors an increase red**; hint tooltip opens on focus; no color-only signal.
- `EmptyState`: default vs `filtered` copy; action fires.
- `ErrorState`: retry fires; raw error hidden outside dev.
- `LoadingSkeleton`: variants render; `role="status"`.
- `Dialog`: focus trap, Esc closes, focus restored to trigger.

**Admin:** dashboard loads real API data · filters update analytics · employer verification approve/reject · management-table filtering · job-fair detail · report generation.
**Employer:** create/edit job · filter applicants · move applicant status (Kanban) · schedule interview · submit report.
**Job seeker:** onboarding · search/filter jobs · open details · apply · track status · update profile.

## Rule
Do not weaken assertions to make tests pass. A failing test that reflects a real bug stays failing until the bug is fixed.
