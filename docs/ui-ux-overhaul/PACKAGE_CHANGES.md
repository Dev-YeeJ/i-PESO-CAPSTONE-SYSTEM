# Package Changes

All changes use the existing package manager (**npm**). No packages were removed.

## Added (Phase 1) — shadcn/ui runtime foundation
The project already listed `shadcn` (the CLI) in devDependencies and had a `components.json`, but the runtime the generated components need was missing. Added:

| Package | Why | React 19 | License |
|---------|-----|----------|---------|
| `clsx` | class composition (used by `cn`) | ✅ | MIT |
| `tailwind-merge` | resolve conflicting Tailwind classes in `cn` | ✅ | MIT |
| `class-variance-authority` | variant API for shadcn components | ✅ | Apache-2.0 |
| `tailwindcss-animate` | `animate-in/out` utilities for Dialog/Tooltip | ✅ | MIT |
| `@radix-ui/react-dialog` | accessible modal (focus trap, Esc, scroll-lock) — fills audit gap #D "dialog focus trapping" | ✅ (1.1+) | MIT |
| `@radix-ui/react-tooltip` | accessible tooltip for KPI hints | ✅ | MIT |
| `@radix-ui/react-slot` | `asChild` composition | ✅ | MIT |

Install: `npm install clsx tailwind-merge class-variance-authority tailwindcss-animate @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-slot` — 35 transitive packages, no peer conflicts on React 19.

## Not added (already present — do not duplicate)
`@tanstack/react-query`, `@tanstack/react-table`, `@tanstack/react-virtual`, `recharts`, `react-hook-form`, `@hello-pangea/dnd`, `react-hot-toast`, `zustand`, `lucide-react`, `framer-motion`, `leaflet`/`react-leaflet`, `@fullcalendar/*`, `tailwindcss`, `shadcn` (CLI).

## Added (testing) — dev dependencies
`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `axe-core`, `vitest-axe`. Wired via `vite.config.js` (`test` block) + `src/test/setup.js`; `npm test` / `npm run test:watch` scripts added. 44 tests passing. No React 19 peer conflicts.

## Deferred (add only when justified)
- `zod` — when a form's validation complexity exceeds RHF's built-ins.
- `playwright` — end-to-end + real-browser responsive/contrast (the remaining test gap).
- Further shadcn components: the config is now functional, but **`shadcn@latest` (v4) is Tailwind-v4-oriented and fights this v3 project** — use `npx shadcn@2 add <name>` or the MCP server configured in `i-peso-frontend/.mcp.json`. **Windows hazard:** never `add button/card/badge` (lowercase files overwrite the existing PascalCase `Button.jsx`/`Card.jsx`/`Badge.jsx` on a case-insensitive FS); `dialog`/`tooltip` and other non-colliding names are safe.

## Pre-existing `npm audit` findings
`npm install` reports 4 vulnerabilities (1 low, 1 moderate, 2 high) that **predate** this work. Not addressed here to avoid unrelated dependency churn mid-overhaul; triage scheduled for Phase 6 with `npm audit`.

## Files removed
- `src/index.css`, `src/App.css` — dead Vite starter boilerplate, imported nowhere.
