import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, Clock3, MinusCircle, RotateCcw, Search } from 'lucide-react'
import { Card, ConfirmDialog, EmptyState, ErrorState } from '@/components/ui'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { sendPlacementReminder } from '@/services/placementReportService'
import { usePlacementComplianceGrid } from './complianceGrid'
import toast from '@/lib/toast'

const STATES = {
  approved: { label: 'Approved', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending_review: { label: 'Waiting for review', icon: Clock3, classes: 'bg-[#e8f0fc] text-brand-navy border-[#c9d9f2]' },
  nil: { label: 'No hires declared', icon: MinusCircle, classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  needs_revision: { label: 'Returned for revision', icon: RotateCcw, classes: 'bg-amber-50 text-amber-800 border-amber-200' },
  overdue: { label: 'Overdue', icon: AlertTriangle, classes: 'bg-red-50 text-red-700 border-red-200' },
  due: { label: 'Not due yet', icon: CalendarClock, classes: 'bg-white text-slate-500 border-dashed border-slate-300' },
}

/** Cells PESO can chase: nothing accepted yet for that month. */
const REMINDABLE = new Set(['overdue', 'needs_revision', 'due'])
const VISIBLE_STEP = 40

const monthName = (year, month) => new Date(year, month - 1, 1).toLocaleString('en-PH', { month: 'long', year: 'numeric' })
const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

export default function PlacementComplianceGrid({ year, onYearChange }) {
  const query = usePlacementComplianceGrid(year)
  const [search, setSearch] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [visible, setVisible] = useState(VISIBLE_STEP)
  const [target, setTarget] = useState(null)
  // Reminders sent this session, so the same cell isn't chased twice by accident.
  const [reminded, setReminded] = useState(() => new Set())

  const remind = useMutation({
    mutationFn: sendPlacementReminder,
    onSuccess: (res, vars) => {
      toast.success(res?.message ?? 'Reminder sent.')
      setReminded((current) => new Set(current).add(`${vars.employerId}-${vars.month}`))
      setTarget(null)
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? 'The reminder could not be sent. Try again in a moment.')
    },
  })

  const grid = query.data
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (grid?.rows ?? [])
      .filter((row) => !needle || (row.company_name ?? '').toLowerCase().includes(needle))
      .filter((row) => !onlyMissing || row.missing > 0)
      .sort((a, b) => (onlyMissing ? b.missing - a.missing : 0))
  }, [grid, search, onlyMissing])

  const thisYear = new Date().getFullYear()
  const years = [thisYear, thisYear - 1, thisYear - 2]

  return (
    <Card padding="none" className="mt-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Placement report compliance</h2>
          <p className="text-sm text-slate-500">Each employer&apos;s monthly placement report, by month. Select a missing month to send that employer a reminder.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search employers</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisible(VISIBLE_STEP) }}
              placeholder="Search employers"
              className="h-10 w-56 rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </label>
          <button
            type="button"
            aria-pressed={onlyMissing}
            onClick={() => { setOnlyMissing((v) => !v); setVisible(VISIBLE_STEP) }}
            className={`h-10 rounded-full border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${onlyMissing ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-brand-navy'}`}
          >
            Missing reports only
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="sr-only sm:not-sr-only">Year</span>
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
      </div>

      <Legend />

      {query.isLoading && (
        <div className="space-y-2 p-5" aria-busy="true" aria-label="Loading compliance">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      )}

      {query.isError && <ErrorState size="sm" error={query.error} onRetry={() => query.refetch()} title="Compliance couldn't be loaded" />}

      {grid && grid.months.length === 0 && (
        <EmptyState size="sm" icon={CalendarClock} title={`No ${year} reports are due yet`} description="The first report of the year covers January and is due in February." />
      )}

      {grid && grid.months.length > 0 && rows.length === 0 && (
        <EmptyState
          size="sm"
          filtered={Boolean(search) || onlyMissing}
          title={search || onlyMissing ? 'No employers match' : 'No reporting employers yet'}
          description={search || onlyMissing ? 'Clear the search or show all employers.' : 'Verified employers appear here once they are expected to report.'}
        />
      )}

      {grid && grid.months.length > 0 && rows.length > 0 && (
        <TooltipProvider delayDuration={150}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <caption className="sr-only">Placement report status for each employer and month of {year}</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 border-b border-slate-200 bg-white px-5 py-3 text-left font-semibold text-slate-600">Employer</th>
                  {grid.months.map((m) => (
                    <th key={m.month} scope="col" className="border-b border-slate-200 px-1 py-3 text-center font-semibold text-slate-600">
                      <span title={`Due ${formatDate(m.due_date)}`}>{m.label}</span>
                    </th>
                  ))}
                  <th scope="col" className="border-b border-slate-200 px-5 py-3 text-right font-semibold text-slate-600">Missing</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, visible).map((row) => (
                  <tr key={row.employer_id} className="group">
                    <th scope="row" className="sticky left-0 z-10 max-w-[16rem] truncate border-b border-slate-100 bg-white px-5 py-2 text-left font-medium text-slate-900 group-hover:bg-slate-50">
                      {row.company_name}
                    </th>
                    {row.cells.map((cell) => {
                      const info = grid.months.find((m) => m.month === cell.month)
                      return (
                        <td key={cell.month} className="border-b border-slate-100 px-1 py-2 text-center group-hover:bg-slate-50">
                          <Cell
                            cell={cell}
                            company={row.company_name}
                            period={monthName(year, cell.month)}
                            dueDate={info?.due_date}
                            reminded={reminded.has(`${row.employer_id}-${cell.month}`)}
                            onRemind={() => setTarget({ employerId: row.employer_id, company: row.company_name, month: cell.month, state: cell.state })}
                          />
                        </td>
                      )
                    })}
                    <td className={`border-b border-slate-100 px-5 py-2 text-right font-semibold group-hover:bg-slate-50 ${row.missing > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                      {row.missing}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > visible && (
            <div className="border-t border-slate-100 p-4 text-center">
              <button type="button" onClick={() => setVisible((v) => v + VISIBLE_STEP)} className="text-sm font-semibold text-brand-navy hover:underline">
                Show more employers ({rows.length - visible} left)
              </button>
            </div>
          )}
        </TooltipProvider>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => { if (!open && !remind.isPending) setTarget(null) }}
        title="Send a reminder?"
        description={target ? `${target.company} gets a bell notification and an email asking for their ${monthName(year, target.month)} placement report.${target.state === 'needs_revision' ? ' Their last submission was returned, so the email asks them to resubmit.' : ''}` : ''}
        confirmLabel="Send reminder"
        variant="primary"
        busy={remind.isPending}
        onConfirm={() => target && remind.mutate({ employerId: target.employerId, month: target.month, year })}
      />
    </Card>
  )
}

function Cell({ cell, company, period, dueDate, reminded, onRemind }) {
  if (cell.state === 'not_required') {
    return <span className="text-slate-300" aria-label={`${period}: not required, not yet verified`}>–</span>
  }

  const look = STATES[cell.state] ?? STATES.due
  const Icon = reminded ? BellRing : look.icon
  const lateNote = cell.late ? ', submitted late' : ''
  const dueNote = cell.state === 'due' && dueDate ? `, due ${formatDate(dueDate)}` : ''
  const description = `${look.label}${dueNote}${lateNote}${reminded ? ', reminder sent' : ''}`
  const canRemind = REMINDABLE.has(cell.state) && !reminded

  const body = (
    <span className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border ${look.classes}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {cell.late && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" aria-hidden="true" />}
    </span>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {canRemind ? (
          <button
            type="button"
            onClick={onRemind}
            aria-label={`${company}, ${period}: ${description}. Send reminder`}
            className="rounded-lg transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {body}
          </button>
        ) : (
          <span tabIndex={0} aria-label={`${company}, ${period}: ${description}`} className="inline-flex rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            {body}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>
        {period}: {description}{canRemind ? '. Select to send a reminder.' : ''}
      </TooltipContent>
    </Tooltip>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-600 sm:px-6" aria-label="Legend">
      {Object.entries(STATES).map(([key, look]) => {
        const Icon = look.icon
        return (
          <li key={key} className="flex items-center gap-1.5">
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded border ${look.classes}`}>
              <Icon className="h-3 w-3" aria-hidden="true" />
            </span>
            {look.label}
          </li>
        )
      })}
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
        Submitted late
      </li>
    </ul>
  )
}
