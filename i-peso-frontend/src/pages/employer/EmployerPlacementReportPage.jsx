import { useEffect, useMemo, useState } from 'react'
import { UploadCloud, FileSpreadsheet, ArrowLeft, CheckCircle2, Trash2, Loader2 } from 'lucide-react'
import { Card, CardHeader, Button, Badge, AlertBox } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import toast from 'react-hot-toast'
import {
  listEmployerPlacementReports,
  uploadPlacementReport,
  getEmployerPlacementReport,
  previewPlacementMapping,
  submitPlacementReport,
  deletePlacementReport,
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

export default function EmployerPlacementReportPage() {
  const [view, setView] = useState('list') // list | editor
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null) // detailed upload in the editor

  const currentYear = new Date().getFullYear()
  const [coverageMonth, setCoverageMonth] = useState(new Date().getMonth() + 1)
  const [coverageYear, setCoverageYear] = useState(currentYear)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const fetchReports = () => {
    setLoading(true)
    listEmployerPlacementReports()
      .then((res) => setReports(res.data || []))
      .catch(() => toast.error('Unable to load your placement reports.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [])

  const openEditor = async (id) => {
    try {
      const res = await getEmployerPlacementReport(id)
      setActive(res.data)
      setView('editor')
    } catch {
      toast.error('Unable to open this report.')
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return toast.error('Choose a spreadsheet file first.')
    setUploading(true)
    try {
      const res = await uploadPlacementReport(file, { month: coverageMonth, year: coverageYear })
      toast.success(res.message)
      setActive(res.data)
      setFile(null)
      setView('editor')
      fetchReports()
    } catch (err) {
      toast.error(err.response?.data?.errors?.file?.[0] || err.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
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

  if (view === 'editor' && active) {
    return (
      <MappingEditor
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
        subtitle="Upload your monthly hired-applicants spreadsheet. Map its columns to standard fields, preview, then submit to PESO for review."
      />

      <Card>
        <CardHeader title="Upload a new placement report" subtitle="Accepts Excel (.xlsx, .xls) or CSV. Any column layout works — you map the columns after upload." />
        <form onSubmit={handleUpload} className="space-y-4">
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
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Spreadsheet File</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-navy file:px-3 file:py-2 file:text-white" />
            </label>
          </div>
          <Button type="submit" icon={uploading ? Loader2 : UploadCloud} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload & Map Columns'}
          </Button>
        </form>
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
                  <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{r.original_filename}</p>
                    <p className="text-xs text-slate-500">
                      {r.coverage_month ? `${MONTHS[r.coverage_month - 1]} ${r.coverage_year} · ` : ''}
                      {r.record_count} record(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_TONE[r.status]} icon={false}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                  {(r.status === 'pending_mapping' || r.status === 'rejected') && (
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
    </div>
  )
}

function MappingEditor({ upload, onBack, onChange }) {
  const fields = upload.mappable_fields || {}
  const required = upload.required_fields || []
  const headers = upload.detected_headers || []

  const initialMapping = useMemo(() => {
    const map = {}
    ;(upload.detected_headers || []).forEach((h) => { map[h] = upload.mapping?.[h] ?? '' })
    return map
  }, [upload])

  const [mapping, setMapping] = useState(initialMapping)
  const [preview, setPreview] = useState([])
  const [busy, setBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [remarks, setRemarks] = useState(upload.employer_remarks || '')

  // A field cannot be mapped to two columns at once.
  const usedFields = Object.values(mapping).filter(Boolean)
  const missingRequired = required.filter((f) => !usedFields.includes(f))

  const setColumn = (header, field) => {
    setMapping((prev) => ({ ...prev, [header]: field }))
  }

  const runPreview = async () => {
    setBusy(true)
    try {
      const res = await previewPlacementMapping(upload.id, mapping)
      setPreview(res.records || [])
      onChange(res.data)
      toast.success(res.message)
    } catch (err) {
      toast.error(err.response?.data?.errors?.mapping?.[0] || err.response?.data?.message || 'Preview failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async () => {
    if (missingRequired.length) {
      return toast.error(`Map required fields first: ${missingRequired.map((f) => fields[f]).join(', ')}`)
    }
    setSubmitting(true)
    try {
      const res = await submitPlacementReport(upload.id, remarks)
      toast.success(res.message)
      onBack()
    } catch (err) {
      toast.error(err.response?.data?.errors?.mapping?.[0] || err.response?.data?.message || 'Submit failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Employer Reporting"
        title="Map columns"
        subtitle={upload.original_filename}
        actions={[{ label: 'Back', icon: ArrowLeft, variant: 'ghost', onClick: onBack }]}
      />

      {upload.status === 'rejected' && upload.review_remarks && (
        <AlertBox variant="danger" title="Returned by PESO for revision">{upload.review_remarks}</AlertBox>
      )}

      {missingRequired.length > 0 && (
        <AlertBox variant="warning" title="Required fields not yet mapped">
          Map these before submitting: {missingRequired.map((f) => fields[f]).join(', ')}.
        </AlertBox>
      )}

      <Card>
        <CardHeader title="Column mapping" subtitle="Match each column from your file to a standard PESO field. Leave as “Ignore” to skip a column." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Your Column</th>
                <th className="py-2 pr-4">Sample Value</th>
                <th className="py-2">Maps To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {headers.map((header) => {
                const sample = upload.sample_rows?.find((row) => row[header])?.[header] ?? ''
                return (
                  <tr key={header}>
                    <td className="py-2 pr-4 font-semibold text-slate-800">{header}</td>
                    <td className="py-2 pr-4 text-slate-500">{sample || <span className="italic text-slate-300">empty</span>}</td>
                    <td className="py-2">
                      <select
                        value={mapping[header] || ''}
                        onChange={(e) => setColumn(header, e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Ignore this column</option>
                        {Object.entries(fields).map(([key, label]) => (
                          <option key={key} value={key} disabled={usedFields.includes(key) && mapping[header] !== key}>
                            {label}{required.includes(key) ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Button variant="outline" icon={busy ? Loader2 : CheckCircle2} onClick={runPreview} disabled={busy}>
            {busy ? 'Building preview…' : 'Save mapping & preview records'}
          </Button>
        </div>
      </Card>

      {preview.length > 0 && (
        <Card>
          <CardHeader title={`Preview (${preview.length} shown)`} subtitle="Confirm the normalized records look correct before submitting." />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase tracking-wide text-slate-500">
                  {Object.values(fields).map((label) => <th key={label} className="py-2 pr-3 whitespace-nowrap">{label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((row) => (
                  <tr key={row.id}>
                    {Object.keys(fields).map((key) => (
                      <td key={key} className="py-2 pr-3 whitespace-nowrap text-slate-700">{row[key] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
          <Button icon={submitting ? Loader2 : CheckCircle2} onClick={handleSubmit} disabled={submitting || missingRequired.length > 0}>
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
