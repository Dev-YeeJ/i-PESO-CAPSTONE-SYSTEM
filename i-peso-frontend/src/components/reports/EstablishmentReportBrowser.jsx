import { createElement, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Filter, RefreshCw, FileText, Users, ClipboardCheck, Handshake, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import { AlertBox, Button, Card, CardHeader, EmptyState, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import EstablishmentReportPreview from './EstablishmentReportPreview'
import { previewEstablishmentReport } from '@/services/establishmentReportService'
import { downloadReportBlob } from '@/services/hiringActivityReportService'
import { downloadJobFairResult } from '@/services/jobFairService'
import { adminService } from '@/services/adminService'

const MotionSection = motion.section

const emptyFilters = { employer_id: '', job_fair_id: '', date_from: '', date_to: '' }

const SUMMARY_TILES = [
  ['total_reports', 'Reports', FileText, 'blue'],
  ['total_applicants', 'Applicants', Users, 'blue'],
  ['total_qualified', 'Qualified', ClipboardCheck, 'amber'],
  ['total_near_hired', 'Near Hired', Handshake, 'amber'],
  ['total_hots', 'HOTS', Award, 'green'],
]
const TILE_TONE = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
}

/**
 * Establishment Report = post-event job-fair results only (RO1-JF Form 3).
 * Browses every JobFairResultReport across every job fair (encoding itself
 * still happens on the Job Fair dashboard's "Post-Event Results"/"paper
 * encoding" tabs) — each rendered with the same paper-form-accurate preview
 * used there, with a per-report PDF download.
 *
 * Shared between AdminEstablishmentReportPage and EmployerEstablishmentReportPage's
 * "previously submitted" view — a fix here reaches both roles.
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
      toast.success('Report downloaded.')
    } catch {
      toast.error('Unable to download this report.')
    } finally {
      setDownloadingId(null)
    }
  }

  const options = data?.filter_options ?? {}
  const summary = data?.summary ?? {}
  const reports = data?.reports ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DOLE Region I Job Fair Reporting"
        title="Establishment Report"
        subtitle="RO1-JF Form 3 — every employer's post-event job fair result, encoded on each job fair's dashboard after the event."
      />

      <Card>
        <CardHeader title="Filters" action={<Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />} />
        <div className={`grid gap-3 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {isAdmin && (
            <FilterSelect label="Establishment" value={filters.employer_id} onChange={(value) => update('employer_id', value)} options={(options.employers ?? []).map((employer) => ({ value: employer.employer_id, label: employer.company_name || employer.trade_name }))} empty="All establishments" />
          )}
          <FilterSelect label="Job Fair" value={filters.job_fair_id} onChange={(value) => update('job_fair_id', value)} options={(options.job_fairs ?? []).map((fair) => ({ value: fair.job_fair_id, label: fair.title }))} empty="All job fairs" />
          <FilterDate label="Date From" value={filters.date_from} onChange={(value) => update('date_from', value)} />
          <FilterDate label="Date To" value={filters.date_to} onChange={(value) => update('date_to', value)} />
          <div className="flex items-end">
            <Button variant="outline" icon={RefreshCw} loading={loading} onClick={load} className="w-full">
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </Card>

      {error && <AlertBox variant="danger">{error}</AlertBox>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {SUMMARY_TILES.map(([key, label, Icon, tone]) => {
          const t = TILE_TONE[tone]
          return (
            <div key={key} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.bg} ${t.text}`}>
                {createElement(Icon, { className: 'h-4.5 w-4.5', 'aria-hidden': 'true' })}
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-black leading-none text-slate-950">{summary[key] ?? 0}</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-500">{label}</p>
              </div>
            </div>
          )
        })}
      </section>

      {loading ? (
        <LoadingSkeleton variant="card" rows={3} />
      ) : reports.length === 0 ? (
        <Card>
          <EmptyState filtered icon={FileText} title="No establishment reports found" description="Reports appear here once an employer or admin encodes post-event results on a job fair's dashboard." />
        </Card>
      ) : (
        <AnimatePresence initial={false}>
          {reports.map(({ report, job_fair }) => (
            <MotionSection
              key={report.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm last:mb-0"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-700">{job_fair?.title}</p>
                <Button
                  variant="navy"
                  size="sm"
                  icon={Download}
                  loading={downloadingId === report.id}
                  onClick={() => handleDownload(report.id)}
                >
                  {downloadingId === report.id ? 'Downloading…' : 'Download RO1-JF Form 3'}
                </Button>
              </div>
              <EstablishmentReportPreview report={report} jobFair={job_fair} />
            </MotionSection>
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, empty }) {
  return (
    <label className="text-xs font-bold text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
      >
        <option value="">{empty ?? `Select ${label.toLowerCase()}`}</option>
        {options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function FilterDate({ label, value, onChange }) {
  return (
    <label className="text-xs font-bold text-slate-600">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
      />
    </label>
  )
}
