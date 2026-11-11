import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Badge, Card, CardHeader } from '@/components/ui'
import { adminSafetyReportService, safetyStatusBadge } from '@/services/safetyReportService'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—')

/**
 * Reports & Safety summary on an admin employer / job seeker profile: any
 * restriction in force and the cases about them, so staff see the safety
 * history without searching another module.
 *
 * type: 'employer' | 'job_seeker'
 */
export default function SafetyHistoryCard({ type, id }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'safetySubject', type, String(id)],
    queryFn: () => adminSafetyReportService.subject(type, id),
    enabled: Boolean(id),
  })
  const reports = data?.reports ?? []
  const restriction = data?.restriction

  return (
    <Card>
      <CardHeader
        title="Reports & safety"
        subtitle={`Reports about this ${type === 'employer' ? 'employer' : 'job seeker'}. A report is a concern under review, not a finding.`}
      />
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          {restriction && (
            <p className="mb-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>{restriction.label}</strong>{restriction.ends_at ? ` until ${formatDate(restriction.ends_at)}` : ' until lifted'}.
                {restriction.reason ? ` ${restriction.reason}` : ''}
                {restriction.report_id && <> · <Link to={`/admin/safety-reports/${restriction.report_id}`} className="font-semibold underline">Open case</Link></>}
              </span>
            </p>
          )}
          <p className="text-sm text-slate-600">
            {data?.counts?.total ?? 0} report(s) about them · {data?.counts?.open ?? 0} open · {data?.counts?.filed ?? 0} filed by them
          </p>
          {reports.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" />No reports about this account.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {reports.map((report) => (
                <li key={report.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <Link to={`/admin/safety-reports/${report.id}`} className="font-mono font-semibold text-blue-700 hover:underline">{report.case_number}</Link>
                  <span className="min-w-0 flex-1 truncate text-slate-700">{report.category_label}</span>
                  <span className="text-xs text-slate-400">{formatDate(report.created_at)}</span>
                  <Badge status={safetyStatusBadge(report.status)} icon={false}>{report.status_label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}
