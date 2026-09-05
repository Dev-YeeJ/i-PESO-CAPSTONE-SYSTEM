import { createElement, useEffect, useState } from 'react'
import { FileText, FileBarChart, CalendarDays, CheckCircle2, Printer, Save, X, Loader2 } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import { adminService } from '@/services/adminService'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const SIGNATORY_ROLES = [
  ['prepared_by', 'Prepared by', 'SLEO/PESO Coordinator'],
  ['checked_by', 'Checked by', 'CGADH1/PESO Manager'],
  ['approved_by', 'Approved by', 'City Mayor'],
]

const emptySignatories = () => ({
  prepared_by: { name: '', position: '' },
  checked_by: { name: '', position: '' },
  approved_by: { name: '', position: '' },
})

export default function DOLEReportingPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  // Generate modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [signatories, setSignatories] = useState(emptySignatories())
  const [issuesConcerns, setIssuesConcerns] = useState('')
  const [exportingId, setExportingId] = useState(null)

  // Editable report state — the report currently open in the preview/editor,
  // plus its editable copy. Rows/other-accomplishments/issues/signatories are
  // all editable here regardless of whether the system computed them, so a
  // preparer can fill in the blanks (LMI, Career Guidance, AIR-TIP, and the
  // local/overseas sub-splits the system can't derive) before submitting.
  const [generatedReport, setGeneratedReport] = useState(null)
  const [generatedReportId, setGeneratedReportId] = useState(null)
  const [editableRows, setEditableRows] = useState([])
  const [previewOther, setPreviewOther] = useState({ ftja_total: '', ftja_with_attachment: '' })
  const [previewIssuesConcerns, setPreviewIssuesConcerns] = useState('')
  const [previewSignatories, setPreviewSignatories] = useState(emptySignatories())
  const [isSaving, setIsSaving] = useState(false)

  const fetchReports = () => {
    setLoading(true)
    adminService.getReports({ per_page: 15 }).then(d => {
      setReports(d.data || [])
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchReports()
  }, [])

  // Whenever a report is loaded into the preview (freshly generated, or
  // opened from history), seed the editable copies from it.
  useEffect(() => {
    if (!generatedReport) return
    setEditableRows(generatedReport.rows || [])
    setPreviewOther({
      ftja_total: generatedReport.other_accomplishments?.ftja_total ?? '',
      ftja_with_attachment: generatedReport.other_accomplishments?.ftja_with_attachment ?? '',
    })
    setPreviewIssuesConcerns(generatedReport.issues_concerns || '')
    const sig = generatedReport.signatories || {}
    setPreviewSignatories({
      prepared_by: { name: sig.prepared_by?.name || '', position: sig.prepared_by?.position || '' },
      checked_by: { name: sig.checked_by?.name || '', position: sig.checked_by?.position || '' },
      approved_by: { name: sig.approved_by?.name || '', position: sig.approved_by?.position || '' },
    })
  }, [generatedReport])

  const handleGenerate = async (e) => {
    e.preventDefault()
    setIsGenerating(true)
    try {
      const res = await adminService.generateSPRS(selectedMonth, selectedYear, { signatories, issues_concerns: issuesConcerns })
      toast.success(res.message)
      setGeneratedReport(res.data)
      setGeneratedReportId(res.report?.report_id ?? null)
      setShowGenerateModal(false)
      fetchReports() // refresh history
    } catch (err) {
      toast.error('Failed to generate SPRS report')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportPdf = async (row) => {
    setExportingId(row.report_id)
    try {
      const blob = await adminService.exportSprsPdf(row.report_id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sprs-${row.report_id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Failed to export SPRS PDF')
      console.error(err)
    } finally {
      setExportingId(null)
    }
  }

  const openReport = (row) => {
    setGeneratedReport(row.data_summary)
    setGeneratedReportId(row.report_id)
  }

  const closePreview = () => {
    setGeneratedReport(null)
    setGeneratedReportId(null)
  }

  const setSigner = (role, field, value) => setSignatories((s) => ({ ...s, [role]: { ...s[role], [field]: value } }))
  const setPreviewSigner = (role, field, value) => setPreviewSignatories((s) => ({ ...s, [role]: { ...s[role], [field]: value } }))

  const updateRow = (key, field, value) => {
    setEditableRows((rows) => rows.map((r) => (
      r.key === key ? { ...r, [field]: value === '' ? null : Number(value) } : r
    )))
  }

  const handleSaveSprs = async () => {
    if (!generatedReportId) {
      toast.error('This report has no ID to save against — try regenerating it.')
      return
    }
    setIsSaving(true)
    try {
      const res = await adminService.updateSprs(generatedReportId, {
        rows: editableRows,
        other_accomplishments: {
          ftja_total: previewOther.ftja_total === '' ? null : Number(previewOther.ftja_total),
          ftja_with_attachment: previewOther.ftja_with_attachment === '' ? null : Number(previewOther.ftja_with_attachment),
        },
        issues_concerns: previewIssuesConcerns,
        signatories: previewSignatories,
      })
      toast.success('SPRS report saved')
      setGeneratedReport(res.data)
      fetchReports()
    } catch (err) {
      toast.error('Failed to save SPRS report')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const columns = [
    { key: 'month', label: 'Report Period', render: (val, row) => new Date(row.coverage_start || row.report_date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) },
    { key: 'category', label: 'Category', render: (val, row) => row.report_category?.toUpperCase() || 'SPRS' },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => (
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
          row.status === 'submitted'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          {row.status || 'Draft'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => openReport(row)}
            className="text-brand-600 hover:text-brand-900 text-sm font-bold"
          >
            View / Edit
          </button>
          <button
            onClick={() => handleExportPdf(row)}
            disabled={exportingId === row.report_id}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm font-bold disabled:opacity-50"
          >
            {exportingId === row.report_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            PDF
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="portal-page relative">
      {/* Hide the main UI when printing! */}
      <div className="print:hidden">
        <PageHeader
          title="DOLE Reporting (SPRS)"
          subtitle="Generate Statistical Performance Reports and manage official DOLE submissions."
          eyebrow="Government & DOLE"
          actions={[
            { label: 'Establishment Report / RO1-JF Form 3', onClick: () => navigate('/admin/establishment-report'), variant: 'outline' },
            { label: 'Generate New SPRS', onClick: () => setShowGenerateModal(true), variant: 'primary' },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={FileText} label="Total Reports" value={reports.length} detail="Generated SPRS" tone="navy" />
          <SummaryCard icon={CalendarDays} label="Recent Submissions" value={reports.filter(r => r.status === 'submitted').length} detail="Officially filed" tone="green" />
          <SummaryCard icon={FileBarChart} label="Placements YTD" value={0} detail="Year to date" tone="blue" />
          <SummaryCard icon={CheckCircle2} label="Compliance" value="100%" detail="On-time submission rate" tone="amber" />
        </div>

        <Card padding="none" className="mt-6">
          <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950">SPRS History</h2>
              <p className="text-sm text-slate-500">View and track past statistical reports.</p>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={reports}
            loading={loading}
            emptyMessage="No reports found. Generate your first SPRS to begin tracking compliance."
          />
        </Card>
      </div>

      {/* GENERATE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Generate SPRS</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleGenerate}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 p-2.5"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 p-2.5"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    min="2020"
                    max="2100"
                  />
                </div>
              </div>
              <div className="mb-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Signatories (optional)</p>
                {SIGNATORY_ROLES.map(([role, label]) => (
                  <div key={role} className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                      placeholder={`${label} — name`}
                      value={signatories[role].name}
                      onChange={(e) => setSigner(role, 'name', e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-slate-300 p-2 text-sm"
                      placeholder="Position"
                      value={signatories[role].position}
                      onChange={(e) => setSigner(role, 'position', e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Issues / Concerns (optional)</label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                  rows={3}
                  placeholder="Note anything DOLE needs to see for this reporting month..."
                  value={issuesConcerns}
                  onChange={(e) => setIssuesConcerns(e.target.value)}
                />
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Everything the system can't compute — LMI, Career Guidance, AIR-TIP, and the local/overseas
                breakdowns — opens as blank, editable cells after generation, so you can fill them in by hand.
              </p>
              <Button type="submit" disabled={isGenerating} className="w-full">
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Generate & Extract Data'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* PRINT / EDIT PREVIEW OVERLAY */}
      {generatedReport && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto print:absolute print:inset-0 print:bg-white print:overflow-visible">

          <div className="max-w-5xl mx-auto my-8 print:my-0">
            {/* Top Toolbar (Hidden on Print) */}
            <div className="flex items-center justify-between bg-white rounded-t-2xl border-b border-slate-200 p-4 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-900">SPRS Editor</h3>
                <p className="text-xs text-slate-500">Blue cells are system-computed. White cells are blank until you fill them in. Every cell is editable.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={closePreview}>
                  Close
                </Button>
                <Button variant="secondary" onClick={handleSaveSprs} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                </Button>
                <Button onClick={() => window.print()} className="gap-2">
                  <Printer className="h-4 w-4" /> Print Document
                </Button>
              </div>
            </div>

            {/* The Actual Report Form */}
            <div className="bg-white p-6 sm:p-10 print:p-0 shadow-lg rounded-b-2xl print:shadow-none print:rounded-none">

              <div className="text-center mb-4 border-b-2 border-black pb-3">
                <p className="text-right text-xs font-bold">SPRS Form 2018</p>
                <h1 className="text-lg font-bold uppercase">Department of Labor and Employment</h1>
                <p className="text-sm">Regional Office No. 1 &middot; San Fernando City, La Union</p>
                <h2 className="text-base font-bold uppercase mt-2">Statistical Performance Reporting System (SPRS)</h2>
                <p className="text-sm font-semibold">PESO Monthly Operations Statistical Report (PESO OpS)</p>
              </div>

              <div className="flex flex-wrap justify-between gap-3 text-sm mb-4">
                <div>
                  <p><span className="font-bold">LGU/PESO:</span> Urdaneta City</p>
                  <p><span className="font-bold">Province:</span> Pangasinan</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Reference Month/Year:</span> {generatedReport.period}</p>
                </div>
              </div>

              <div className="mb-6 overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse border border-black text-xs">
                  <thead>
                    <tr className="bg-slate-100">
                      <th rowSpan={2} className="border border-black p-2 text-left w-[32%]">Programs / Success Indicators</th>
                      <th rowSpan={2} className="border border-black p-2 w-[8%]">Whole Year Target</th>
                      <th colSpan={2} className="border border-black p-2">Previous Reporting Month</th>
                      <th colSpan={2} className="border border-black p-2">Current Reporting Month</th>
                      <th colSpan={2} className="border border-black p-2">Cumulative (Jan&ndash;current)</th>
                    </tr>
                    <tr className="bg-slate-100">
                      <th className="border border-black p-1.5 w-[8%]">Total</th>
                      <th className="border border-black p-1.5 w-[8%]">Female</th>
                      <th className="border border-black p-1.5 w-[8%]">Total</th>
                      <th className="border border-black p-1.5 w-[8%]">Female</th>
                      <th className="border border-black p-1.5 w-[8%]">Total</th>
                      <th className="border border-black p-1.5 w-[8%]">Female</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="border border-black p-3 text-center text-slate-500">
                          This report was generated before the full-form layout was added. Regenerate it to see every indicator line.
                        </td>
                      </tr>
                    )}
                    {editableRows.map((row) => row.section ? (
                      <tr key={row.key} className="bg-slate-200">
                        <td colSpan={8} className="border border-black p-1.5 font-bold uppercase">{row.label}</td>
                      </tr>
                    ) : (
                      <tr key={row.key}>
                        <td className="border border-black p-1.5" style={{ paddingLeft: `${8 + (row.indent || 0) * 14}px` }}>{row.label}</td>
                        <NumCell value={row.target} onChange={(v) => updateRow(row.key, 'target', v)} />
                        <NumCell value={row.prev_total} onChange={(v) => updateRow(row.key, 'prev_total', v)} auto={row.auto} />
                        <NumCell value={row.prev_female} onChange={(v) => updateRow(row.key, 'prev_female', v)} auto={row.auto} />
                        <NumCell value={row.curr_total} onChange={(v) => updateRow(row.key, 'curr_total', v)} auto={row.auto} />
                        <NumCell value={row.curr_female} onChange={(v) => updateRow(row.key, 'curr_female', v)} auto={row.auto} />
                        <NumCell value={row.cum_total} onChange={(v) => updateRow(row.key, 'cum_total', v)} auto={row.auto} />
                        <NumCell value={row.cum_female} onChange={(v) => updateRow(row.key, 'cum_female', v)} auto={row.auto} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <p className="font-bold border-b border-black text-sm mb-2 uppercase">Other Accomplishments</p>
                <table className="w-full text-sm border-collapse border border-black">
                  <tbody>
                    <tr>
                      <td className="border border-black p-2 w-2/3">
                        First Time Jobseeker Act (RA 11261)
                        <span className="block text-xs text-slate-500 font-normal">(Attachment Included)</span>
                      </td>
                      <td className="border border-black p-1.5 text-center w-1/6">
                        <input
                          type="number"
                          value={previewOther.ftja_total}
                          onChange={(e) => setPreviewOther((o) => ({ ...o, ftja_total: e.target.value }))}
                          placeholder="—"
                          className="w-full bg-blue-50 px-1.5 py-1 text-center text-sm outline-none"
                        />
                      </td>
                      <td className="border border-black p-1.5 text-center w-1/6">
                        <label className="block text-[10px] text-slate-500">Attachment Included</label>
                        <input
                          type="number"
                          value={previewOther.ftja_with_attachment}
                          onChange={(e) => setPreviewOther((o) => ({ ...o, ftja_with_attachment: e.target.value }))}
                          placeholder="—"
                          className="w-full bg-blue-50 px-1.5 py-1 text-center text-sm outline-none"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <p className="font-bold border-b border-black text-sm mb-2 uppercase">Issues / Concerns</p>
                <textarea
                  className="w-full border border-black p-2 text-sm"
                  rows={3}
                  placeholder="Indicate issues and/or concerns encountered by the PESO in the delivery/provision of services, particularly those needing immediate action."
                  value={previewIssuesConcerns}
                  onChange={(e) => setPreviewIssuesConcerns(e.target.value)}
                />
              </div>

              <div className="mt-12 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                {SIGNATORY_ROLES.map(([role, label, defaultPosition]) => (
                  <div key={role} className="text-center">
                    <p className="text-xs text-slate-500 mb-1">{label}:</p>
                    <input
                      className="w-full border-b border-black text-center font-bold py-1 outline-none"
                      placeholder="Name"
                      value={previewSignatories[role].name}
                      onChange={(e) => setPreviewSigner(role, 'name', e.target.value)}
                    />
                    <input
                      className="w-full text-center text-xs text-slate-500 mt-1 outline-none"
                      placeholder={defaultPosition}
                      value={previewSignatories[role].position}
                      onChange={(e) => setPreviewSigner(role, 'position', e.target.value)}
                    />
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function NumCell({ value, onChange, auto = false }) {
  return (
    <td className={`border border-black p-0 text-center ${auto ? 'bg-blue-50' : 'bg-white'}`}>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="w-full min-w-[52px] bg-transparent px-1.5 py-1.5 text-center text-xs outline-none focus:bg-amber-50"
      />
    </td>
  )
}

function SummaryCard({ icon, label, value, detail, tone }) {
  const tones = {
    navy: 'bg-slate-100 text-brand-navy',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>
          {createElement(icon, { className: 'h-5 w-5' })}
        </span>
      </div>
    </Card>
  )
}
