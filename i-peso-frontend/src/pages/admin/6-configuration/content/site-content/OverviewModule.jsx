import { AlertTriangle, ArrowRight, CheckCircle2, Info, RefreshCw } from 'lucide-react'
import { Button, Card, ErrorState, LoadingSkeleton } from '@/components/ui'

const STATUS = {
  warn: { icon: AlertTriangle, ring: 'border-slate-200 bg-white', iconClass: 'text-amber-500', label: 'Needs attention' },
  info: { icon: Info, ring: 'border-slate-200 bg-slate-50/60', iconClass: 'text-slate-400', label: 'Good to know' },
  ok: { icon: CheckCircle2, ring: 'border-slate-200 bg-white', iconClass: 'text-emerald-500', label: 'All good' },
}

/** Where a check's items open: FAQ items open the FAQ editor. */
const itemTarget = (check, item) => (['faqs', 'insights'].includes(check.module) && item.id ? ['faqs', { faq: item.id }] : [check.module])

/**
 * The content health check: a score and an automatic checklist of what to
 * fix — blank office details, stale or duplicate FAQs, broken links, what
 * readers can't find, what the assistant can't answer.
 */
export default function OverviewModule({ health, onGo, allowed }) {
  if (health.isLoading) return <LoadingSkeleton variant="card" rows={4} />
  if (health.isError) return <ErrorState onRetry={() => health.refetch()} />

  const { score, checks, counts } = health.data
  const warnings = checks.filter((check) => check.status === 'warn')
  const tone = 'text-slate-950'
  const bar = 'bg-slate-500'

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <Card>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Content health</p>
          <div className="mt-2 flex items-end gap-3">
            <p className={`text-5xl font-black tabular-nums ${tone}`}>{score}<span className="text-2xl">%</span></p>
            <Button size="sm" variant="ghost" icon={RefreshCw} loading={health.isFetching} onClick={() => health.refetch()} className="mb-1">Check again</Button>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Content health score" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {warnings.length === 0 ? 'Nothing needs attention. Readers and the assistant have what they need.' : `${warnings.length} thing${warnings.length === 1 ? '' : 's'} to fix — most important first.`}
          </p>
        </Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['FAQs published', counts.faqs_published],
            ['Unpublished drafts', counts.faqs_unpublished],
            ['Empty searches (30 days)', counts.missed_searches],
            ['Unanswered in chat (30 days)', counts.chatbot_gaps],
          ].map(([label, value]) => (
            <Card key={label} padding="sm">
              <p className="text-2xl font-black tabular-nums text-slate-950">{value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
            </Card>
          ))}
        </div>
      </div>

      <ol className="space-y-3" aria-label="Health checks">
        {checks.map((check) => {
          const meta = STATUS[check.status]
          const Icon = meta.icon
          const canAct = allowed.includes(check.module)
          return (
            <li key={check.id} className={`rounded-2xl border p-4 ${meta.ring}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.iconClass}`} aria-label={meta.label} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-950">{check.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{check.detail}</p>
                  {check.items?.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {check.items.map((item) => (
                        <li key={`${item.id}-${item.other_id ?? ''}`}>
                          {canAct || allowed.includes('faqs') ? (
                            <button type="button" onClick={() => onGo(...itemTarget(check, item))} className="text-left font-semibold text-brand-navy hover:underline">
                              {item.label}
                            </button>
                          ) : <span className="font-semibold text-slate-800">{item.label}</span>}
                          {item.other_label && (
                            <span className="text-slate-500"> ≈ <button type="button" onClick={() => onGo('faqs', { faq: item.other_id })} className="font-semibold text-brand-navy hover:underline">{item.other_label}</button></span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {check.action && canAct && (
                  <Button size="sm" variant="outline" onClick={() => onGo(check.module)} className="shrink-0">
                    {check.action} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
