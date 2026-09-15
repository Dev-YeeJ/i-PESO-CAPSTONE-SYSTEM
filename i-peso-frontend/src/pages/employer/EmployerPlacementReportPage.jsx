import { useEffect, useMemo, useState } from 'react'
import { UploadCloud, FileSpreadsheet, ArrowLeft, CheckCircle2, Trash2, Loader2, Layers, CalendarX, PencilLine, Save } from 'lucide-react'
import { Card, CardHeader, Button, Badge, AlertBox } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PageHeader from '@/pages/admin/_components/PageHeader'
import toast from 'react-hot-toast'
import PlacementRecordEditor, { blankPlacementRecord, stripBlankPlacementRecords } from '@/components/reports/PlacementRecordEditor'
import HiringActivityWorkspace from '@/components/reports/HiringActivityWorkspace'
import { 
  listEmployerPlacementReports,
  uploadPlacementReport, 
  declareNoPlacements, 
  startManualPlacementReport, 
  getEmployerPlacementReport, 
  deletePlacementReport 
} from '@/services/placementReportService'

const STATUS_TONE = {
  pending_mapping: 'warning',
  pending_review: 'review',
  approved: 'approved',
  rejected: 'rejected',
}

const STATUS_LABEL = {
  pending_mapping: 'Draft — needs mapping',
  pending_review: 'Submitted — under review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const ordinal = (n) => {
  const suffix = ['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'
  return `${n}${suffix}`
}

const firstError = (err, fallback) => {
  const errors = err.response?.data?.errors
  const first = errors && Object.values(errors)[0]
  return (Array.isArray(first) ? first[0] : first) || err.response?.data?.message || fallback
}

export default function EmployerPlacementReportPage() {
  const [view, setView] = useState('list') // list | editor | manual-editor
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null) // detailed upload in the editor
  const [deadlineDay, setDeadlineDay] = useState(null)

  // Default to the month just closed — that is what employers are reporting on.
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  const [coverageMonth, setCoverageMonth] = useState(lastMonth.getMonth() + 1)
  const [coverageYear, setCoverageYear] = useState(lastMonth.getFullYear())
  const [entryMode, setEntryMode] = useState('upload') // upload | manual
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [declaring, setDeclaring] = useState(false)
  const [startingManual, setStartingManual] = useState(false)

  const fetchReports = () => {
    setLoading(true)
    listEmployerPlacementReports()
      .then((res) => {
        setReports(res.data || [])
        setDeadlineDay(res.deadline_day ?? null)
      })
      .catch(() => toast.error('Unable to load your placement reports.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [])

  const openEditor = async (id) => {
    try {
      const res = await getEmployerPlacementReport(id)
      setActive(res.data)
      setView(res.data.is_manual_entry ? 'manual-editor' : 'editor')
    } catch {
      toast.error('Unable to open this report.')
    }
  }



  const handleStartManual = async () => {
    setStartingManual(true)
    try {
      const res = await startManualPlacementReport({ month: coverageMonth, year: coverageYear })
      toast.success(res.message)
      setActive(res.data)
      setView('manual-editor')
      fetchReports()
    } catch (err) {
      toast.error(firstError(err, 'Unable to start a manual report.'))
    } finally {
      setStartingManual(false)
    }
  }

  const handleDeclareNil = async () => {
    const period = `${MONTHS[coverageMonth - 1]} ${coverageYear}`
    if (!window.confirm(`Tell PESO that you hired nobody in ${period}?`)) return
    setDeclaring(true)
    try {
      const res = await declareNoPlacements({ month: coverageMonth, year: coverageYear })
      toast.success(res.message)
      fetchReports()
    } catch (err) {
      toast.error(firstError(err, 'Unable to record that.'))
    } finally {
      setDeclaring(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this placement report? This cannot be undone.')) return
    try {
      await deletePlacementReport(id)
      toast.success('Report deleted.')
      fetchReports()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete.')
    }
  }



  if (view === 'manual-editor' && active) {
    return (
      <ManualEntryEditor
        upload={active}
        onBack={() => { setActive(null); setView('list'); fetchReports() }}
        onChange={setActive}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Employer Reporting"
        title="Placement Reports"
        subtitle="File your monthly hired-applicants report — upload a spreadsheet or type hires directly into a table."
      />

      {deadlineDay && (
        <AlertBox variant="info" title="When reports are due">
          PESO expects each month&apos;s report by the {ordinal(deadlineDay)} of the following month. If you hired
          nobody in a month, record that instead — it keeps your account in good standing.
        </AlertBox>
      )}

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">My Monthly Reports</TabsTrigger>
          <TabsTrigger value="activity">All Hiring Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
        <Card>
          <CardHeader title="Generate Placement Report" subtitle="Automatically fetch hires tracked in the system for this month. You can review the list, add any missing hires manually, and save." />
          <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Coverage Month</span>
                  <select value={coverageMonth} onChange={(e) => setCoverageMonth(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Coverage Year</span>
                  <input type="number" min="2020" max="2100" value={coverageYear} onChange={(e) => setCoverageYear(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" icon={startingManual ? Loader2 : FileSpreadsheet} onClick={handleStartManual} disabled={startingManual}>
                  {startingManual ? 'Generating…' : 'Generate Report'}
                </Button>
                <Button type="button" variant="outline" icon={declaring ? Loader2 : CalendarX} onClick={handleDeclareNil} disabled={declaring}>
                  {declaring ? 'Recording…' : `No hires in ${MONTHS[coverageMonth - 1]}`}
                </Button>
              </div>
            </div>
          </Card>
        <Card>
        <CardHeader title="My submitted reports" />
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No placement reports yet. Upload your first file above.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  {r.is_nil_report
                    ? <CalendarX className="h-5 w-5 text-slate-400" />
                    : r.is_manual_entry
                      ? <PencilLine className="h-5 w-5 text-slate-400" />
                      : <FileSpreadsheet className="h-5 w-5 text-slate-400" />}
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{r.original_filename}</p>
                    <p className="text-xs text-slate-500">
                      {r.coverage_month ? `${MONTHS[r.coverage_month - 1]} ${r.coverage_year} · ` : ''}
                      {r.is_nil_report ? 'No hires declared' : `${r.record_count} record(s)`}
                      {r.selected_sheet && ` · sheet “${r.selected_sheet}”`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_TONE[r.status]} icon={false}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                  {(r.status === 'pending_mapping' || r.status === 'rejected') && !r.is_nil_report && (
                    <Button size="sm" variant="outline" onClick={() => openEditor(r.id)}>Edit</Button>
                  )}
                  {r.status !== 'approved' && (
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => handleDelete(r.id)} aria-label="Delete" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
        </TabsContent>

        <TabsContent value="activity">
          <HiringActivityWorkspace role="employer" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ManualEntryEditor({ upload, onBack, onChange }) {
  const initialRecords = useMemo(() => {
    const saved = (upload.records || []).map(({ id, linked_seeker_id, seeker_match_confidence, ...fields }) => ({ // eslint-disable-line no-unused-vars
      ...fields,
      // date/date_hired come back JSON-serialized with a time component —
      // <input type="date"> only accepts a bare YYYY-MM-DD.
      birth_date: fields.birth_date ? String(fields.birth_date).slice(0, 10) : '',
      date_hired: fields.date_hired ? String(fields.date_hired).slice(0, 10) : '',
    }))
    return saved.length ? saved : [blankPlacementRecord()]
  }, [upload])

  const [records, setRecords] = useState(initialRecords)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [remarks, setRemarks] = useState(upload.employer_remarks || '')
  const [hasSaved, setHasSaved] = useState((upload.record_count || 0) > 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await saveManualPlacementRecords(upload.id, stripBlankPlacementRecords(records))
      toast.success(res.message)
      onChange(res.data)
      setHasSaved((res.data.record_count || 0) > 0)
    } catch (err) {
      toast.error(firstError(err, 'Save failed.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!hasSaved) return toast.error('Save at least one hire before submitting.')
    setSubmitting(true)
    try {
      const res = await submitPlacementReport(upload.id, remarks)
      toast.success(res.message)
      onBack()
    } catch (err) {
      toast.error(firstError(err, 'Submit failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Employer Reporting"
        title="Enter hires manually"
        subtitle={`${MONTHS[upload.coverage_month - 1]} ${upload.coverage_year}`}
        actions={[{ label: 'Back', icon: ArrowLeft, variant: 'ghost', onClick: onBack }]}
      />

      {upload.status === 'rejected' && upload.review_remarks && (
        <AlertBox variant="danger" title="Returned by PESO for revision">{upload.review_remarks}</AlertBox>
      )}

      <Card>
        <CardHeader title="Hires this month" subtitle="Add one row per person hired. Fields marked * are required before submitting. Save as often as you like — nothing is sent to PESO until you submit below." />
        <PlacementRecordEditor records={records} onChange={setRecords} />
        <div className="mt-4">
          <Button variant="outline" icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save records'}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Submit to PESO" subtitle="Once submitted, PESO reviews and approves your report. Approved records feed the SPRS placement totals." />
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          placeholder="Optional note for the PESO reviewer…"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="mt-4">
          <Button icon={submitting ? Loader2 : CheckCircle2} onClick={handleSubmit} disabled={submitting || !hasSaved}>
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </Button>
          {!hasSaved && <p className="mt-2 text-xs text-slate-500">Save at least one hire before submitting.</p>}
        </div>
      </Card>
    </div>
  )
}
