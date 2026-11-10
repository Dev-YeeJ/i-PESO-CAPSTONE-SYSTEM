import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlarmClock, CheckCircle2, ClipboardCheck, GraduationCap } from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import StatCard from '@/pages/admin/_components/StatCard'
import DataTable from '@/pages/admin/_components/DataTable'
import { staffService } from '@/services/staffService'
import { useAuthStore } from '@/stores/authStore'
import { isSystemAdministrator } from '@/utils/adminAccess'
import { daysLeftLabel } from '@/utils/ojt'
import HoursProgress from './HoursProgress'
import InternLogsDialog from './InternLogsDialog'

/**
 * The OJT / Interns tab of Staff Management: every intern's hours at a
 * glance; open one to review their daily time record.
 */
export default function OjtInternsPanel() {
  const user = useAuthStore((s) => s.user)
  const canReview = isSystemAdministrator(user)
  const [openId, setOpenId] = useState(null)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'ojt', 'interns'], queryFn: staffService.getInterns })
  const summary = data?.summary ?? {}

  const columns = [
    {
      key: 'name',
      label: 'Intern',
      render: (_, intern) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); setOpenId(intern.id) }}
            className="max-w-full truncate text-left font-bold text-slate-900 hover:text-brand-navy hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40"
          >
            {intern.name}
          </button>
          <p className="truncate text-xs text-slate-500">{intern.progress.school ?? 'School not set'}</p>
        </div>
      ),
    },
    { key: 'progress', label: 'Hours', render: (progress) => <HoursProgress progress={progress} compact /> },
    {
      key: 'pending',
      label: 'To review',
      render: (_, intern) => {
        const { pending_entries: pending, incomplete_entries: incomplete } = intern.progress
        if (!pending && !incomplete) return <span className="text-sm text-slate-400">Nothing</span>
        return (
          <div className="space-y-1 text-xs font-semibold">
            {pending > 0 && <p className="text-amber-700">{pending} waiting for approval</p>}
            {incomplete > 0 && <p className="text-red-700">{incomplete} without time out</p>}
          </div>
        )
      },
    },
    {
      key: 'status',
      label: 'Internship',
      render: (_, intern) => {
        const { progress } = intern
        if (progress.ended) return <Badge status="closed">Ended</Badge>
        if (intern.status !== 'active') return <Badge status="closed">Deactivated</Badge>
        if (progress.hours_completed) return <Badge status="approved">Hours completed</Badge>
        return <span className={`text-sm font-medium ${progress.ending_soon ? 'text-amber-700' : 'text-slate-600'}`}>{daysLeftLabel(progress)}</span>
      },
    },
  ]

  return (
    <div className="mt-4">
      <p className="text-sm text-slate-600">
        {canReview
          ? 'Review interns’ daily time in and time out. Hours count toward their requirement once you approve them.'
          : 'Interns’ hours and daily time records. Only the system administrator approves hours.'}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={GraduationCap} color="blue" label="Active interns" value={(summary.active ?? 0).toLocaleString()} subtitle="Can time in today" />
        <StatCard icon={ClipboardCheck} color="amber" label="Waiting for approval" value={(summary.pending_entries ?? 0).toLocaleString()} subtitle="Time entries to review" />
        <StatCard icon={AlarmClock} color="red" label="Ending soon" value={(summary.ending_soon ?? 0).toLocaleString()} subtitle="Within 3 days" />
        <StatCard icon={CheckCircle2} color="green" label="Hours completed" value={(summary.completed ?? 0).toLocaleString()} subtitle="Met the required hours" />
      </div>

      <Card padding="none" className="mt-6">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <h2 className="text-base font-bold text-slate-950">Interns</h2>
          <p className="text-sm text-slate-500">To add an intern, use Add staff member and choose the OJT / Intern position.</p>
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          onRowClick={(intern) => setOpenId(intern.id)}
          caption="OJT interns and their hours. Select a row to open the daily time record."
          emptyTitle="No interns yet"
          emptyDescription="Use Add staff member and choose the OJT / Intern position."
        />
      </Card>

      {openId && <InternLogsDialog internId={openId} canReview={canReview} onClose={() => setOpenId(null)} />}
    </div>
  )
}
