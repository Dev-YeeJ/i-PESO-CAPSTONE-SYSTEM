import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Building2, Flag, ShieldCheck, UserRound } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { LoadingSkeleton } from '@/components/ui'
import { adminService } from '@/services/adminService'
import { REPORT_STATUSES, reasonLabel, statusBadge, statusLabel } from '@/constants/employerReports'

const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function EmployerReportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('pending')
  const [adminNotes, setAdminNotes] = useState('')
  const [syncedId, setSyncedId] = useState(null)

  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'employerReport', id],
    queryFn: () => adminService.getEmployerReport(id),
    enabled: Boolean(id),
  })

  // Seed the form from the loaded report once per report (render-time state sync).
  if (report && report.id !== syncedId) {
    setSyncedId(report.id)
    setStatus(report.status ?? 'pending')
    setAdminNotes(report.admin_notes ?? '')
  }

  const mutation = useMutation({
    mutationFn: () => adminService.updateEmployerReport(id, { status, admin_notes: adminNotes }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'employerReport', id], updated)
      queryClient.invalidateQueries({ queryKey: ['admin', 'employerReports'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'employerReportSummary'] })
      toast.success('Report updated.')
    },
    onError: (caught) => toast.error(caught.response?.data?.message ?? 'Unable to update the report.'),
  })

  if (isLoading) return <div className="portal-page space-y-6"><LoadingSkeleton variant="text" rows={1} className="max-w-xs" /><LoadingSkeleton variant="card" rows={4} /></div>
  if (isError || !report) {
    return (
      <div className="portal-page">
        <PageHeader title="Employer Report" eyebrow="Constituent CRM" />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error?.response?.data?.message ?? 'This report could not be loaded.'}
        </div>
        <Button variant="outline" icon={ArrowLeft} className="mt-4" onClick={() => navigate('/admin/employer-reports')}>Back to reports</Button>
      </div>
    )
  }

  const dirty = status !== (report.status ?? 'pending') || adminNotes !== (report.admin_notes ?? '')

  return (
    <div className="portal-page">
      <button type="button" onClick={() => navigate('/admin/employer-reports')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />Back to reports
      </button>

      <PageHeader
        title={`Report #${report.id}`}
        subtitle={`${reasonLabel(report.reason)} · filed ${formatDateTime(report.created_at)}`}
        eyebrow="Constituent CRM"
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-600" />
              <h2 className="font-black text-slate-950">What the seeker reported</h2>
              <Badge status={statusBadge(report.status)} className="ml-auto">{statusLabel(report.status)}</Badge>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Reason</dt>
                <dd className="mt-1 font-semibold text-slate-800">{reasonLabel(report.reason)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 leading-6 text-slate-700">{report.description}</dd>
              </div>
            </dl>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-500" /><h3 className="font-black text-slate-950">Reported employer</h3></div>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Company" value={report.employer?.company_name} />
                <Row label="Email" value={report.employer?.email} />
                <Row label="Verification" value={report.employer?.verification_status} />
              </dl>
              {report.employer?.employer_id ? (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(`/admin/employers/${report.employer.employer_id}`)}>View employer profile</Button>
              ) : null}
            </Card>
            <Card>
              <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-500" /><h3 className="font-black text-slate-950">Reported by</h3></div>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Name" value={report.seeker?.name} />
                <Row label="Email" value={report.seeker?.email} />
                <Row label="Mobile" value={report.seeker?.mobile_number} />
              </dl>
            </Card>
          </div>
        </div>

        <Card className="h-fit">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-navy" /><h2 className="font-black text-slate-950">Review & resolve</h2></div>

          <label className="mt-4 block">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
              {REPORT_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Internal admin notes</span>
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              rows={6}
              maxLength={5000}
              placeholder="Record findings, actions taken, and the decision rationale (visible to admins only)…"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </label>

          {report.resolved_by ? (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Closed by <span className="font-bold text-slate-700">{report.resolved_by}</span> on {formatDateTime(report.resolved_at)}.
            </p>
          ) : null}

          <Button variant="primary" className="mt-5 w-full" disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-semibold capitalize text-slate-700">{value || '—'}</dd>
    </div>
  )
}
