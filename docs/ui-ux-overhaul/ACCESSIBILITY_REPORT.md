# Accessibility Report

**Target:** WCAG 2.2 AA.

**Verification status (updated):**
- ✅ **Automated axe** now runs in the test suite (`test/a11y.test.jsx`) against the shared primitives (StatCard, EmptyState, ErrorState, LoadingSkeleton, DataTable) — **no violations**.
- ✅ **Dialog keyboard behaviour** is under test (`dialog.test.jsx`): Escape closes, focus stays trapped, accessible name/description present — the exact behaviours the old hand-rolled modals lacked.
- ✅ **StatCard non-colour trend** (arrow + sign + aria-label) is under test.
- ⚠️ **Colour contrast is NOT machine-verified** — axe in jsdom has no canvas and cannot compute contrast. The navy unification (`#123563`, ~9.7:1 on white by manual calc) and the chart palette (validated by the dataviz script, gold flagged) still need a **real-browser** axe/Lighthouse pass.
- ⬜ **Manual keyboard + screen-reader walkthroughs** and the responsive matrix remain **[pending]** — need a real browser (Playwright or hands-on).

Items below marked **[pending]** are not yet verified in a real browser.

## Baseline (pre-overhaul) findings

| Area | Finding | WCAG | Severity |
|------|---------|------|----------|
| Color-only status | `StatCard` trend used color alone (green/red) to signal direction | 1.4.1 | High |
| Misleading signal | Trend was green for any increase, even undesirable ones | (integrity) | High |
| Contrast | `--color-text-3 #94a3b8` on white ≈ 2.8:1; gold `#f59e0b` as text fails AA | 1.4.3 | Medium |
| Dialogs | Bespoke modals — focus trap / Esc / focus-restore not guaranteed | 2.1.2, 2.4.3 | High |
| Tooltips/hints | KPI hints via `title` attr — not keyboard-focusable, inconsistent SR support | 1.4.13 | Medium |
| Icon buttons | Admin nav uses decorative inline `<svg>` without `aria-hidden`; some icon-only controls lack labels | 1.1.1, 4.1.2 | Medium |
| Reduced motion | Honored only for auth animations; global `.page-enter`/framer usages not guarded | 2.3.3 | Low |
| Color scheme | Dead `index.css` declared `color-scheme: light dark` (risk of unwanted dark form controls) | — | Low |
| Skip link | No skip-to-content | 2.4.1 | Medium |

## Phase 1 improvements (shipped)
- **`StatCard` trend** now shows an **arrow icon + sign + `%`** (not color alone) and colors by *whether the change is good* via `trendPositiveIsGood`, with an `aria-label` announcing direction (e.g. "Placement rate: up 4% vs last month"). Fixes 1.4.1 + the misleading-signal integrity issue.
- **KPI hints** now use a Radix-backed **Tooltip** with a real focusable `<button>` trigger, `aria-label`, Esc-dismiss, and pointer/focus parity. Fixes the `title`-attr gap.
- **Dialog primitive** (Radix) added — provides focus trap, Esc, scroll-lock, and focus restoration out of the box; adopt it to replace bespoke modals in later phases.
- **`LoadingSkeleton`** uses `role="status" aria-live="polite" aria-busy` + `sr-only "Loading…"` and disables pulse under `prefers-reduced-motion` (`motion-safe:animate-pulse`).
- **`EmptyState`/`ErrorState`** use `role="status"` / `role="alert"` and keep icons `aria-hidden`, with real action buttons.
- **Focus ring token** (`focus` / `--ring`) centralized for consistent visible focus; shadcn components use `focus-visible:ring-focus`.
- Removed the dead `color-scheme: light dark` declaration with `index.css`.

## Still to do (later phases) **[pending]**
Skip-to-content link in the app shell · admin nav icon `aria-hidden` + `aria-current` · replace bespoke modals with the new Dialog · chart text alternatives / data-table fallback for Recharts · global reduced-motion guard · full keyboard traversal + axe run on each redesigned page · contrast re-check of amber focus ring on gold surfaces · touch-target audit on dense table rows.
