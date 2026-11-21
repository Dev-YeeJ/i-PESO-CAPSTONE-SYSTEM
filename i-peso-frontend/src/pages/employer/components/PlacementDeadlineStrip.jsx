import { useQuery } from '@tanstack/react-query'
import { CalendarClock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { listEmployerPlacementReports } from '@/services/placementReportService'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * Dashboard reminder for the monthly placement report. Each month's report
 * (all hires, i-PESO or not) is due by `deadline_day` of the following month.
 * Shows nothing once last month's report is in, unless PESO returned it.
 */
export default function PlacementDeadlineStrip({ now = new Date() }) {
  const { data } = useQuery({
    queryKey: ['employer', 'placement-reports'],
    queryFn: listEmployerPlacementReports,
    staleTime: 5 * 60_000,
    retry: 1,
  })
  if (!data?.deadline_day) return null

  const coverage = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const month = coverage.getMonth() + 1
  const year = coverage.getFullYear()
  const report = (data.data ?? []).find((item) => Number(item.coverage_month) === month && Number(item.coverage_year) === year)
  const label = `${MONTHS[month - 1]} ${year}`

  if (report && report.status === 'rejected') {
    return (
      <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="status">
        <RotateCcw className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{label} placement report was returned by PESO</p>
          <p className="text-sm text-red-900/80">{report.review_remarks || 'Open the report to see what to fix, then resubmit it.'}</p>
        </div>
        <Button to="/employer/reports/placement-report" variant="secondary" size="sm">Fix and resubmit</Button>
      </div>
    )
  }
  if (report) return null

  const due = new Date(now.getFullYear(), now.getMonth(), data.deadline_day)
  const daysLeft = Math.ceil((due - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000)
  const overdue = daysLeft < 0
  const dueLabel = due.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })

  return (
    <div className={`flex flex-wrap items-start gap-3 rounded-2xl border p-4 ${overdue ? 'border-red-200 bg-red-50 text-red-900' : 'border-brand-gold/40 bg-[#fffbeb] text-slate-900'}`} role="status">
      <CalendarClock className={`mt-0.5 h-5 w-5 shrink-0 ${overdue ? '' : 'text-[#d97706]'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {overdue ? `${label} placement report is overdue` : `${label} placement report is due ${dueLabel}`}
          {!overdue && <span className="font-normal text-slate-600"> ({daysLeft === 0 ? 'today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`})</span>}
        </p>
        <p className="text-sm text-slate-700">Report every hire, including hires that didn&apos;t come through i-PESO. If you hired no one, you can declare no hires in one step.</p>
      </div>
      <Button to="/employer/reports/placement-report" variant="secondary" size="sm">Start report</Button>
    </div>
  )
}
