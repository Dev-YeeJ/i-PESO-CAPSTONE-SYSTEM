import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ExternalLink, Info, Search, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import RichText from './RichText'
import OfficeContactCard from './OfficeContactCard'
import { publicSiteContentService } from '@/services/siteContentService'

const isInternal = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')

export function FaqLink({ faq, className = '' }) {
  if (!faq.link_url) return null
  const classes = `inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-900 ${className}`
  const label = faq.link_label || 'Learn more'
  return isInternal(faq.link_url)
    ? <Link to={faq.link_url} className={classes}>{label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    : <a href={faq.link_url} target="_blank" rel="noreferrer" className={classes}>{label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
}

const voteKey = (id) => `ipeso-faq-vote-${id}`
const readVote = (id) => {
  try { return window.localStorage.getItem(voteKey(id)) } catch { return null }
}

/**
 * "Was this helpful?" under an answer. One vote per reader (the server keeps
 * an anonymous hash); the choice is remembered in this browser so the
 * buttons show it, and it can be changed.
 */
export function FaqFeedback({ faqId }) {
  const [vote, setVote] = useState(() => readVote(faqId))
  const [busy, setBusy] = useState(false)

  const send = async (helpful) => {
    const value = helpful ? 'yes' : 'no'
    setBusy(true)
    setVote(value)
    try {
      window.localStorage.setItem(voteKey(faqId), value)
    } catch { /* private window: the vote still counts */ }
    try {
      await publicSiteContentService.voteFaq(faqId, helpful)
    } catch { /* feedback is best-effort */ }
    setBusy(false)
  }

  const button = (helpful, Icon, label) => {
    const active = vote === (helpful ? 'yes' : 'no')
    return (
      <button
        type="button"
        disabled={busy}
        aria-pressed={active}
        onClick={() => send(helpful)}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition ${
          active ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-navy hover:text-brand-navy'
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
      </button>
    )
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
      <span>{vote === 'yes' ? 'Thanks — glad it helped.' : vote === 'no' ? 'Thanks — PESO will improve this answer.' : 'Was this helpful?'}</span>
      {button(true, ThumbsUp, 'Yes')}
      {button(false, ThumbsDown, 'No')}
    </div>
  )
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

  // Known topics in their order, plus any topic an FAQ uses that the list doesn't
  // know — so no question can ever drop out of the page.
  const topicsInUse = useMemo(() => {
    const known = topics.filter((t) => faqs.some((faq) => faq.topic === t.value))
    const extra = [...new Set(faqs.map((faq) => faq.topic).filter((value) => !topics.some((t) => t.value === value)))]
      .map((value) => ({ value, label: faqs.find((faq) => faq.topic === value)?.topic_label ?? 'Other questions' }))
    return [...known, ...extra]
  }, [topics, faqs])
  const visible = useMemo(
    () => faqs.filter((faq) => (topic === 'all' || faq.topic === topic) && matches(faq, term.trim())),
    [faqs, topic, term],
  )
  // A search that finds nothing tells PESO which FAQ to write next. Reported
  // once per wording, after the reader pauses typing; never blocks the page.
  const reported = useRef(new Set())
  const trimmed = term.trim()
  const noResults = !isLoading && !isError && faqs.length > 0 && trimmed.length >= 3 && visible.length === 0
  useEffect(() => {
    if (!noResults) return undefined
    const key = trimmed.toLowerCase()
    const timer = window.setTimeout(() => {
      if (reported.current.has(key)) return
      reported.current.add(key)
      publicSiteContentService.reportSearchMiss(trimmed).catch(() => {})
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [noResults, trimmed])

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
                      <FaqFeedback faqId={faq.id} />
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
