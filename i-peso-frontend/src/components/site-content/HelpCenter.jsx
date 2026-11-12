import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ExternalLink, Info, Search, X } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import RichText from './RichText'
import OfficeContactCard from './OfficeContactCard'

const isInternal = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')

export function FaqLink({ faq, className = '' }) {
  if (!faq.link_url) return null
  const classes = `inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-900 ${className}`
  const label = faq.link_label || 'Learn more'
  return isInternal(faq.link_url)
    ? <Link to={faq.link_url} className={classes}>{label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    : <a href={faq.link_url} target="_blank" rel="noreferrer" className={classes}>{label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
}

const matches = (faq, term) => {
  if (!term) return true
  const haystack = `${faq.question} ${faq.answer}`.toLowerCase()
  return term.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word))
}

/**
 * The Help page body shared by /help, /seeker/help and /employer/help:
 * search, topic chips, an accordion of questions (each one linkable as
 * #faq-<id>) and the office contact card.
 */
export default function HelpCenter({ faqs = [], topics = [], office, role = null, isLoading = false, isError = false, onRetry }) {
  const location = useLocation()
  const [term, setTerm] = useState('')
  const [topic, setTopic] = useState('all')
  const [openChoice, setOpen] = useState(null)
  const [noticeDismissed, setNoticeDismissed] = useState(false)

  // Deep link: /help#faq-12 opens and scrolls to that question.
  const hashId = location.hash.match(/^#faq-(\d+)$/)?.[1] ?? null
  const hashTarget = hashId ? faqs.find((faq) => String(faq.id) === hashId) : null
  const open = openChoice ?? (hashTarget ? `faq-${hashTarget.id}` : '')
  const missingLink = !isLoading && !isError && hashId !== null && !hashTarget && !noticeDismissed

  useEffect(() => {
    if (!hashTarget) return
    window.requestAnimationFrame(() => document.getElementById(`faq-${hashTarget.id}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }))
  }, [hashTarget])

  const topicsInUse = useMemo(() => topics.filter((t) => faqs.some((faq) => faq.topic === t.value)), [topics, faqs])
  const visible = useMemo(
    () => faqs.filter((faq) => (topic === 'all' || faq.topic === topic) && matches(faq, term.trim())),
    [faqs, topic, term],
  )
  const groups = useMemo(() => {
    if (term.trim() || topic !== 'all') return [{ value: 'results', label: null, items: visible }]
    return topicsInUse.map((t) => ({ ...t, items: visible.filter((faq) => faq.topic === t.value) })).filter((g) => g.items.length)
  }, [visible, topicsInUse, term, topic])

  return (
    <div className="space-y-6">
      {missingLink && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">That question is no longer available. Try searching below.</span>
          <button type="button" onClick={() => setNoticeDismissed(true)} aria-label="Dismiss" className="text-amber-700 hover:text-amber-950"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label className="relative block">
          <span className="sr-only">Search questions</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search questions, e.g. “requirements” or “password”"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3.5 text-sm text-slate-900 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
          />
        </label>
        {topicsInUse.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
            {[{ value: 'all', label: 'All topics' }, ...topicsInUse].map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={topic === t.value}
                onClick={() => setTopic(t.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  topic === t.value ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy hover:text-brand-navy'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : isError ? (
        <ErrorState title="Help is unavailable right now" description="The questions could not be loaded. You can still contact the PESO office below." onRetry={onRetry} />
      ) : faqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-600">
          No questions have been published yet. Contact the PESO office below for help.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-600">
          No questions match “{term.trim()}”. Try other words, or contact the office below.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.value} aria-label={group.label ?? 'Search results'} className="rounded-2xl border border-slate-200 bg-white px-5 shadow-sm sm:px-6">
              {group.label && <h2 className="pt-5 text-xs font-black uppercase tracking-wide text-slate-500">{group.label}</h2>}
              <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
                {group.items.map((faq) => (
                  <AccordionItem key={faq.id} value={`faq-${faq.id}`} id={`faq-${faq.id}`} className="scroll-mt-24">
                    <AccordionTrigger className="text-[15px]">{faq.question}</AccordionTrigger>
                    <AccordionContent>
                      <RichText text={faq.answer} office={office} className="space-y-3 leading-6 text-slate-700" />
                      <FaqLink faq={faq} className="mt-4" />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}

      <OfficeContactCard office={office} role={role} />
    </div>
  )
}
