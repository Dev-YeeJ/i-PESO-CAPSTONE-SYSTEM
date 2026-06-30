import { useEffect, useState } from 'react'
import { CalendarDays, Download, Plus, RefreshCw, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'TBD'

const metricCards = [
  ['employers_joined', 'Employers'],
  ['seekers_rsvped', 'RSVPs'],
  ['attendance', 'Attended'],
  ['hots', 'HOTS'],
]

export default function JobFairsListPage() {
  const [fairs, setFairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminService.getJobFairsList({ per_page: 50 })
      setFairs(result.data || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load job fairs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const downloadSprs = async (fair) => {
    try {
      const blob = await adminService.downloadJobFairSprs(fair.job_fair_id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sprs-1-6-${fair.job_fair_id}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to generate SPRS report.')
    }
  }

  return (
    <div className="portal-page">
      <PageHeader
        title="Job Fairs"
        subtitle="Create hiring events, monitor live attendance, and produce SPRS 1.6 counts."
        eyebrow="Government & DOLE"
        actions={[
          { label: 'Refresh', onClick: load, variant: 'secondary' },
          { label: 'Create Job Fair', onClick: () => navigate('/admin/job-fairs/create'), variant: 'primary' },
        ]}
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <Card padding="none" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Digital Job Fair Directory</h2>
            <p className="text-sm text-slate-500">Live metrics are generated from employer joins, seeker QR passes, and fair-linked applications.</p>
          </div>
          <Button variant="outline" icon={RefreshCw} onClick={load}>Sync</Button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">Loading job fairs...</div>
        ) : fairs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <CalendarDays className="h-6 w-6" />
            </span>
            <p className="mt-4 font-extrabold text-slate-900">No job fairs scheduled</p>
            <Button className="mt-5" icon={Plus} onClick={() => navigate('/admin/job-fairs/create')}>Create Job Fair</Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {fairs.map((fair) => (
              <div key={fair.job_fair_id} className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-extrabold text-slate-950">{fair.title}</h3>
                    <StatusBadge status={fair.status} />
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-extrabold uppercase text-slate-600">{fair.sector}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                    <span>{formatDate(fair.start_date)} to {formatDate(fair.end_date)}</span>
                    <span>{fair.venue}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {metricCards.map(([key, label]) => (
                      <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-lg font-black text-slate-950">{fair.metrics?.[key] ?? 0}</p>
                        <p className="text-[11px] font-extrabold uppercase text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:flex-col xl:items-stretch">
                  <Button variant="outline" icon={UsersRound} onClick={() => navigate(`/admin/job-fairs/${fair.job_fair_id}/edit`)}>Manage</Button>
                  <Button variant="navy" icon={Download} onClick={() => downloadSprs(fair)}>SPRS 1.6</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
