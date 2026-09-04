import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, Download, CheckCircle2, XCircle, Loader2, FileSpreadsheet,
  CalendarX, AlertTriangle, Link2, UserCheck, Users,
} from 'lucide-react'
import { Card, CardHeader, Button, Badge, AlertBox, StatCard } from '@/components/ui'
import { ConfirmModal, PageHeader } from '@/pages/admin/_components'
import DataTable from '@/pages/admin/_components/DataTable'
import toast from 'react-hot-toast'
import {
  listAdminPlacementReports,
  getAdminPlacementReport,
  approvePlacementReport,
  rejectPlacementReport,
  exportPlacementReport,
  getPlacementCompliance,
  getPlacementRecordCandidates,
  linkPlacementRecord,
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

// How confidently a reported hire was tied to a registered job seeker. `none`
// is the common, expected case: employers report every new hire, and most were
// never i-PESO registrants.
const MATCH_TONE = { exact: 'approved', probable: 'review', ambiguous: 'warning', none: 'neutral' }
const MATCH_LABEL = { exact: 'Confirmed', probable: 'Probable', ambiguous: 'Needs review', none: 'Not registered' }

const COMPLIANCE_TONE = {
  approved: 'approved',
  pending_review: 'review',
  needs_revision: 'warning',
  overdue: 'rejected',
  not_submitted: 'neutral',
}
const COMPLIANCE_LABEL = {
  approved: 'Approved',
  pending_review: 'Submitted',
  needs_revision: 'Returned for revision',
  overdue: 'Overdue',
  not_submitted: 'Not yet due',
}

export default function AdminPlacementReportPage() {
  const [mode, setMode] = useState('reports') // reports | compliance
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending_review')
  const [detail, setDetail] = useState(null) // { data, records, match_summary }
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const fetchReports = useCallback(() => {
    setLoading(true)
    listAdminPlacementReports(statusFilter ? { status: statusFilter } : {})
      .then((res) => setReports(res.data || []))
      .catch(() => toast.error('Unable to load placement reports.'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { if (mode === 'reports') fetchReports() }, [mode, fetchReports])

  const openDetail = async (id) => {
    try {
      setDetail(await getAdminPlacementReport(id))
    } catch {
      toast.error('Unable to open this report.')
    }
  }

  const refreshDetail = async () => {
    if (!detail) return
    try {
      setDetail(await getAdminPlacementReport(detail.data.id))
    } catch {
      /* a stale match badge is not worth an error toast */
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
      toast.error(err.response?.data?.errors?.status?.[0] || err.response?.data?.message || 'Approval failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async (remarks) => {
    setBusy(true)
    try {
      const res = await rejectPlacementReport(detail.data.id, remarks)
      toast.success(res.message)
      setRejecting(false)
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
      downloadBlob(await exportPlacementReport(id), `placement-report-${id}.csv`)
    } catch {
      toast.error('Export failed.')
    }
  }

  if (detail) {
    const d = detail.data
    const summary = detail.match_summary || {}
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="DOLE Reporting"
          title="Placement report review"
          subtitle={`${d.company_name || 'Employer'} · ${d.original_filename}`}
          actions={[{ label: 'Back', icon: ArrowLeft, variant: 'ghost', onClick: () => setDetail(null) }]}
        />

        {d.is_nil_report && (
          <AlertBox variant="info" title="No hires declared">
            This employer reported that nobody was hired in this period. There are no records to review — approving it
            simply records that they complied.
          </AlertBox>
        )}

        {summary.ambiguous > 0 && (
          <AlertBox variant="warning" title={`${summary.ambiguous} row(s) match more than one registered job seeker`}>
            Several i-PESO accounts share those names, so the importer left them unlinked rather than guessing. Use
            “Fix” on each row to pick the right person, or leave them unlinked if none apply.
          </AlertBox>
        )}

        <Card>
          <CardHeader
            title={`${d.record_count} placement record(s)`}
            subtitle={`${d.coverage_month ? `${MONTHS[d.coverage_month - 1]} ${d.coverage_year} · ` : ''}${d.selected_sheet ? `sheet “${d.selected_sheet}” · ` : ''}Status: ${STATUS_LABEL[d.status] ?? d.status}`}
            action={<Badge variant={STATUS_TONE[d.status]} icon={false}>{STATUS_LABEL[d.status] ?? d.status}</Badge>}
          />
          {d.employer_remarks && <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><strong>Employer note:</strong> {d.employer_remarks}</p>}

          {d.record_count > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <StatCard icon={Link2} label="Linked to a job seeker" value={summary.linked ?? 0} color="green" hint="Rows tied to an i-PESO account. These are excluded from SPRS if the seeker was already counted as a platform hire." />
              <StatCard icon={AlertTriangle} label="Needs your review" value={summary.ambiguous ?? 0} color="amber" hint="Rows where more than one registered seeker shares the reported name." />
              <StatCard icon={UserCheck} label="Confirmed by an admin" value={summary.confirmed ?? 0} color="blue" hint="Rows where a PESO admin has explicitly set or cleared the link." />
            </div>
          )}

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
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <MatchCell reportId={d.id} row={row} onChanged={refreshDetail} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.records.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No placement records in this report.</p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" icon={Download} onClick={() => handleExport(d.id)}>Export CSV</Button>
            {d.status === 'pending_review' && (
              <>
                <Button variant="navy" icon={busy ? Loader2 : CheckCircle2} onClick={handleApprove} disabled={busy}>Approve</Button>
                <Button variant="danger" icon={XCircle} onClick={() => setRejecting(true)} disabled={busy}>Reject</Button>
              </>
            )}
          </div>
          {d.review_remarks && <p className="mt-3 text-sm text-slate-500"><strong>Review note:</strong> {d.review_remarks}</p>}
        </Card>

        <ConfirmModal
          isOpen={rejecting}
          isDangerous
          title="Reject this placement report?"
          message="The employer will be notified and will see the reason you give below. They can correct and resubmit the report."
          confirmText="Reject report"
          requiresReason
          reasonRequired
          reasonLabel="Reason for rejection (required — the employer will see this)"
          loading={busy}
          onCancel={() => setRejecting(false)}
          onConfirm={handleReject}
        />
      </div>
    )
  }

  const columns = [
    { key: 'company_name', label: 'Employer', render: (v) => <span className="font-semibold text-slate-800">{v || '—'}</span> },
    {
      key: 'original_filename',
      label: 'File',
      render: (v, row) => (
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          {row.is_nil_report ? <CalendarX className="h-4 w-4 text-slate-400" /> : <FileSpreadsheet className="h-4 w-4 text-slate-400" />}
          {v}
        </span>
      ),
    },
    { key: 'coverage', label: 'Coverage', render: (_v, row) => row.coverage_month ? `${MONTHS[row.coverage_month - 1]} ${row.coverage_year}` : '—' },
    { key: 'record_count', label: 'Records', render: (v, row) => row.is_nil_report ? '—' : v },
    { key: 'submitted_at', label: 'Submitted', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', render: (v) => <Badge variant={STATUS_TONE[v]} icon={false}>{STATUS_LABEL[v] ?? v}</Badge> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DOLE Reporting"
        title="Placement Reports"
        subtitle="Review employer-submitted monthly placement reports and track who has yet to report. Approved records feed the SPRS “job applicants placed” totals."
      />

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'reports', label: 'Submitted reports' },
          { key: 'compliance', label: 'Monthly compliance' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${mode === tab.key ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-brand-navy'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'compliance' ? <ComplianceView /> : (
        <>
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
        </>
      )}
    </div>
  )
}

/**
 * The seeker link for one reported row, with an inline picker when the name is
 * shared by several registered seekers.
 */
function MatchCell({ reportId, row, onChanged }) {
  const [open, setOpen] = useState(false)
  const [candidates, setCandidates] = useState(null)
  const [saving, setSaving] = useState(false)

  const confidence = row.seeker_match_confidence || 'none'

  const openPicker = async () => {
    setOpen(true)
    if (candidates) return
    try {
      const res = await getPlacementRecordCandidates(reportId, row.id)
      setCandidates(res.data || [])
    } catch {
      toast.error('Unable to load matching job seekers.')
      setCandidates([])
    }
  }

  const save = async (seekerId) => {
    setSaving(true)
    try {
      const res = await linkPlacementRecord(reportId, row.id, seekerId)
      toast.success(res.message)
      setOpen(false)
      await onChanged()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the link.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={MATCH_TONE[confidence] ?? 'neutral'} icon={false}>
        {row.linked_seeker_name || MATCH_LABEL[confidence] || confidence}
      </Badge>

      {open ? (
        <div className="flex items-center gap-1.5">
          <select
            defaultValue={row.linked_seeker_id ?? ''}
            disabled={saving || candidates === null}
            onChange={(e) => save(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="">Not a registered seeker</option>
            {(candidates ?? []).map((c) => (
              <option key={c.seeker_id} value={c.seeker_id}>
                {c.name}{c.date_of_birth ? ` · b. ${c.date_of_birth}` : ''}
              </option>
            ))}
          </select>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          <button onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Cancel</button>
        </div>
      ) : (
        <button onClick={openPicker} className="text-xs font-semibold text-brand-navy hover:underline">Fix</button>
      )}
    </div>
  )
}

/** Who has reported for a coverage period, and who PESO still needs to chase. */
function ComplianceView() {
  // Null until the admin picks one: with no period given the API defaults to
  // the latest month whose deadline has passed — the one PESO would actually be
  // chasing — and the pickers then read back from the response.
  const [period, setPeriod] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const signal = { cancelled: false }

    getPlacementCompliance(period ? { coverage_month: period.month, coverage_year: period.year } : {})
      .then((res) => { if (!signal.cancelled) setData(res) })
      .catch(() => { if (!signal.cancelled) toast.error('Unable to load compliance data.') })
      .finally(() => { if (!signal.cancelled) setLoading(false) })

    return () => { signal.cancelled = true }
  }, [period])

  const totals = data?.totals || {}
  const selected = period ?? (data ? { month: data.coverage_month, year: data.coverage_year } : { month: '', year: '' })

  // Loading is flipped here rather than inside the effect so the effect body
  // never triggers a synchronous re-render.
  const changePeriod = (next) => {
    setLoading(true)
    setPeriod(next)
  }

  const columns = [
    { key: 'company_name', label: 'Employer', render: (v) => <span className="font-semibold text-slate-800">{v || '—'}</span> },
    { key: 'email', label: 'Email', render: (v) => <span className="text-slate-500">{v}</span> },
    { key: 'mobile_number', label: 'Mobile', render: (v) => v || '—' },
    {
      key: 'state',
      label: 'Status',
      render: (v, row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={COMPLIANCE_TONE[v] ?? 'neutral'} icon={false}>{COMPLIANCE_LABEL[v] ?? v}</Badge>
          {row.is_nil_report && <span className="text-xs text-slate-400">no hires</span>}
        </div>
      ),
    },
    { key: 'record_count', label: 'Placements', render: (v, row) => row.is_nil_report ? '0' : (v || '—') },
    { key: 'submitted_at', label: 'Submitted', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Monthly submission tracking"
          subtitle={data ? `Reports covering ${MONTHS[data.coverage_month - 1]} ${data.coverage_year} were due ${data.due_date}. Employers are reminded automatically before and after the deadline.` : 'Loading…'}
        />
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Coverage Month</span>
            <select
              value={selected.month}
              onChange={(e) => changePeriod({ ...selected, month: Number(e.target.value) })}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Coverage Year</span>
            <input
              type="number"
              min="2020"
              max="2100"
              value={selected.year}
              onChange={(e) => changePeriod({ ...selected, year: Number(e.target.value) })}
              className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Employers expected" value={totals.expected ?? 0} color="slate" hint="Verified employers registered before the covered month ended." />
        <StatCard icon={CheckCircle2} label="Submitted" value={totals.submitted ?? 0} color="green" subtitle={`${totals.nil_reports ?? 0} declared no hires`} />
        <StatCard icon={AlertTriangle} label="Returned for revision" value={totals.needs_revision ?? 0} color="amber" hint="Rejected reports the employer has not yet resubmitted." />
        <StatCard icon={XCircle} label="Overdue" value={totals.overdue ?? 0} color="red" trendPositiveIsGood={false} hint="Past the deadline with nothing submitted — the chase list." />
      </div>

      <Card padding="none">
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={loading}
          emptyMessage="No employers were expected to report for this period."
        />
      </Card>
    </div>
  )
}
