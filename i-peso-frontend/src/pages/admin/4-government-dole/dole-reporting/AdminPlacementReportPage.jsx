import { useEffect, useState } from 'react'
import { ArrowLeft, Download, CheckCircle2, XCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import { Card, CardHeader, Button, Badge } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import toast from 'react-hot-toast'
import {
  listAdminPlacementReports,
  getAdminPlacementReport,
  approvePlacementReport,
  rejectPlacementReport,
  exportPlacementReport,
  downloadBlob,
} from '@/services/placementReportService'

const STATUS_TONE = { pending_review: 'review', approved: 'approved', rejected: 'rejected' }
const STATUS_LABEL = { pending_review: 'Pending review', approved: 'Approved', rejected: 'Rejected' }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const FIELD_LABELS = {
  first_name: 'First Name', middle_name: 'Middle Name', last_name: 'Last Name', gender: 'Gender',
  civil_status: 'Civil Status', age: 'Age', birth_date: 'Birth Date', date_hired: 'Date Hired',
  position: 'Position', department: 'Department', address: 'Address',
  educational_attainment: 'Educational Attainment', assigned_company: 'Assigned Company',
}

export default function AdminPlacementReportPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending_review')
  const [detail, setDetail] = useState(null) // { data, records }
  const [busy, setBusy] = useState(false)

  const fetchReports = () => {
    setLoading(true)
    listAdminPlacementReports(statusFilter ? { status: statusFilter } : {})
      .then((res) => setReports(res.data || []))
      .catch(() => toast.error('Unable to load placement reports.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (id) => {
    try {
      const res = await getAdminPlacementReport(id)
      setDetail(res)
    } catch {
      toast.error('Unable to open this report.')
    }
  }

  const handleApprove = async () => {
    setBusy(true)
    try {
      const res = await approvePlacementReport(detail.data.id)
      toast.success(res.message)
      setDetail(null)
      fetchReports()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    const remarks = window.prompt('Reason for rejection (the employer will see this):')
    if (!remarks) return
    setBusy(true)
    try {
      const res = await rejectPlacementReport(detail.data.id, remarks)
      toast.success(res.message)
      setDetail(null)
      fetchReports()
    } catch (err) {
      toast.error(err.response?.data?.errors?.review_remarks?.[0] || err.response?.data?.message || 'Rejection failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleExport = async (id) => {
    try {
      const blob = await exportPlacementReport(id)
      downloadBlob(blob, `placement-report-${id}.csv`)
    } catch {
      toast.error('Export failed.')
    }
  }

  if (detail) {
    const d = detail.data
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="DOLE Reporting"
          title="Placement report review"
          subtitle={`${d.company_name || 'Employer'} · ${d.original_filename}`}
          actions={[{ label: 'Back', icon: ArrowLeft, variant: 'ghost', onClick: () => setDetail(null) }]}
        />

        <Card>
          <CardHeader
            title={`${d.record_count} placement record(s)`}
            subtitle={`${d.coverage_month ? `${MONTHS[d.coverage_month - 1]} ${d.coverage_year} · ` : ''}Status: ${STATUS_LABEL[d.status] ?? d.status}`}
            action={<Badge variant={STATUS_TONE[d.status]} icon={false}>{STATUS_LABEL[d.status] ?? d.status}</Badge>}
          />
          {d.employer_remarks && <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><strong>Employer note:</strong> {d.employer_remarks}</p>}
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-left uppercase tracking-wide text-slate-500">
                  {Object.values(FIELD_LABELS).map((label) => <th key={label} className="py-2 pr-3 whitespace-nowrap">{label}</th>)}
                  <th className="py-2 pr-3 whitespace-nowrap">Linked Seeker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.records.map((row) => (
                  <tr key={row.id}>
                    {Object.keys(FIELD_LABELS).map((key) => (
                      <td key={key} className="py-2 pr-3 whitespace-nowrap text-slate-700">{row[key] ?? ''}</td>
                    ))}
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-400">{row.linked_seeker_id ? `#${row.linked_seeker_id}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" icon={Download} onClick={() => handleExport(d.id)}>Export CSV</Button>
            {d.status === 'pending_review' && (
              <>
                <Button variant="navy" icon={busy ? Loader2 : CheckCircle2} onClick={handleApprove} disabled={busy}>Approve</Button>
                <Button variant="danger" icon={XCircle} onClick={handleReject} disabled={busy}>Reject</Button>
              </>
            )}
          </div>
          {d.review_remarks && <p className="mt-3 text-sm text-slate-500"><strong>Review note:</strong> {d.review_remarks}</p>}
        </Card>
      </div>
    )
  }

  const columns = [
    { key: 'company_name', label: 'Employer', render: (v) => <span className="font-semibold text-slate-800">{v || '—'}</span> },
    { key: 'original_filename', label: 'File', render: (v) => <span className="inline-flex items-center gap-1.5 text-slate-600"><FileSpreadsheet className="h-4 w-4 text-slate-400" />{v}</span> },
    { key: 'coverage', label: 'Coverage', render: (_v, row) => row.coverage_month ? `${MONTHS[row.coverage_month - 1]} ${row.coverage_year}` : '—' },
    { key: 'record_count', label: 'Records' },
    { key: 'submitted_at', label: 'Submitted', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', render: (v) => <Badge variant={STATUS_TONE[v]} icon={false}>{STATUS_LABEL[v] ?? v}</Badge> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DOLE Reporting"
        title="Placement Reports"
        subtitle="Review employer-submitted monthly placement reports. Approved records feed the SPRS “job applicants placed” totals."
      />

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'pending_review', label: 'Pending Review' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
          { key: '', label: 'All' },
        ].map((tab) => (
          <button
            key={tab.key || 'all'}
            onClick={() => setStatusFilter(tab.key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${statusFilter === tab.key ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-brand-navy'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card padding="none">
        <DataTable
          columns={columns}
          data={reports}
          loading={loading}
          onRowClick={(row) => openDetail(row.id)}
          emptyMessage="No placement reports in this category."
        />
      </Card>
    </div>
  )
}
