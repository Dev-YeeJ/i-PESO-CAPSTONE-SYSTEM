// The numbers behind a downloadable chart, as a table: printed under the chart in
// image/PDF downloads and saved as CSV. Pure functions so they're easy to test.
//
// A chart "spec" describes one chart (built by each analytics page):
//   { id, title, subtitle?, section?, notes?: string[],
//     kind: 'line' | 'area' | 'columns'   → rows: [{ x, [seriesKey]: n }], series: [{ key, label, color? }], xLabel?, formatX?
//     kind: 'bar' | 'donut'               → items: [{ label, value }], itemLabel?, valueLabel?, share?: bool, unit? }
import { CHART_COLORS } from '@/design-system/chartColors'

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)
export const formatCount = (value) => number(value).toLocaleString('en-PH')
const formatShare = (value, total) => (total > 0 ? `${((number(value) / total) * 100).toFixed(1)}%` : '0.0%')

/** { columns: [{ label, align }], rows: [{ cells, swatch? }], total: cells | null } */
export function chartTable(spec) {
  if (['line', 'area', 'columns'].includes(spec.kind)) {
    const formatX = spec.formatX ?? ((value) => value)
    const series = spec.series ?? []
    const rows = (spec.rows ?? []).map((row) => ({ cells: [String(formatX(row.x)), ...series.map((s) => formatCount(row[s.key]))] }))
    const sums = series.map((s) => (spec.rows ?? []).reduce((sum, row) => sum + number(row[s.key]), 0))
    return {
      columns: [{ label: spec.xLabel ?? 'Period', align: 'left' }, ...series.map((s) => ({ label: s.label, align: 'right' }))],
      rows,
      total: rows.length > 1 ? ['Total', ...sums.map(formatCount)] : null,
    }
  }

  const items = spec.items ?? []
  const total = items.reduce((sum, item) => sum + number(item.value), 0)
  const valueLabel = spec.valueLabel ?? (spec.unit ? capitalize(spec.unit) : 'Count')

  if (spec.kind === 'donut') {
    return {
      columns: [{ label: spec.itemLabel ?? 'Category', align: 'left' }, { label: valueLabel, align: 'right' }, { label: 'Share', align: 'right' }],
      rows: items.map((item, index) => ({
        cells: [item.label ?? 'Not specified', formatCount(item.value), formatShare(item.value, total)],
        swatch: CHART_COLORS[index % CHART_COLORS.length],
      })),
      total: ['Total', formatCount(total), items.length ? '100.0%' : '0.0%'],
    }
  }

  // 'bar': a ranking. Shares only when the bars are parts of one whole (spec.share).
  return {
    columns: [
      { label: '#', align: 'right' },
      { label: spec.itemLabel ?? 'Item', align: 'left' },
      { label: valueLabel, align: 'right' },
      ...(spec.share ? [{ label: 'Share', align: 'right' }] : []),
    ],
    rows: items.map((item, index) => ({
      cells: [String(index + 1), item.label ?? 'Not specified', formatCount(item.value), ...(spec.share ? [formatShare(item.value, total)] : [])],
    })),
    total: spec.share ? ['', 'Total', formatCount(total), items.length ? '100.0%' : '0.0%'] : null,
  }
}

/** The chart's table as CSV, with the title and coverage lines on top. */
export function tableToCsv(spec, context = {}) {
  const table = chartTable(spec)
  const lines = [
    [spec.title],
    ...(context.coverage ?? []).map((line) => [line]),
    [],
    table.columns.map((column) => column.label),
    ...table.rows.map((row) => row.cells),
    ...(table.total ? [table.total] : []),
  ]
  return lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n')
}

function csvCell(value) {
  const text = String(value ?? '')
  // A leading = + - @ would run as a formula in Excel.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/** e.g. "gender-distribution-2026-11-23.png" */
export function reportFileName(title, extension, date = new Date()) {
  const slug = String(title || 'chart')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'chart'
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date)
  return `${slug}-${day}.${extension}`
}

/** True when a spec has something to draw. */
export const hasChartData = (spec) => Boolean(spec && ((spec.rows ?? []).length || (spec.items ?? []).length))

const capitalize = (text) => String(text).charAt(0).toUpperCase() + String(text).slice(1)
