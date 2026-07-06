import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, MessageSquareText, RefreshCw, RotateCcw, Send, ServerCog, ShieldCheck, SkipForward } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { smsService } from '@/services/smsService'

const initialFilters = { status: '', purpose: '', page: 1, per_page: 15 }

export default function SMSNotificationsPage() {
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestSequence = useRef(0)

  const load = useCallback(async (nextFilters = filters) => {
    const requestId = ++requestSequence.current
    setLoading(true)
    setError('')
    try {
      const response = await smsService.getLogs(nextFilters)
      if (requestId === requestSequence.current) setData(response)
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(requestError.response?.data?.message || 'SMS gateway status could not be loaded.')
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [filters])

  useEffect(() => { load(initialFilters) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilter = (key, value) => {
    const next = { ...filters, [key]: value, page: 1 }
    setFilters(next)
    load(next)
  }

  const goToPage = (page) => {
    const next = { ...filters, page }
    setFilters(next)
    load(next)
  }

  const resetFilters = () => {
    setFilters(initialFilters)
    load(initialFilters)
  }

  const gateway = data?.gateway || {}
  const summary = data?.summary || {}
  const logs = data?.logs?.data || []
  const operations = data?.operations || {}

  return (
    <div className="portal-page">
      <PageHeader title="SMS Gateway" subtitle="Monitor safe SMS delivery records for employment notifications." eyebrow="System & Reports" actions={[{ label: 'Refresh', icon: RefreshCw, variant: 'outline', onClick: () => load() }]} />

      <section className={`rounded-xl border p-5 sm:p-6 ${gateway.log_only ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3"><span className={`rounded-xl p-2.5 ${gateway.log_only ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{gateway.log_only ? <ShieldCheck className="h-5 w-5" /> : <Send className="h-5 w-5" />}</span><div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Current SMS mode</p><h2 className="mt-1 text-xl font-black text-slate-950">{gateway.effective_mode === 'unisms' ? 'UniSMS Live' : 'Log Only'}</h2><p className="mt-1 text-sm text-slate-600">{gateway.notice || 'Gateway configuration is being loaded.'}</p></div></div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs"><GatewayFact label="Provider" value={gateway.provider || 'UniSMS'} /><GatewayFact label="Sender ID" value={gateway.sender_id_configured ? 'Configured' : 'Missing'} /><GatewayFact label="Credentials" value={gateway.credentials_configured ? 'Configured' : 'Missing'} /><GatewayFact label="Configured driver" value={pretty(gateway.configured_driver || 'log_only')} /></div>
        </div>
      </section>

      <Card padding="sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="flex items-start gap-3"><span className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><ServerCog className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-950">Queue and scheduler readiness</h2><p className="mt-1 text-sm leading-6 text-slate-600">Queue connection: <strong>{pretty(operations.queue_connection || 'not reported')}</strong>. Run the queue worker and scheduler in production so queued notifications and interview reminders are processed.</p></div></div><div className="grid gap-1 rounded-lg bg-slate-950 px-4 py-3 font-mono text-[11px] text-slate-200"><span>{operations.queue_command || 'php artisan queue:work'}</span><span>{operations.scheduler_command || 'php artisan schedule:run'}</span><span>php artisan config:clear &amp;&amp; php artisan config:cache</span></div></div>
      </Card>

      {error && <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle className="h-5 w-5" />{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi icon={MessageSquareText} label="Total Logged" value={summary.total} />
        <Kpi icon={CheckCircle2} label="Sent" value={summary.sent} tone="emerald" />
        <Kpi icon={Clock3} label="Pending / Retrying" value={(summary.pending || 0) + (summary.retrying || 0)} tone="blue" />
        <Kpi icon={SkipForward} label="Skipped" value={summary.skipped} />
        <Kpi icon={ShieldCheck} label="Log Only" value={summary.log_only} tone="amber" />
        <Kpi icon={AlertTriangle} label="Failed" value={summary.failed} tone="red" />
      </div>

      <Card padding="none" className={loading ? 'ring-2 ring-brand-100' : ''}>
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-bold text-slate-950">SMS delivery log</h2><p className="mt-1 text-sm text-slate-500">Phone numbers are masked. Provider credentials are never returned.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Filter label="Status" value={filters.status} onChange={(value) => applyFilter('status', value)} options={['pending', 'sent', 'failed', 'skipped', 'log_only', 'retrying']} disabled={loading} />
            <Filter label="Purpose" value={filters.purpose} onChange={(value) => applyFilter('purpose', value)} options={data?.purposes || []} disabled={loading} />
            <Button size="sm" variant="outline" onClick={resetFilters} disabled={loading || (!filters.status && !filters.purpose)} icon={RotateCcw}>Reset</Button>
          </div>
        </div>

        {loading && data && <div className="h-1 overflow-hidden bg-brand-50"><div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" /></div>}

        {loading && !data ? <TableSkeleton /> : logs.length ? <>
          <div className="overflow-x-auto" aria-busy={loading}><table className="min-w-[900px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Purpose</th><th className="px-4 py-3">Message</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((log) => <tr key={log.id} className="align-top hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(log.created_at)}</td><td className="px-4 py-3"><p className="font-semibold text-slate-900">{pretty(log.recipient_type)}</p><p className="mt-1 font-mono text-xs text-slate-500">{log.phone_number}</p></td><td className="px-4 py-3 text-slate-700">{pretty(log.purpose)}</td><td className="max-w-sm whitespace-normal break-words px-4 py-3"><p className="leading-5 text-slate-700">{log.message_preview}</p>{log.error_message && <p className="mt-1 break-words text-xs text-red-600">{log.error_message}</p>}</td><td className="max-w-52 px-4 py-3 text-slate-600"><p>{pretty(log.provider)}</p>{log.provider_reference_id && <p className="mt-1 break-all font-mono text-[10px] text-slate-400" title="Provider reference ID">{log.provider_reference_id}</p>}</td><td className="px-4 py-3"><Status status={log.status} /></td></tr>)}</tbody></table></div>
          <Pagination page={data.logs.current_page} lastPage={data.logs.last_page} onChange={goToPage} loading={loading} />
        </> : <div className="p-6"><div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">No SMS records match the selected filters.</div></div>}
      </Card>
    </div>
  )
}

function Kpi({ icon, label, value, tone = 'slate' }) { const tones = { slate: 'bg-slate-100 text-slate-700', emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700' }; return <Card padding="sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{Number(value || 0).toLocaleString()}</p></div><span className={`rounded-xl p-2 ${tones[tone]}`}>{createElement(icon, { className: 'h-5 w-5' })}</span></div></Card> }
function GatewayFact({ label, value }) { return <div><p className="font-semibold text-slate-500">{label}</p><p className="mt-0.5 font-bold text-slate-900">{value}</p></div> }
function Filter({ label, value, onChange, options, disabled }) { return <label className="min-w-0"><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 sm:min-w-44 focus:ring-2 focus:ring-brand-500"><option value="">All</option>{options.map((option) => <option key={option} value={option}>{pretty(option)}</option>)}</select></label> }
function Status({ status }) { const styles = { sent: 'bg-emerald-50 text-emerald-700', failed: 'bg-red-50 text-red-700', skipped: 'bg-slate-100 text-slate-700', log_only: 'bg-amber-50 text-amber-800', retrying: 'bg-blue-50 text-blue-700', pending: 'bg-blue-50 text-blue-700' }; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || styles.pending}`}>{pretty(status)}</span> }
function Pagination({ page, lastPage, onChange, loading }) { if (lastPage <= 1) return null; return <div className="flex items-center justify-between border-t border-slate-100 p-4"><p className="text-xs text-slate-500">Page {page} of {lastPage}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || page >= lastPage} onClick={() => onChange(page + 1)}>Next</Button></div></div> }
function TableSkeleton() { return <div className="divide-y divide-slate-100 animate-pulse">{[1, 2, 3, 4].map((item) => <div key={item} className="grid grid-cols-4 gap-4 p-4"><div className="h-4 rounded bg-slate-200" /><div className="h-4 rounded bg-slate-100" /><div className="h-4 rounded bg-slate-100" /><div className="h-4 rounded bg-slate-200" /></div>)}</div> }
function formatDate(value) { return value ? new Date(value).toLocaleString('en-PH') : 'Not available' }
function pretty(value = '') { return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
