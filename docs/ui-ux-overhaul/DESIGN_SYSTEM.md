# i-PESO Design System

**Direction:** *Modern Philippine civic technology with professional employment-service credibility* — trustworthy, calm, organized, data-driven, approachable to non-technical users. Navy + gold institutional identity, retained but disciplined.

**Architecture:** two mirrored layers kept in sync —
1. **CSS variables** in `src/assets/styles/main.css` (`:root`) — the runtime source, themeable, mobile-parity-ready (dark mode organized-for-later, not enabled).
2. **Tailwind theme** in `tailwind.config.js` — utility mirror of the same values.

> Rule: a color/space/radius value is defined **once** per layer and referenced everywhere. New brand colors go in both layers with identical hex. Never hardcode a brand hex in a component.

---

## Color tokens

### Brand
| Token | Hex | Use |
|-------|-----|-----|
| `--color-primary` / `brand-navy` | `#123563` | Primary civic navy: shell, headings, primary text-on-light. **Canonical (reconciled Phase 2.3).** |
| `--color-primary-dark` | `#0f2d56` | Hover/active navy |
| `--color-accent` / `brand-gold` | `#f59e0b` | Primary **action** color — **background only, navy text** |
| `--color-accent-dark` | `#d97706` | Gold hover |
| `brand-canvas` / `--color-bg` | `#f8fafc` | App background |
| `surface` / `--color-surface` | `#ffffff` | Cards/panels |

**Navy is now a single source.** `brand-navy` (token) and `--color-primary` (CSS var) are both `#123563`; the sidebar references the token (no hardcoded hex). The old near-black `#0F172A` and stray `#1a4b8c` no longer appear as the brand navy. White on `#123563` ≈ 9.7:1 (AAA). `#1a4b8c` survives only as the distinct **`--color-seeker`** role color, not as a navy.

### Semantic (added to Tailwind in Phase 1, additive)
| Token | Hex | `-bg` (tint) |
|-------|-----|--------------|
| `success` | `#16a34a` | `#f0fdf4` |
| `warning` | `#d97706` | `#fffbeb` |
| `danger` | `#dc2626` | `#fef2f2` |
| `info` | `#0369a1` | `#f0f9ff` |

### Status (lifecycle — non-color label always paired)
Application: submitted `info` · reviewed `#6366f1` · shortlisted `warning` · interview `#7c3aed` · offered `#0d9488` · hired `success` · rejected `danger` · withdrawn `#64748b`.
Verification: pending `warning` · verified `success` · rejected `danger`.

### Chart palette (categorical — dataviz-validated, light surface)
`chart-1 #2563eb` · `chart-2 #f59e0b` · `chart-3 #0d9488` · `chart-4 #7c3aed` · `chart-5 #0369a1` · `chart-6 #65a30d` · `chart-7 #be185d` · `chart-8 #b45309`.
Ran `dataviz` `validate_palette.js` (light): **PASS** lightness band, chroma floor, and CVD separation (worst adjacent ΔE 40.3). Gold (`chart-2`) has a sub-3:1 surface-contrast **WARN** → always ship it with a legend/direct value label (the analytics charts do). Single JS source: `src/design-system/chartColors.js` (Recharts needs raw hex). Assign in fixed order, never cycled or recolored by rank. Reserve pure `danger` red for genuinely negative series. Dark-mode steps to be validated when dark mode ships.

### Text (contrast-checked)
`--color-text #0f172a` (AA on white) · `--color-text-2 #475569` (AA) · `--color-text-3 #94a3b8` — **decorative only, fails AA for body text**; do not use for essential content.

---

## Typography
- **Display:** DM Serif Display — headings used with restraint (page titles, hero).
- **Body/UI:** DM Sans.
- *Fonts currently load via remote `@import` in `main.css`; Phase 6 should self-host to remove the render-blocking request.*
- Scale (Tailwind): `text-xs`→`text-3xl`; page title `portal-title` = `text-2xl sm:text-3xl font-bold tracking-tight`; eyebrow `portal-eyebrow` = `text-xs font-bold uppercase tracking-[0.18em]`.

## Spacing, radius, shadow, focus
- **Spacing:** Tailwind 4px scale.
- **Radius:** `--radius-sm 4 / md 8 / lg 12 / xl 16 / 2xl 24 / full`. Cards use `rounded-xl`. Avoid over-rounding (brief).
- **Shadow:** `shadow-card` (subtle) / `shadow-elevated`. Avoid heavy shadow stacking.
- **Focus ring:** token `--focus` = `#2563eb` (3px, offset 2). Verify AA-visible on gold/navy.
- **Containers:** `maxWidth.content` = `1480px` (`.portal-page`).
- **Breakpoints:** Tailwind defaults; QA matrix at 360/390/768/1024/1280/1440.

---

## Component conventions

**Reuse these (don't recreate):** `Button` (variants: primary/accent/navy/secondary/outline/danger/ghost; sizes sm/md/lg), `Card`+`CardHeader`, `DataTable`, `PageHeader`, `StatCard`, `StatusBadge`, `Badge`, `AlertBox`, `ConfirmModal`.

**New primitives (Phase 1):**

### `EmptyState`
```jsx
<EmptyState icon={Inbox} title="No employers to verify"
  description="New employer registrations will appear here for review."
  action={{ label: 'Refresh', onClick }} filtered={false} />
```
`filtered` switches copy to a "no results for your filters — clear filters" variant.

### `ErrorState`
```jsx
<ErrorState title="Couldn't load applicants"
  description="The server didn't respond. Check your connection and try again."
  onRetry={refetch} error={err} /> {/* raw error shown in dev only */}
```

### `LoadingSkeleton`
```jsx
<LoadingSkeleton variant="table" rows={8} />      // table | card | stat | text | chart
```
Layout-preserving, `animate-pulse`, respects `prefers-reduced-motion`, `aria-hidden` + `role="status"` wrapper with sr-only "Loading".

**Every shared component provides:** consistent variants, clear props, accessible semantics (labels, `aria-*`, non-color state), loading + disabled states, responsive behavior, no page-specific hardcoded content.

---

## Accessibility floor (WCAG 2.2 AA)
Keyboard-operable everything · visible focus · labels + descriptions · semantic landmarks/headings · non-color status · AA contrast · reduced-motion honored · min 44px touch targets · form errors announced · skip-to-content.

## Dark mode
Not shipped now. Tokens are structured as CSS variables so a `[data-theme="dark"]` override layer can be added later without touching components.
