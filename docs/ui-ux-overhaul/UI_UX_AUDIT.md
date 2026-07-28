# i-PESO — UI/UX Audit

**Scope:** `i-peso-frontend` (React 19 + Vite web app), the priority surface. Mobile (`i-peso-mobile`) and backend contracts noted where they affect the web work.
**Date:** 2026-07-13 · **Baseline build:** `npm run build` passes (exit 0, ~9.6s).
**Method:** static inspection of the real repository (routing, layouts, services, shared components, `tailwind.config.js`, `main.css`) plus a production build to capture bundle metrics. Runtime/responsive/screen-reader passes are scheduled per phase and marked **[runtime-pending]** below.

> This is a living document. Findings are grounded in specific files/lines observed in the codebase, not assumptions.

---

## A. Application inventory

| Area | What exists today | Location |
|------|-------------------|----------|
| **Package manager** | npm (`package-lock.json`) | `i-peso-frontend/` |
| **Build** | Vite 8, React 19, `@` alias → `src` | `vite.config.js` |
| **Layouts** | `GuestLayout`, `AdminLayout`, `EmployerLayout`, `SeekerLayout` | `src/layouts/` |
| **Navigation** | Admin sidebar with 6 grouped categories, defined inline as `navGroups` with **hand-drawn inline `<svg>` icons** (not `lucide-react`, which is installed) | `src/layouts/AdminLayout.jsx` |
| **Shared UI** | `Button`, `Card`+`CardHeader`, `Badge`, `AlertBox` | `src/components/ui/` |
| **Admin shared** | `PageHeader`, `StatCard`, `StatusBadge`, `ConfirmModal`, `DataTable`, `DownloadNSRPButton` | `src/pages/admin/_components/` |
| **Forms** | `Field`, `FormError`, `PasswordStrengthMeter`, `EducationLevelSelect`, `PsocCombobox`, `AddressAutocomplete`, `SmartSuggestionInput`, occupation mappers, etc. | `src/components/form/` |
| **Tables** | `DataTable.jsx` — TanStack Table-based (72 kB chunk). Reuse target. | `src/pages/admin/_components/DataTable.jsx` |
| **Charts** | Recharts (`BarChart` chunk = 361 kB / 105 kB gzip, the largest asset) | `src/pages/admin/5-system-reports/labor-analytics/` |
| **Modals** | `ConfirmModal`, `ProfilePhotoUploadModal`, `CertificateUploadModal` (bespoke, no shared Dialog primitive) | various |
| **Toasts** | `react-hot-toast` — single `<Toaster>` mounted in `App.jsx` | `src/App.jsx` |
| **Routes** | ~60 routes across 4 role trees (guest/auth, admin ×27, employer ×10, seeker ×11), all `lazy()` + `<Suspense>` | `src/router/index.jsx` |
| **API services** | `api.js` (axios base), `adminService`, `employerService`, `authService`, `governmentProgramService`, `establishmentReportService`, `placementReportService`, `reportService`, `psgcServices` | `src/services/` |
| **State** | Zustand (`authStore`) + TanStack Query (`QueryClient` in `main.jsx`, `staleTime 30s`, `retry 1`) | `src/stores/`, `src/main.jsx` |
| **Styling** | Tailwind 3.4 + `main.css` CSS-variable design system + `@layer components` (`.portal-*`) + a large block of brittle descendant/`!important` overrides | `tailwind.config.js`, `src/assets/styles/main.css` |
| **Installed UI libs** | `lucide-react`, `framer-motion`, `@tanstack/{react-query,react-table,react-virtual}`, `recharts`, `react-hook-form`, `@hello-pangea/dnd`, `react-hot-toast`, `zustand`, `react-leaflet`+`leaflet`, `@fullcalendar/*`, `@vis.gl/react-google-maps`, `html5-qrcode`, `qrcode.react`, `shadcn` (dev) | `package.json` |
| **Accessibility support** | Partial: global `:focus-visible` outline + `.sr-only` util + `prefers-reduced-motion` for auth animations only | `main.css` |
| **Tests** | **None.** No `*.test.*` / `*.spec.*` files, no Vitest/Playwright config. | — |

**Takeaway:** nearly the entire "preferred" stack in the brief is already installed. The work is **consolidation, consistency, accessibility, and testing** — not adding a parallel design system. Installing shadcn/MUI/etc. now would violate the brief's "no second design system" rule.

---

## B. UX issues (prioritized)

| # | Page/Component | Role | Problem | Severity | Impact | Recommended fix | Complexity | Reusable |
|---|----------------|------|---------|----------|--------|-----------------|------------|----------|
| 1 | Design tokens (`tailwind.config.js` vs `main.css`) | All | **Three different navies** (`brand-navy #0F172A`, `--color-primary #1a4b8c`, sidebar `#123563`) and two token systems that don't reference each other | High | Inconsistent brand color across shell, buttons, charts | Single canonical token source; map Tailwind ↔ CSS vars | M | ✅ |
| 2 | Buttons app-wide | All | **71 raw `bg-blue-600/700` usages across 28 files** kept "on brand" only by `!important` overrides in `main.css` (`.portal-shell button.bg-blue-600{…gold}`) | High | Fragile; any new blue button silently flips gold; unpredictable | Migrate to `<Button>`/token classes; delete the override hack | M | ✅ |
| 3 | `AdminLayout` sidebar badge | Admin | Verification badge renders the **literal string `"pending"`**, not a live count | High | Staff can't see how many employers await review | Wire to real pending-count query; hide when 0 | S | ✅ |
| 4 | `StatCard` trend | Admin/Employer | Trend arrow is **green whenever `value >= 0`**, regardless of whether "up" is good (e.g. rising unemployment) | High | Misleads decisions — flagged explicitly in brief | Add `trendPositiveIsGood` + non-color indicator | S | ✅ |
| 5 | `AdminLayout` header | Admin | Decorative **"Live System"** pill; **duplicate avatar** (sidebar footer + header); no notifications, no breadcrumbs, no search | Medium | Wasted header; no page context; missing notification access | Replace with breadcrumbs + notification bell + single profile menu | M | ✅ |
| 6 | Icons | All | Admin nav uses inline hand-drawn `<svg>`; rest of app uses `lucide-react` | Medium | Visual inconsistency, larger JSX, harder maintenance | Standardize on `lucide-react` | S | ✅ |
| 7 | `NotificationBell` | Seeker + Employer | **Duplicated** component in `pages/seeker/components/` and `pages/employer/components/` | Medium | Divergent behavior, double maintenance | Consolidate into one shared component | S | ✅ |
| 8 | Auth/registration screens | Guest | Heavy **glassmorphism** (`backdrop-filter: blur` on many layers), aurora blobs, grid overlays | Medium | Brief explicitly says avoid glassmorphism-everywhere; perf cost of blur | Reduce to one calm civic treatment | M | ✅ |
| 9 | Shared component location | All | Primitives split between `components/ui/` and `pages/admin/_components/` | Medium | Unclear ownership; seeker/employer can't discover admin primitives | Promote cross-role primitives to `components/ui/` | M | ✅ |
| 10 | Loading states | All | Route-level `<Suspense>` uses a **full-screen centered spinner**; no per-section skeletons | Medium | Layout shift, poor perceived performance | Add `LoadingSkeleton`; skeletonize data regions | M | ✅ |
| 11 | Empty/Error states | All | No shared `EmptyState`/`ErrorState`; pages handle ad hoc | Medium | Inconsistent, often missing recovery actions | Add shared primitives; adopt per page | M | ✅ |
| 12 | Analytics (`LaborAnalyticsPage`) | Admin | Recharts `BarChart` bundle is 361 kB (105 kB gzip) — largest asset; charts' data-question, a11y, and axis honesty need review | High | Slow analytics load; possible misleading/decorative charts | Metric dictionary + chart audit + lazy chart loading | L | ⚠️ |
| 13 | `index.css` / `App.css` | All | **Dead Vite starter boilerplate** (purple `--accent:#aa3bff`, `#root{width:1126px}`) — not imported anywhere | Low | Confusion; risk of accidental use | Delete | S | — |

Severity legend: High = affects trust/decisions/brand integrity; Medium = friction/inconsistency; Low = hygiene.

---

## C. Consistency audit

- **Buttons:** shared `<Button>` (gold primary, 7 variants) coexists with 71 raw Tailwind blue buttons neutralized by `!important`. Not consistent.
- **Color:** three navies (see B1); gold is consistent (`#f59e0b`).
- **Status colors:** `StatCard` hardcodes `blue/green/amber/red/slate` Tailwind maps; `StatusBadge` is separate. No shared status token map.
- **Typography:** `main.css` sets DM Sans / DM Serif Display (loaded via remote `@import`); dead `index.css` sets `system-ui`. Type scale lives in ad-hoc Tailwind classes, not tokens.
- **Spacing/containers:** `.portal-page` = `max-w-[1480px]`; other pages set their own widths. No shared container token.
- **Icons:** inline SVG (admin nav) vs `lucide-react` (everywhere else).
- **Modals:** three bespoke implementations, no shared Dialog (no focus trap guarantee).
- **Empty/loading/pagination/validation:** handled per page; no shared primitives.
- **Date formats:** to inventory in Phase 2 (no central date util confirmed yet).

---

## D. Accessibility audit (static pass — runtime pass scheduled)

- **Focus:** global `:focus-visible` = 3px amber outline (good baseline). Verify contrast of amber ring on white/gold backgrounds. **[runtime-pending]** keyboard traversal of menus/dialogs.
- **Semantics:** admin nav icons are decorative `<svg>` without `aria-hidden`; nav lacks `aria-current` beyond `NavLink` active class. Header "Live System" is decorative noise.
- **Color-only meaning:** `StatCard` trend conveys direction by color alone → fails 1.4.1. Fix with arrow + sign.
- **Dialogs:** bespoke modals — focus trapping/Esc/restore-focus unverified. **[runtime-pending]**
- **Charts:** no text alternative / data-table fallback confirmed for Recharts. **[runtime-pending]**
- **Reduced motion:** respected only for auth animations; the global `.page-enter` fadeUp and framer-motion usages need a global guard.
- **Color scheme:** dead `index.css` declares `color-scheme: light dark` — could trigger unwanted dark form controls; removing it de-risks.
- **Touch targets:** nav links `min-h-11` (44px) — good; audit dense table/action rows. **[runtime-pending]**
- **Contrast:** `--color-text-3 #94a3b8` on white ≈ 2.8:1 — **fails AA** for normal text; restrict to non-essential. Gold `#f59e0b` text on white fails AA — ensure gold is background-only with navy text (as `<Button>` already does).

---

## E. Responsive audit **[runtime-pending]**

Static observations to verify at 360/390/768/1024/1280/1440:
- Admin sidebar fixed `w-[280px]` desktop, drawer on mobile (`md:` breakpoint) — verify tablet (768) doesn't clip content.
- `.portal-page max-w-[1480px]` — verify gutters at 1440.
- Data tables: `DataTable` responsive behavior (horizontal scroll vs stacked) unverified — priority for mobile.
- Analytics charts: Recharts `ResponsiveContainer` usage and label legibility at 360 unverified.
- Registration journey has extensive `min-height`/`overflow:hidden` desktop rules — verify no clipping at short viewports.

Full matrix will be recorded in `ACCESSIBILITY_REPORT.md` / `PERFORMANCE_REPORT.md` as phases execute.

---

## Summary of the biggest levers

1. **One token source** (kills the 3-navy drift and the `!important` button hack) — unblocks everything else.
2. **Reuse, don't rebuild** — `Button`, `Card`, `DataTable`, `PageHeader`, `StatCard`, `StatusBadge`, Recharts, TanStack Query are all present.
3. **Trust-critical correctness** — real verification counts, honest trend direction, honest analytics axes/definitions.
4. **Testing from zero** — establish Vitest + RTL + axe; there is currently no safety net.
