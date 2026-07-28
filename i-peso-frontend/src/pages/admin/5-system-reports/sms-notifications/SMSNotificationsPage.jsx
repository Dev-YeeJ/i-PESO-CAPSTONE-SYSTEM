import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, MessageSquareText, RefreshCw, RotateCcw, Send, ShieldCheck, SkipForward } from 'lucide-react'
import { Button, Card, EmptyState, StatCard } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { smsService } from '@/services/smsService'

const initialFilters = { status: '', purpose: '', page: 1, per_page: 15 }

export default function SMSNotificationsPage() {
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState(initialFilters)
  const [draftFilters, setDraftFilters] = useState({ status: '', purpose: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestSequence = useRef(0)

  const load = useCallback(async (nextFilters) => {
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
  }, [])

  useEffect(() => { load(initialFilters) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = async () => {
    const next = { ...filters, ...draftFilters, page: 1 }
    setFilters(next)
    await load(next)
  }

  const updateDraftFilter = (key, value) => {
    setDraftFilters((current) => ({ ...current, [key]: value }))
  }

  const goToPage = async (page) => {
    const next = { ...filters, page }
    setFilters(next)
    await load(next)
  }

  const resetFilters = async () => {
    setDraftFilters({ status: '', purpose: '' })
    setFilters(initialFilters)
    await load(initialFilters)
  }

  const gateway = data?.gateway || {}
  const summary = data?.summary || {}
  const logs = data?.logs?.data || []
  const showLiveIndicator = gateway.effective_mode === 'unisms' && !gateway.log_only

  return (
    <div className="portal-page">
      <PageHeader title="SMS Gateway" subtitle="Delivery status and recent SMS activity." eyebrow="System & Reports" actions={[{ label: 'Refresh', icon: RefreshCw, variant: 'outline', onClick: () => load() }]} />

      <section className={`rounded-xl border p-5 sm:p-6 ${gateway.log_only ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className={`rounded-2xl p-3 shadow-sm ${gateway.log_only ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {gateway.log_only ? <ShieldCheck className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Current SMS mode</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{gateway.effective_mode === 'unisms' && showLiveIndicator ? 'UniSMS Live' : 'Log Only'}</h2>
              {gateway.notice ? <p className="mt-1 max-w-2xl text-sm text-slate-600">{gateway.notice}</p> : null}
            </div>
          </div>
        </div>
      </section>

      {error && <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle className="h-5 w-5" />{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={MessageSquareText} color="blue" label="Total Logged" value={num(summary.total)} />
        <StatCard icon={CheckCircle2} color="green" label="Sent" value={num(summary.sent)} />
        <StatCard icon={Clock3} color="blue" label="Pending / Retrying" value={num((summary.pending || 0) + (summary.retrying || 0))} />
        <StatCard icon={SkipForward} color="slate" label="Skipped" value={num(summary.skipped)} />
        <StatCard icon={ShieldCheck} color="amber" label="Log Only" value={num(summary.log_only)} />
        <StatCard icon={AlertTriangle} color="red" label="Failed" value={num(summary.failed)} />
      </div>

      <Card padding="none" className={loading ? 'ring-2 ring-brand-100' : ''}>
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-bold text-slate-950">SMS delivery log</h2><p className="mt-1 text-sm text-slate-500">Recent SMS attempts are shown below.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Filter label="Status" value={draftFilters.status} onChange={(value) => updateDraftFilter('status', value)} options={['pending', 'sent', 'failed', 'skipped', 'log_only', 'retrying']} disabled={loading} />
            <Filter label="Purpose" value={draftFilters.purpose} onChange={(value) => updateDraftFilter('purpose', value)} options={data?.purposes || []} disabled={loading} />
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={applyFilters} disabled={loading || (draftFilters.status === filters.status && draftFilters.purpose === filters.purpose)}>Apply</Button>
              <Button size="sm" variant="outline" onClick={resetFilters} disabled={loading || (!filters.status && !filters.purpose && !draftFilters.status && !draftFilters.purpose)} icon={RotateCcw}>Reset</Button>
            </div>
          </div>
        </div>

        {loading && data && <div className="h-1 overflow-hidden bg-brand-50"><div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" /></div>}

        {loading && !data ? <TableSkeleton /> : logs.length ? <>
          <div className="overflow-x-auto" aria-busy={loading}>
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50/70 transition-colors duration-150">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{pretty(log.recipient_type)}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{log.phone_number}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{pretty(log.purpose)}</td>
                    <td className="max-w-sm whitespace-normal break-words px-4 py-3">
                      <p className="leading-5 text-slate-700">{log.message_preview}</p>
                      {log.error_message && <p className="mt-1 break-words text-xs text-red-600">{log.error_message}</p>}
                    </td>
                    <td className="max-w-52 px-4 py-3 text-slate-600">
                      <p>{pretty(log.provider)}</p>
                      {log.provider_reference_id && <p className="mt-1 break-all font-mono text-[10px] text-slate-400" title="Provider reference ID">{log.provider_reference_id}</p>}
                    </td>
                    <td className="px-4 py-3"><Status status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.logs.current_page} lastPage={data.logs.last_page} onChange={goToPage} loading={loading} />
        </> : <EmptyState filtered title="No SMS records match your filters" description="Try adjusting the status or purpose filters above." />}
      </Card>
    </div>
  )
}

function num(value) { return Number(value || 0).toLocaleString() }
function Filter({ label, value, onChange, options, disabled }) { return <label className="min-w-0"><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none disabled:bg-slate-100 sm:min-w-44 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"><option value="">All</option>{options.map((option) => <option key={option} value={option}>{pretty(option)}</option>)}</select></label> }
function Status({ status }) { const styles = { sent: 'bg-emerald-50 text-emerald-700', failed: 'bg-red-50 text-red-700', skipped: 'bg-slate-100 text-slate-700', log_only: 'bg-amber-50 text-amber-800', retrying: 'bg-blue-50 text-blue-700', pending: 'bg-blue-50 text-blue-700' }; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || styles.pending}`}>{pretty(status)}</span> }
function Pagination({ page, lastPage, onChange, loading }) { if (lastPage <= 1) return null; return <div className="flex items-center justify-between border-t border-slate-100 p-4"><p className="text-xs text-slate-500">Page {page} of {lastPage}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || page >= lastPage} onClick={() => onChange(page + 1)}>Next</Button></div></div> }
function TableSkeleton() { return <div className="divide-y divide-slate-100 animate-pulse">{[1, 2, 3, 4].map((item) => <div key={item} className="grid grid-cols-4 gap-4 p-4"><div className="h-4 rounded bg-slate-200" /><div className="h-4 rounded bg-slate-100" /><div className="h-4 rounded bg-slate-100" /><div className="h-4 rounded bg-slate-200" /></div>)}</div> }
function formatDate(value) { return value ? new Date(value).toLocaleString('en-PH') : 'Not available' }
function pretty(value = '') { return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
