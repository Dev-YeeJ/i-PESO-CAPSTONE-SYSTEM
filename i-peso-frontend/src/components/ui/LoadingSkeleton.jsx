/**
 * LoadingSkeleton — layout-preserving placeholders for loading data regions.
 * Pulse animation is disabled under `prefers-reduced-motion`.
 *
 * @param {'table'|'card'|'stat'|'text'|'chart'} [variant]
 * @param {number} [rows]    number of repeated rows/items (table/text/card lists)
 * @param {number} [columns] table columns
 */
const bar = 'rounded bg-slate-200/80'

function Bar({ className = '' }) {
  return <div className={`${bar} ${className}`} />
}

function TableSkeleton({ rows = 8, columns = 4 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Bar key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Bar key={c} className={`h-3 flex-1 ${c === 0 ? 'max-w-[40%]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

function StatSkeleton({ rows = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
          <Bar className="h-3 w-24" />
          <Bar className="mt-3 h-7 w-20" />
          <Bar className="mt-3 h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

function CardSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
          <Bar className="h-4 w-1/3" />
          <Bar className="mt-3 h-3 w-full" />
          <Bar className="mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <Bar className="h-4 w-40" />
      <div className="mt-6 flex h-48 items-end gap-3">
        {[60, 85, 45, 70, 95, 55, 75, 40].map((h, i) => (
          <div key={i} className={`${bar} w-full`} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

function TextSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Bar key={i} className={`h-3 ${i === rows - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export default function LoadingSkeleton({ variant = 'text', rows, columns, className = '' }) {
  const map = {
    table: <TableSkeleton rows={rows} columns={columns} />,
    stat: <StatSkeleton rows={rows} />,
    card: <CardSkeleton rows={rows} />,
    chart: <ChartSkeleton />,
    text: <TextSkeleton rows={rows} />,
  }
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`motion-safe:animate-pulse ${className}`}
    >
      {map[variant] ?? map.text}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
