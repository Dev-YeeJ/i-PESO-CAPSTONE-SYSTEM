# Performance Report

**Method:** `npm run build` (Vite 8 / Rolldown) before and after changes.

**Verification status:** build-time metrics below are real and current. The app also **boots and serves (dev server → HTTP 200, no runtime errors)**, so it compiles and runs. **Runtime traces (Lighthouse, React Profiler, long-tasks, CLS) are still NOT captured** — they need a real browser session and remain the main performance gap.

## Baseline (largest chunks, gzip)

| Chunk | Raw | Gzip | Note |
|-------|-----|------|------|
| `BarChart` (Recharts) | 361 kB | **105 kB** | Largest asset; loads with any charted view |
| `index` (app entry) | 307 kB | 91 kB | Core shell/router/vendor |
| `TileLayer` (Leaflet) | 153 kB | 45 kB | Map views |
| `LandingPage` | 128 kB | 41 kB | Public entry — heavy for a landing page |
| `seekerProfileVocabularies` | 113 kB | 30 kB | Static vocab data |
| `LaborAnalyticsPage` | 76 kB | 21 kB | + pulls BarChart |
| `SeekerOnboarding` | 79 kB | 20 kB | |
| `DataTable` | 72 kB | 20 kB | TanStack-based shared table |

Build time ~8–11s. Code-splitting is already in place (every route is `lazy()`).

## Phase 1 impact
- App entry `index`: **306.59 → 306.68 kB** (+0.09 kB). shadcn Dialog/Tooltip (Radix) tree-shake; Tooltip currently lands only in the lazy admin chunk via `StatCard`. New `EmptyState`/`ErrorState`/`LoadingSkeleton` add negligible weight and are not yet imported by pages.
- No route bundle regressed materially.

## Observations & opportunities (for later phases)
1. **Recharts is the #1 payload (105 kB gzip).** Ensure analytics charts are imported only within analytics routes (they appear to be) and consider per-chart dynamic import so a single KPI view doesn't pull the whole charting core. *Measure before/after.*
2. **`LandingPage` at 41 kB gzip** is large for a public page — audit for heavy imports pulled eagerly.
3. **Monolithic `main.css`** (~1,000+ lines, many brittle descendant selectors) makes Vite spend ~46% of build time in `vite:css-post`. Splitting/trimming it (Phase 2 token reconciliation) will cut build time and CSS payload.
4. **QueryClient** already sets `staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false` — good defaults; audit per-view for duplicate fetches in Phase 2–5.
5. **Route `<Suspense>` fallback** is a full-screen spinner → layout shift. Replacing with `LoadingSkeleton` (now available) improves perceived performance and CLS.

## Rule for this project
Measure first (build stats + a runtime trace), change, measure again. No speculative memoization.
