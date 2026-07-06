import { createElement, useEffect, useState } from 'react'
import { ArrowLeft, CalendarRange, CircleAlert, FileChartColumn } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'

export default function AnalyticsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const backToReports = () => navigate('/admin/labor-analytics?view=reports')

  useEffect(() => {
    adminService.getReportDetail(id)
      .then(setReport)
      .catch((requestError) => setError(requestError.response?.data?.message || 'This report could not be loaded.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <ReportSkeleton />

  if (!report) {
    return <div className="portal-page"><PageHeader title="Analytics Report" subtitle="Saved analytics snapshot" eyebrow="System & Reports" /><Card><div className="flex flex-col items-center py-10 text-center"><span className="rounded-full bg-red-50 p-3 text-red-600"><CircleAlert className="h-6 w-6" /></span><h2 className="mt-4 font-bold text-slate-950">Report unavailable</h2><p className="mt-1 max-w-md text-sm leading-6 text-slate-600">{error || 'The requested report was not found.'}</p><Button className="mt-5" variant="outline" onClick={backToReports} icon={ArrowLeft}>Back to reports</Button></div></Card></div>
  }

  const sections = Object.entries(report.data_summary || {})

  return (
    <div className="portal-page min-w-0">
      <PageHeader
        title={report.title || 'Analytics Report'}
        subtitle={`${pretty(report.report_category)} · Generated ${formatDateTime(report.created_at)}`}
        eyebrow="System & Reports"
        actions={[{ label: 'Back to Reports', icon: ArrowLeft, variant: 'outline', onClick: backToReports }]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card padding="sm"><Meta icon={CalendarRange} label="Coverage period" value={`${formatDate(report.coverage_start)} – ${formatDate(report.coverage_end)}`} /></Card>
        <Card padding="sm"><Meta icon={FileChartColumn} label="Report category" value={pretty(report.report_category)} /></Card>
      </div>
      {sections.length ? <div className="space-y-5">{sections.map(([key, value]) => <ReportSection key={key} title={pretty(key)} value={value} />)}</div> : <Card><p className="py-8 text-center text-sm text-slate-500">This report contains no data for the selected period.</p></Card>}
      <div className="flex justify-end"><Button variant="outline" onClick={backToReports} icon={ArrowLeft}>Back to reports</Button></div>
    </div>
  )
}

function ReportSection({ title, value }) {
  return <Card className="min-w-0"><h2 className="mb-4 text-lg font-black text-slate-950">{title}</h2><ReportValue value={value} /></Card>
}

function ReportValue({ value, depth = 0 }) {
  if (value === null || value === undefined) return <span className="text-sm text-slate-400">Not available</span>
  if (Array.isArray(value)) return <ReportTable rows={value} />
  if (typeof value !== 'object') return <MetricValue value={value} />

  const entries = Object.entries(value)
  if (!entries.length) return <p className="text-sm text-slate-500">No data matched this report period.</p>

  return <div className={`grid gap-3 ${depth === 0 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>{entries.map(([key, item]) => {
    const complex = item !== null && typeof item === 'object'
    return complex ? <section key={key} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2 xl:col-span-full"><h3 className="mb-3 text-sm font-extrabold text-slate-800">{pretty(key)}</h3><ReportValue value={item} depth={depth + 1} /></section> : <Metric key={key} label={pretty(key)} value={item} />
  })}</div>
}

function ReportTable({ rows }) {
  if (!rows.length) return <p className="text-sm text-slate-500">No data matched this report period.</p>
  const normalized = rows.map((row) => typeof row === 'object' && row !== null ? row : { value: row })
  const columns = [...new Set(normalized.flatMap(Object.keys))]

  return <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-[640px] w-full table-auto text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3">{pretty(column)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white">{normalized.slice(0, 50).map((row, index) => <tr key={index} className="align-top hover:bg-slate-50/70">{columns.map((column) => <td key={column} className="max-w-xs whitespace-normal break-words px-4 py-3 leading-5 text-slate-700">{formatCell(row[column])}</td>)}</tr>)}</tbody></table></div>
}

function Metric({ label, value }) { return <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><MetricValue value={value} /></div> }
function MetricValue({ value }) { return <p className="mt-2 break-words text-base font-black leading-6 text-slate-950 sm:text-lg">{formatCell(value)}</p> }
function Meta({ icon, label, value }) { return <div className="flex min-w-0 items-center gap-3"><span className="shrink-0 rounded-xl bg-brand-50 p-2.5 text-brand-700">{createElement(icon, { className: 'h-5 w-5' })}</span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words font-bold text-slate-950">{value}</p></div></div> }
function ReportSkeleton() { return <div className="portal-page animate-pulse"><div className="h-24 rounded-2xl bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2"><div className="h-24 rounded-2xl bg-slate-200" /><div className="h-24 rounded-2xl bg-slate-200" /></div><div className="h-96 rounded-2xl bg-slate-200" /></div> }
function formatCell(value) { if (value === null || value === undefined || value === '') return '—'; if (Array.isArray(value)) return value.length ? `${value.length} data point${value.length === 1 ? '' : 's'}` : 'No data'; if (typeof value === 'object') return Object.entries(value).slice(0, 4).map(([key, item]) => `${pretty(key)}: ${typeof item === 'object' ? 'See details' : item}`).join(' · '); if (typeof value === 'boolean') return value ? 'Yes' : 'No'; return String(value) }
function formatDate(value) { if (!value) return 'Not specified'; return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-PH') }
function formatDateTime(value) { if (!value) return 'date unavailable'; return new Date(value).toLocaleString('en-PH') }
function pretty(value = '') { return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
