import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CalendarClock, CheckCircle2, Clock, LogIn, LogOut, PartyPopper } from 'lucide-react'
import { Badge, Button, Card, ErrorState, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import { staffService } from '@/services/staffService'
import { useAuthStore } from '@/stores/authStore'
import { daysLeftLabel, formatClock, formatHours, formatWorkDate, ojtStatus } from '@/utils/ojt'
import HoursProgress from './components/HoursProgress'

const KEY = ['admin', 'ojt', 'me']

/** An OJT intern's daily time record: Time In / Time Out, progress and history. */
export default function MyOjtPage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const isIntern = user?.position === 'ojt_intern'

  const { data, isLoading, error, refetch } = useQuery({ queryKey: KEY, queryFn: staffService.getMyOjt, enabled: isIntern })

  const punch = useMutation({
    mutationFn: (action) => (action === 'in' ? staffService.timeIn() : staffService.timeOut()),
    onSuccess: (result) => {
      queryClient.setQueryData(KEY, result)
      toast.success(result.message)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? 'That did not go through. Please try again.')
      queryClient.invalidateQueries({ queryKey: KEY })
    },
  })

  if (!isIntern) {
    return (
      <div className="portal-page">
        <PageHeader title="My OJT Hours" eyebrow="OJT / Internship" />
        <Card className="mt-6 text-sm text-slate-600">Only OJT intern accounts keep a time record.</Card>
      </div>
    )
  }

  const progress = data?.progress
  const today = data?.today

  const columns = [
    { key: 'work_date', label: 'Date', render: (value) => <span className="font-semibold text-slate-900">{formatWorkDate(value)}</span> },
    { key: 'time_in', label: 'Time in', render: (value) => formatClock(value) ?? '—' },
    { key: 'time_out', label: 'Time out', render: (value) => formatClock(value) ?? '—' },
    { key: 'hours', label: 'Hours', render: (value) => (value === null ? '—' : formatHours(value)) },
    {
      key: 'status',
      label: 'Status',
      render: (value, log) => (
        <div>
          <Badge status={ojtStatus(value).variant}>{ojtStatus(value).label}</Badge>
          {log.corrected && <p className="mt-1 text-xs text-slate-500">Corrected by the admin</p>}
          {log.note && <p className="mt-1 max-w-xs text-xs text-slate-600">“{log.note}”</p>}
        </div>
      ),
    },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="My OJT Hours"
        eyebrow="OJT / Internship"
        subtitle={progress?.school ? `${progress.school}${progress.course ? ` · ${progress.course}` : ''}` : 'Your daily time in and time out.'}
      />

      {isLoading ? (
        <div className="mt-6"><LoadingSkeleton variant="card" rows={3} /></div>
      ) : error ? (
        <div className="mt-6"><ErrorState description="Your time record could not be loaded." onRetry={refetch} error={error} /></div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <TimeClock today={today} busy={punch.isPending} onPunch={(action) => punch.mutate(action)} />

            <Card>
              <h2 className="text-base font-bold text-slate-950">Progress</h2>
              {progress?.hours_completed && (
                <p className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                  <PartyPopper className="h-4 w-4" /> You've completed your required hours.
                </p>
              )}
              <div className="mt-4"><HoursProgress progress={progress} /></div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <Stat label="Hours left" value={progress?.remaining_hours === null ? '—' : formatHours(progress?.remaining_hours)} />
                <Stat label="Internship" value={daysLeftLabel(progress)} tone={progress?.ending_soon ? 'text-amber-700' : undefined} />
                <Stat label="Started" value={formatWorkDate(progress?.start_date, { month: 'long', day: 'numeric', year: 'numeric' }) ?? '—'} />
                <Stat label="Ends" value={formatWorkDate(progress?.end_date, { month: 'long', day: 'numeric', year: 'numeric' }) ?? '—'} />
              </dl>
              <p className="mt-4 text-xs text-slate-500">
                Hours count once the PESO system administrator approves them. If you forgot to time out, tell the admin so they can fix that day.
              </p>
            </Card>
          </div>

          <Card padding="none" className="mt-6">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <h2 className="text-base font-bold text-slate-950">Daily time record</h2>
              <p className="text-sm text-slate-500">Every day you timed in, newest first.</p>
            </div>
            <DataTable
              columns={columns}
              data={data?.logs ?? []}
              caption="Your daily time record."
              emptyTitle="No entries yet"
              emptyDescription="Press Time In when you start work today."
            />
          </Card>
        </>
      )}
    </div>
  )
}

function TimeClock({ today, busy, onPunch }) {
  const now = useNow()
  const timedIn = today && !today.time_out
  const done = today && today.time_out

  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {now.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <p className="mt-1 font-mono text-4xl font-black tabular-nums text-slate-950 sm:text-5xl" aria-live="off">
        {now.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="mt-1 text-xs text-slate-500">Philippine time</p>

      <div className="mt-6 w-full max-w-xs">
        {done ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600" />
            <p className="mt-2 text-sm font-bold text-emerald-900">Done for today</p>
            <p className="mt-1 text-sm text-emerald-800">
              {formatClock(today.time_in)} – {formatClock(today.time_out)} · {formatHours(today.hours)}
            </p>
            <div className="mt-2"><Badge status={ojtStatus(today.status).variant}>{ojtStatus(today.status).label}</Badge></div>
          </div>
        ) : timedIn ? (
          <>
            <p className="mb-3 flex items-center justify-center gap-2 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-blue-600" /> Timed in at <strong className="text-slate-900">{formatClock(today.time_in)}</strong>
            </p>
            <Button size="lg" variant="navy" icon={LogOut} loading={busy} className="w-full" onClick={() => onPunch('out')}>
              Time Out
            </Button>
          </>
        ) : (
          <>
            <p className="mb-3 flex items-center justify-center gap-2 text-sm text-slate-600">
              <CalendarClock className="h-4 w-4" /> You haven't timed in today.
            </p>
            <Button size="lg" icon={LogIn} loading={busy} className="w-full" onClick={() => onPunch('in')}>
              Time In
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${tone ?? 'text-slate-900'}`}>{value}</dd>
    </div>
  )
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}
