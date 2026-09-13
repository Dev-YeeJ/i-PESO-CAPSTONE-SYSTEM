import { useCallback, useEffect, useState } from 'react'
import { Download, Filter, RefreshCw, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { EmptyState, LoadingSkeleton } from '@/components/ui'
import EstablishmentReportPreview from './EstablishmentReportPreview'
import { previewEstablishmentReport } from '@/services/establishmentReportService'
import { downloadReportBlob } from '@/services/hiringActivityReportService'
import { downloadJobFairResult } from '@/services/jobFairService'
import { adminService } from '@/services/adminService'

const emptyFilters = { employer_id: '', job_fair_id: '', date_from: '', date_to: '' }

/**
 * Establishment Report = post-event job-fair results only (RO1-JF Form 3).
 * Browses every JobFairResultReport across every job fair (encoding itself
 * still happens on the Job Fair dashboard's "Post-Event Results"/"paper
 * encoding" tabs) — each rendered with the same paper-form-accurate preview
 * used there, with a per-report PDF download.
 */
export default function EstablishmentReportBrowser({ role }) {
  const isAdmin = role === 'admin'
  const [filters, setFilters] = useState(emptyFilters)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await previewEstablishmentReport(role, filters))
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load establishment reports.')
    } finally {
      setLoading(false)
    }
  }, [filters, role])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (name, value) => setFilters((current) => ({ ...current, [name]: value }))

  const handleDownload = async (resultReportId) => {
    setDownloadingId(resultReportId)
    try {
      const blob = isAdmin ? await adminService.downloadJobFairResult(resultReportId) : await downloadJobFairResult(resultReportId)
      downloadReportBlob(blob, `ro1-jf-form-3-${resultReportId}.pdf`)
    } catch {
      toast.error('Unable to download this report.')
    } finally {
      setDownloadingId(null)
    }
  }

  const options = data?.filter_options ?? {}
  const summary = data?.summary ?? {}

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-black uppercase text-blue-800">DOLE Region I Job Fair Reporting</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Establishment Report</h1>
        <p className="mt-1 text-sm font-bold text-slate-500">RO1-JF Form 3</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Every employer&apos;s post-event job fair result, in one place — encoded on each job fair&apos;s dashboard after the event.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500" /><h2 className="font-black text-slate-950">Filters</h2></div>
        <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {isAdmin && (
            <FilterSelect label="Establishment" value={filters.employer_id} onChange={(value) => update('employer_id', value)} options={(options.employers ?? []).map((employer) => ({ value: employer.employer_id, label: employer.company_name || employer.trade_name }))} empty="All establishments" />
          )}
          <FilterSelect label="Job Fair" value={filters.job_fair_id} onChange={(value) => update('job_fair_id', value)} options={(options.job_fairs ?? []).map((fair) => ({ value: fair.job_fair_id, label: fair.title }))} empty="All job fairs" />
          <FilterDate label="Date From" value={filters.date_from} onChange={(value) => update('date_from', value)} />
          <FilterDate label="Date To" value={filters.date_to} onChange={(value) => update('date_to', value)} />
          <div className="flex items-end"><button onClick={load} disabled={loading} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-900 px-4 py-2.5 text-sm font-bold text-blue-900 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
        </div>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          ['Reports', summary.total_reports ?? 0],
          ['Applicants', summary.total_applicants ?? 0],
          ['Qualified', summary.total_qualified ?? 0],
          ['Near Hired', summary.total_near_hired ?? 0],
          ['HOTS', summary.total_hots ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-black text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      {loading ? (
        <LoadingSkeleton variant="card" rows={3} />
      ) : (data?.reports ?? []).length === 0 ? (
        <EmptyState filtered icon={FileText} title="No establishment reports found" description="Reports appear here once an employer or admin encodes post-event results on a job fair's dashboard." />
      ) : (
        data.reports.map(({ report, job_fair }) => (
          <section key={report.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-700">{job_fair?.title}</p>
              <button
                onClick={() => handleDownload(report.id)}
                disabled={downloadingId === report.id}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {downloadingId === report.id ? 'Downloading…' : 'Download RO1-JF Form 3'}
              </button>
            </div>
            <EstablishmentReportPreview report={report} jobFair={job_fair} />
          </section>
        ))
      )}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, empty }) { return <label className="text-xs font-bold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-900"><option value="">{empty ?? `Select ${label.toLowerCase()}`}</option>{options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}</select></label> }
function FilterDate({ label, value, onChange }) { return <label className="text-xs font-bold text-slate-600">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-900" /></label> }
