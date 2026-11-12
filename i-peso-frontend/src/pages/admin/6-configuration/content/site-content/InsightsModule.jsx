import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bot, Check, PenLine, Search, ShieldAlert, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Badge, Button, Card, ErrorState, LoadingSkeleton } from '@/components/ui'
import { adminContentInsightService } from '@/services/siteContentService'
import { apiMessage, formatWhen } from './formStyles'

const SOURCE_LABEL = { public: 'Public', seeker: 'Job seekers', employer: 'Employers', guest: 'Visitors' }

/**
 * What readers tell PESO: Help searches that found nothing, questions the
 * assistant could not answer, and "Was this helpful?" votes. Each report
 * can become an FAQ in one click (the AI turns it into a clean question).
 */
export default function InsightsModule({ onGo, canEdit, allowed }) {
  const queryClient = useQueryClient()
  const [days, setDays] = useState(30)
  const [writing, setWriting] = useState(null)
  const query = useQuery({ queryKey: ['content-insights', days], queryFn: () => adminContentInsightService.insights(days) })

  const resolve = useMutation({
    mutationFn: ({ kind, normalized }) => adminContentInsightService.resolve(kind, normalized),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['content-insights'] })
      queryClient.invalidateQueries({ queryKey: ['content-health'] })
    },
    onError: (error) => toast.error(apiMessage(error, 'Could not update the report.')),
  })

  /** Turn a search or chat message into a clean FAQ question, then open the editor with it. */
  const writeFaq = async (key, text) => {
    setWriting(key)
    let question = text
    try {
      const data = await adminContentInsightService.assist({ task: 'suggest_question', text })
      if (data?.suggestion) question = data.suggestion
    } catch {
      // No AI available: start from the reader's own words.
    }
    setWriting(null)
    onGo('faqs', { new: question.slice(0, 200) })
  }

  if (query.isLoading) return <LoadingSkeleton variant="card" rows={4} />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const { missed_searches: missed, chatbot_gaps: gaps, faq_feedback: votes, gap_logging: gapLogging, retention_days: retention } = query.data

  const reportList = (kind, items, emptyText) =>
    items.length === 0 ? (
      <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">{emptyText}</p>
    ) : (
      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const key = `${kind}-${item.normalized}`
          return (
            <li key={key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold text-slate-950">“{item.text}”</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.count}× · last {formatWhen(item.last_at)} · {item.sources.map((s) => SOURCE_LABEL[s] ?? s).join(', ')}
                </p>
                {item.closest_faq && (
                  <p className="mt-1 text-xs text-slate-600">
                    Maybe answered by{' '}
                    <button type="button" onClick={() => onGo('faqs', { faq: item.closest_faq.id })} className="font-bold text-brand-navy hover:underline">“{item.closest_faq.question}”</button>
                    {!item.closest_faq.is_published && <span className="font-bold text-amber-700"> (unpublished — publish it?)</span>}
                    {item.closest_faq.is_published && ' — readers may be using different words; add them to the question or answer.'}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1.5">
                  {allowed.includes('faqs') && (
                    <Button size="sm" variant="navy" icon={PenLine} loading={writing === key} onClick={() => writeFaq(key, item.text)}>Write FAQ</Button>
                  )}
                  <Button size="sm" variant="ghost" icon={Check} loading={resolve.isPending && resolve.variables?.normalized === item.normalized} onClick={() => resolve.mutate({ kind, normalized: item.normalized })}>
                    Dealt with
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Reader insights</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              What people looked for and didn’t find, what the assistant couldn’t answer, and which answers they found helpful.
              Nothing here identifies anyone: emails and numbers are removed, and reports are deleted after {retention} days.
            </p>
          </div>
          <div role="radiogroup" aria-label="Period" className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {[7, 30, 90].map((value) => (
              <button key={value} type="button" role="radio" aria-checked={days === value} onClick={() => setDays(value)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold ${days === value ? 'bg-brand-navy text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                {value} days
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 2xl:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-black text-slate-950"><Search className="h-4 w-4 text-slate-400" aria-hidden="true" /> Help searches that found nothing</h3>
          <p className="mt-1 text-xs text-slate-500">Most-searched first. Each one is a question readers have and your FAQs don’t answer yet.</p>
          <div className="mt-3">{reportList('search', missed, 'Every search found something.')}</div>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 font-black text-slate-950"><Bot className="h-4 w-4 text-slate-400" aria-hidden="true" /> Questions the assistant couldn’t answer</h3>
          {gapLogging ? (
            <>
              <p className="mt-1 text-xs text-slate-500">The assistant told these people to contact the office. An FAQ or a filled-in Office info field lets it answer next time.</p>
              <div className="mt-3">{reportList('gap', gaps, 'The assistant answered everything it was asked.')}</div>
            </>
          ) : (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Recording is switched off on this server (CHATBOT_GAP_LOGGING=false).
            </p>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="flex items-center gap-2 font-black text-slate-950"><ThumbsUp className="h-4 w-4 text-slate-400" aria-hidden="true" /> “Was this helpful?” votes</h3>
        <p className="mt-1 text-xs text-slate-500">Answers most readers found unhelpful are listed first — rewrite those.</p>
        {votes.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">No votes yet. They appear under every answer on the Help pages.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Question</th>
                  <th className="py-2 pr-3">Helpful</th>
                  <th className="py-2 pr-3">Votes</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {votes.map((row) => (
                  <tr key={row.faq_id}>
                    <td className="py-2.5 pr-3">
                      <span className="font-semibold text-slate-900">{row.question}</span>
                      {row.needs_work && <Badge variant="warning" className="ml-2">Rewrite</Badge>}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-red-100" aria-hidden="true">
                          <div className="h-full bg-emerald-500" style={{ width: `${row.score}%` }} />
                        </div>
                        <span className="tabular-nums font-bold text-slate-800">{row.score}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-600">
                      <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" aria-hidden="true" />{row.helpful}</span>{' '}
                      <span className="ml-2 inline-flex items-center gap-1"><ThumbsDown className="h-3 w-3" aria-hidden="true" />{row.not_helpful}</span>
                    </td>
                    <td className="py-2.5 text-right">
                      {allowed.includes('faqs') && <Button size="sm" variant="ghost" icon={PenLine} onClick={() => onGo('faqs', { faq: row.faq_id })}>{canEdit ? 'Edit' : 'View'}</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
