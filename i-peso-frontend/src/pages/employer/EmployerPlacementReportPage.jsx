import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileSpreadsheet, ArrowLeft, CheckCircle2, Trash2, CalendarX, PencilLine, Save } from 'lucide-react'
import { Card, CardHeader, Button, Badge, AlertBox, ConfirmDialog, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import toast from 'react-hot-toast'
import PlacementRecordEditor, { blankPlacementRecord, stripBlankPlacementRecords } from '@/components/reports/PlacementRecordEditor'
import {
  listEmployerPlacementReports,
  declareNoPlacements,
  startManualPlacementReport,
  saveManualPlacementRecords,
  getEmployerPlacementReport,
  submitPlacementReport,
  deletePlacementReport,
  searchPlacementApplicantSuggestions,
} from '@/services/placementReportService'

const MotionDiv = motion.div

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
  const [view, setView] = useState('list') // list | manual-editor
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null) // detailed upload in the editor
  const [deadlineDay, setDeadlineDay] = useState(null)

  // Default to the month just closed — that is what employers are reporting on.
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  const [coverageMonth, setCoverageMonth] = useState(lastMonth.getMonth() + 1)
  const [coverageYear, setCoverageYear] = useState(lastMonth.getFullYear())
  const [declaring, setDeclaring] = useState(false)
  const [startingManual, setStartingManual] = useState(false)
  const [nilConfirmOpen, setNilConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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
      if (!res.data.is_manual_entry) {
        // This page no longer has a spreadsheet-mapping screen — only reports
        // created via "Generate Report" (manual entry) can be edited here.
        toast.error('This report was built from an uploaded spreadsheet, which this page can no longer edit. Delete it and use "Generate Report" instead.')
        return
      }
      setActive(res.data)
      setView('manual-editor')
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

  const period = `${MONTHS[coverageMonth - 1]} ${coverageYear}`

  const handleDeclareNil = async () => {
    setDeclaring(true)
    try {
      const res = await declareNoPlacements({ month: coverageMonth, year: coverageYear })
      toast.success(res.message)
      fetchReports()
    } catch (err) {
      toast.error(firstError(err, 'Unable to record that.'))
    } finally {
      setDeclaring(false)
      setNilConfirmOpen(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePlacementReport(deleteTarget)
      toast.success('Report deleted.')
      fetchReports()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete.')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
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
    <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <PageHeader
        eyebrow="Employer Reporting"
        title="Monthly Placement Report"
      />

      {deadlineDay && (
        <AlertBox variant="info" title="Reporting Deadline">
          Please submit your placement report by the {ordinal(deadlineDay)} of the following month. If there were no hires, you can submit a "No hires" report.
        </AlertBox>
      )}

      <Card>
        <CardHeader title="Generate Placement Report" subtitle="Select the coverage month and year to generate a unified report combining system-tracked hires and your manual entries." />
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
                <Button type="button" icon={FileSpreadsheet} loading={startingManual} onClick={handleStartManual}>
                  {startingManual ? 'Generating…' : 'Generate Report'}
                </Button>
                <Button type="button" variant="outline" icon={CalendarX} loading={declaring} onClick={() => setNilConfirmOpen(true)}>
                  {declaring ? 'Submitting…' : `No hires in ${MONTHS[coverageMonth - 1]}`}
                </Button>
              </div>
            </div>
          </Card>
        <Card>
        <CardHeader title="My submitted reports" />
        {loading ? (
          <LoadingSkeleton variant="card" rows={2} />
        ) : reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No placement reports submitted yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence initial={false}>
            {reports.map((r) => (
              <MotionDiv
                key={r.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
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
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleteTarget(r.id)} aria-label="Delete" />
                  )}
                </div>
              </MotionDiv>
            ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={nilConfirmOpen}
        onOpenChange={setNilConfirmOpen}
        title="Declare no hires?"
        description={`This tells PESO that you hired nobody in ${period}. You can still submit a report later if that changes.`}
        confirmLabel="Yes, no hires"
        variant="primary"
        busy={declaring}
        onConfirm={handleDeclareNil}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Delete this placement report?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onConfirm={handleDelete}
      />
    </MotionDiv>
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
    // The employer's own company is the assigned company for every hire they
    // report, so the first row starts pre-filled rather than blank.
    return saved.length
      ? saved
      : [{ ...blankPlacementRecord(), assigned_company: upload.employer_company_name || '' }]
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
    <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
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
        <PlacementRecordEditor
          records={records}
          onChange={setRecords}
          searchApplicants={searchPlacementApplicantSuggestions}
          assignedCompany={upload.employer_company_name || ''}
        />
        <div className="mt-4">
          <Button variant="outline" icon={Save} loading={saving} onClick={handleSave}>
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
          <Button icon={CheckCircle2} loading={submitting} disabled={!hasSaved} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </Button>
          {!hasSaved && <p className="mt-2 text-xs text-slate-500">Save at least one hire before submitting.</p>}
        </div>
      </Card>
    </MotionDiv>
  )
}
