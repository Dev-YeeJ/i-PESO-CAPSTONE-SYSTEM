// Categorical chart palette — single source for JS charting (Recharts needs raw
// hex, so it can't read Tailwind classes). Mirrors the `chart-1..8` tokens in
// tailwind.config.js. Assign in fixed order, never cycled/recolored by rank.
//
// Validated with the dataviz validator (light surface): PASS lightness band,
// chroma floor, and CVD separation (worst adjacent ΔE 40.3). The gold slot
// carries a sub-3:1 surface-contrast WARN that is relieved by the charts'
// legends + direct value labels (never color-alone).
export const CHART_COLORS = [
  '#2563eb', // 1 blue   — primary/brand series
  '#f59e0b', // 2 gold   — accent series (always labelled)
  '#0d9488', // 3 teal
  '#7c3aed', // 4 violet
  '#0369a1', // 5 deep cyan
  '#65a30d', // 6 green
  '#be185d', // 7 magenta
  '#b45309', // 8 amber-brown
]

export const CHART_PRIMARY = CHART_COLORS[0]
export const CHART_ACCENT = CHART_COLORS[1]

// Recessive chart chrome (grid, axis text) — text tokens, not series colors.
export const CHART_GRID = '#e2e8f0'
export const CHART_AXIS_TEXT = '#64748b'
