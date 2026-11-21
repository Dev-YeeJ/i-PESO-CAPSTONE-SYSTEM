import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck2, CalendarClock, CalendarDays, CheckCircle2, ClipboardEdit, Flame, MapPin, Pencil, Plus, Radio, Trash2, Users, UsersRound, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from '@/lib/toast'
import { Button, EmptyState, LoadingSkeleton, StatCard } from '@/components/ui'
import { ConfirmModal, StatusBadge } from '@/pages/admin/_components'
import { adminService } from '@/services/adminService'
import JobFairsCalendar from './components/JobFairsCalendar'
import { LayoutList, Calendar as CalendarIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { canManage } from '@/utils/adminAccess'
import PortalPageHeader from '@/components/shell/PortalPageHeader'

const MotionDiv = motion.div

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'TBD'

const metricTiles = [
  ['approved', 'Approved', CheckCircle2, 'border-emerald-100 bg-emerald-50 text-emerald-700'],
  ['total_applicants', 'Applicants', Users, 'border-[#c4d9f7] bg-[#e8f0fc] text-brand-navy'],
  ['total_hots', 'HOTS', Flame, 'border-amber-100 bg-amber-50 text-amber-700'],
  ['proxy_reports', 'Proxy Reports', ClipboardEdit, 'border-violet-100 bg-violet-50 text-violet-700'],
]

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
        {Icon && <Icon className="h-4 w-4 text-indigo-400" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{value || 'To be announced'}</p>
      </div>
    </div>
  )
}

export default function JobFairsListPage() {
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState('list')
  const [pendingDelete, setPendingDelete] = useState(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const canAct = canManage(user, 'government_dole')

  const queryParams = useMemo(() => ({ page, per_page: 10, sort: 'newest' }), [page])

  const summaryQuery = useQuery({
    queryKey: ['admin', 'jobFairSummary'],
    queryFn: adminService.getJobFairsSummary,
    staleTime: 60_000,
  })
  const summary = {
    total: summaryQuery.data?.total ?? 0,
    upcoming: summaryQuery.data?.upcoming ?? 0,
    ongoing: summaryQuery.data?.ongoing ?? 0,
    completed: summaryQuery.data?.completed ?? 0,
  }

  const jobFairsQuery = useQuery({
    queryKey: ['jobFairs', queryParams],
    queryFn: () => adminService.getJobFairsList(queryParams),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })

  const fairs = jobFairsQuery.data?.data ?? []
  const pagination = jobFairsQuery.data ?? {}
  const loading = jobFairsQuery.isLoading
  const errorMessage = jobFairsQuery.isError ? jobFairsQuery.error?.response?.data?.message ?? 'Unable to load job fairs.' : ''

  const refresh = () => { jobFairsQuery.refetch(); summaryQuery.refetch() }

  const removeFair = useMutation({
    mutationFn: (fairId) => adminService.deleteJobFair(fairId),
    onSuccess: () => {
      toast.success('Job fair deleted.')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['jobFairs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobFairSummary'] })
    },
    onError: (caught) => toast.error(
      caught?.response?.data?.message ?? 'Unable to delete this job fair.',
    ),
  })

  const blobDownload = async (work, filename) => {
    try {
      const blob = await work()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = filename; link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Download failed.')
    }
  }

  return (
    <div className="portal-page pb-12">
      <PortalPageHeader
        title="Job fairs"
        subtitle="Plan fairs, invite employers, review their requirements, run check-in on the day, and file the post-event reports."
      >
        <Button variant="outline" onClick={refresh}>Refresh</Button>
        {canAct && <Button icon={Plus} onClick={() => navigate('/admin/job-fairs/create')}>Plan a job fair</Button>}
      </PortalPageHeader>

      <motion.section 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard icon={CalendarDays} color="blue" label="Total job fairs" value={summary.total} />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard icon={CalendarClock} color="amber" label="Upcoming" value={summary.upcoming} />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard icon={Radio} color="green" label="Ongoing" value={summary.ongoing} />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard icon={CalendarCheck2} color="slate" label="Completed" value={summary.completed} />
        </motion.div>
      </motion.section>

      {errorMessage && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          <span>{errorMessage}</span>
          <button type="button" onClick={refresh} className="font-semibold hover:underline">Try again</button>
        </div>
      )}

      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button 
            type="button" 
            onClick={() => setViewMode('list')} 
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${viewMode === 'list' ? 'bg-[#e8f0fc] text-brand-navy' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutList className="h-4 w-4" /> List View
          </button>
          <button 
            type="button" 
            onClick={() => setViewMode('calendar')} 
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${viewMode === 'calendar' ? 'bg-[#e8f0fc] text-brand-navy' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <CalendarIcon className="h-4 w-4" /> Calendar View
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" rows={3} />
      ) : fairs.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm"
        >
          <EmptyState
            icon={CalendarDays}
            title="No job fairs scheduled"
            description="Create a job fair to coordinate employers and automate post-event government reports."
            action={{ label: 'Create job fair', icon: Plus, onClick: () => navigate('/admin/job-fairs/create') }}
          />
        </motion.div>
      ) : viewMode === 'calendar' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <JobFairsCalendar fairs={fairs} />
        </motion.div>
      ) : (
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          className="space-y-5"
        >
          {fairs.map((fair) => (
            <motion.article 
              key={fair.job_fair_id} 
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:border-[#c4d9f7] hover:shadow-xl hover:shadow-blue-900/5 sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={fair.status} />
                  </div>
                  <h2 className="mt-4 truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{fair.title}</h2>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" icon={FileText} onClick={() => blobDownload(() => adminService.downloadJobFairAttendancePdf(fair.job_fair_id), `job-fair-attendance-${fair.job_fair_id}.pdf`)}>PDF</Button>
                  <Button variant="outline" size="sm" icon={FileSpreadsheet} onClick={() => blobDownload(() => adminService.downloadJobFairAttendanceExcel(fair.job_fair_id), `job-fair-attendance-${fair.job_fair_id}.csv`)}>CSV</Button>
                  <Button variant="outline" icon={UsersRound} onClick={() => navigate(`/admin/job-fairs/${fair.job_fair_id}`)}>Manage</Button>
                  {canAct && (
                    <>
                      <Button variant="outline" icon={Pencil} onClick={() => navigate(`/admin/job-fairs/${fair.job_fair_id}/edit`)}>Edit</Button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(fair)}
                        aria-label="Delete job fair"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Info icon={CalendarDays} label="Date" value={`${formatDate(fair.start_date)} to ${formatDate(fair.end_date)}`} />
                <Info icon={MapPin} label="Venue" value={fair.venue} />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {metricTiles.map(([key, label, Icon, tone]) => (
                  <div key={key} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors hover:opacity-90 ${tone}`}>
                    {Icon && <Icon className="h-5 w-5 shrink-0 opacity-75" />}
                    <div>
                      <p className="text-lg font-bold leading-none">{fair.metrics?.[key] ?? 0}</p>
                      <p className="mt-1 text-xs font-bold opacity-80">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}

      {!loading && pagination.total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-800">{pagination.from}-{pagination.to}</span> of <span className="font-bold text-slate-800">{pagination.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm text-slate-500">Page {pagination.current_page} of {pagination.last_page}</span>
            <Button variant="outline" size="sm" disabled={page >= (pagination.last_page ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {canAct && (
        <ConfirmModal
          isOpen={Boolean(pendingDelete)}
          isDangerous
          title="Delete this job fair?"
          message={`"${pendingDelete?.title ?? 'This job fair'}" and its employer participation records will no longer be available in the portal. This cannot be undone.`}
          confirmText="Delete job fair"
          loading={removeFair.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => removeFair.mutate(pendingDelete.job_fair_id)}
        />
      )}
    </div>
  )
}
