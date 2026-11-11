import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AnimatePresence, MotionConfig, motion as Motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpenCheck, Briefcase, Building2, Flag, MessageSquareReply, Star, UsersRound } from 'lucide-react'
import { Button, ErrorState } from '@/components/ui'
import CountUp from '@/components/motion/CountUp'
import { employerFeedbackService } from '@/services/employerFeedbackService'
import { cn } from '@/lib/utils'
import DisputeDialog from './reviews/DisputeDialog'
import HiresTab from './reviews/HiresTab'
import RatingOverview from './reviews/RatingOverview'
import ReviewCard from './reviews/ReviewCard'
import Segmented from './reviews/Segmented'
import { HIRES_KEY, reviewsQueryKey } from './reviews/reviewKeys'

const TYPES = [
  { value: 'recruitment', label: 'Hiring process', icon: Briefcase },
  { value: 'employment', label: 'Working here', icon: Building2 },
]
const FILTERS = ['all', 'needs_reply', 'disputed']
const TABS = [
  { value: 'company', label: 'Reviews of your company', icon: Star },
  { value: 'hires', label: 'Feedback on your hires', icon: UsersRound },
]

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)

/** Reviews of the company (read, reply once, dispute) and private feedback about hires. */
export default function EmployerReviewsPage() {
  const [params, setParams] = useSearchParams()
  const tab = pick(params.get('tab'), TABS.map((item) => item.value), 'company')
  const type = pick(params.get('type'), TYPES.map((item) => item.value), 'recruitment')
  const filter = pick(params.get('filter'), FILTERS, 'needs_reply')
  const page = Math.max(1, Number(params.get('page')) || 1)

  // Keep the view in the URL so it survives a refresh and can be linked to.
  const update = (changes) => setParams((current) => {
    const next = new URLSearchParams(current)
    Object.entries(changes).forEach(([key, value]) => (value == null ? next.delete(key) : next.set(key, String(value))))
    return next
  }, { replace: true })

  const reviews = useQuery({
    queryKey: reviewsQueryKey(type, filter, page),
    queryFn: () => employerFeedbackService.getReviews({ type, page, filter: filter === 'all' ? undefined : filter }),
    placeholderData: keepPreviousData,
  })
  const hires = useQuery({ queryKey: HIRES_KEY, queryFn: employerFeedbackService.getHires })

  const summary = reviews.data?.summary
  const counts = reviews.data?.counts
  const needsReply = (counts?.recruitment?.needs_reply ?? 0) + (counts?.employment?.needs_reply ?? 0)
  const hiresToRate = (hires.data?.hires ?? []).filter((hire) => hire.can_give_feedback && !hire.feedback).length

  const tiles = [
    { key: 'recruitment', label: 'Hiring process', section: summary?.recruitment, onClick: () => update({ tab: 'company', type: 'recruitment', filter: null, page: null }) },
    { key: 'employment', label: 'Working here', section: summary?.employment, onClick: () => update({ tab: 'company', type: 'employment', filter: null, page: null }) },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-6xl pb-16">
        <Motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative isolate overflow-hidden rounded-[28px] bg-brand-navy p-6 text-white shadow-[0_24px_60px_-28px_rgba(18,53,99,0.75)] sm:p-10"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-brand-gold/25 blur-3xl" />
            <div className="absolute -bottom-36 left-10 h-72 w-96 rounded-full bg-sky-400/15 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-gold">Verified feedback</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">Reviews</h1>
              <p className="mt-3 text-sm leading-6 text-blue-100/85 sm:text-[15px]">
                Reviews come only from people who applied or worked here through i-PESO, and you never see who wrote them.
                Reply once to each review, or dispute one that breaks the guidelines.
              </p>
            </div>
            <a href="/review-guidelines" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold ring-1 ring-white/20 transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold lg:self-end">
              <BookOpenCheck className="h-4 w-4" aria-hidden /> Review guidelines
            </a>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile, index) => (
              <HeroTile key={tile.key} index={index} label={tile.label} onClick={tile.onClick} loading={reviews.isLoading}>
                {tile.section?.enough ? (
                  <>
                    <span className="flex items-baseline gap-1.5 text-3xl font-black"><CountUp value={tile.section.average} decimals={1} /><Star className="h-5 w-5 fill-brand-gold text-brand-gold" aria-hidden /></span>
                    <span className="text-xs text-blue-100/75">{tile.section.reviewers} reviewers · {tile.section.recommend_percent}% recommend</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-black">Not public yet</span>
                    <span className="text-xs text-blue-100/75">{tile.section?.reviewers ?? 0} of {summary?.min_reviews ?? 3} reviews needed</span>
                  </>
                )}
              </HeroTile>
            ))}
            <HeroTile index={2} label="Waiting for your reply" loading={reviews.isLoading} highlight={needsReply > 0}
              onClick={() => update({ tab: 'company', filter: 'needs_reply', page: null, type: (counts?.[type]?.needs_reply ?? 0) > 0 ? type : (counts?.recruitment?.needs_reply ? 'recruitment' : 'employment') })}
            >
              <span className="text-3xl font-black"><CountUp value={needsReply} /></span>
              <span className="text-xs text-blue-100/75">{needsReply ? 'Replies show you listen' : 'All caught up'}</span>
            </HeroTile>
            <HeroTile index={3} label="Hires to rate" loading={hires.isLoading} highlight={hiresToRate > 0} onClick={() => update({ tab: 'hires' })}>
              <span className="text-3xl font-black"><CountUp value={hiresToRate} /></span>
              <span className="text-xs text-blue-100/75">{hiresToRate ? 'Private feedback for workers' : 'Nothing waiting'}</span>
            </HeroTile>
          </ul>
        </Motion.header>

        {/* Main tabs */}
        <div role="tablist" aria-label="Reviews sections" className="mt-8 flex gap-6 border-b border-slate-200">
          {TABS.map((item) => {
            const active = tab === item.value
            const badge = item.value === 'hires' ? hiresToRate : needsReply
            return (
              <button
                key={item.value}
                id={`tab-${item.value}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${item.value}`}
                tabIndex={active ? 0 : -1}
                onClick={() => update({ tab: item.value === 'company' ? null : item.value })}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                  event.preventDefault()
                  const other = TABS.find((candidate) => candidate.value !== item.value)
                  update({ tab: other.value === 'company' ? null : other.value })
                  document.getElementById(`tab-${other.value}`)?.focus()
                }}
                className={cn('relative -mb-px inline-flex items-center gap-2 pb-3.5 text-sm font-bold transition focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-focus', active ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800')}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
                {badge > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-black tabular-nums text-amber-800">{badge}</span>}
                {active && <Motion.span layoutId="reviews-tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-navy" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <Motion.div
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-6"
          >
            {tab === 'hires'
              ? <HiresTab />
              : <CompanyReviews query={reviews} type={type} filter={filter} page={page} onChange={update} />}
          </Motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

function HeroTile({ index, label, onClick, loading, highlight, children }) {
  return (
    <Motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.06, duration: 0.4 }}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group flex h-full w-full flex-col gap-1 rounded-2xl p-4 text-left ring-1 backdrop-blur-sm transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold',
          highlight ? 'bg-brand-gold/15 ring-brand-gold/40 hover:bg-brand-gold/20' : 'bg-white/[0.07] ring-white/15 hover:bg-white/[0.11]',
        )}
      >
        <span className="text-xs font-bold text-blue-100/80">{label}</span>
        {loading ? <span className="mt-1 h-9 w-20 animate-pulse rounded-lg bg-white/15" aria-hidden="true" /> : children}
      </button>
    </Motion.li>
  )
}

function CompanyReviews({ query, type, filter, page, onChange }) {
  const listTop = useRef(null)
  const [disputing, setDisputing] = useState(null)
  const { data, isLoading, error, refetch, isFetching, isPlaceholderData } = query
  const paginator = data?.reviews
  const reviews = paginator?.data ?? []
  const counts = data?.counts?.[type]

  const goTo = (next) => {
    onChange({ page: next > 1 ? next : null })
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (error) return <ErrorState description="Your reviews could not be loaded." onRetry={refetch} error={error} />

  const empty = {
    all: 'No reviews of this kind yet. Applicants can review you once you respond to their application.',
    needs_reply: "You've replied to every review here. Nice work.",
    disputed: "You haven't disputed any reviews here.",
  }[filter]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        {isLoading
          ? <div className="h-80 animate-pulse rounded-3xl bg-slate-100" aria-hidden="true" />
          : <RatingOverview section={data?.summary?.[type]} type={type} minReviews={data?.summary?.min_reviews} />}
      </div>

      <div ref={listTop} className="min-w-0 scroll-mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            label="Review type"
            value={type}
            onChange={(value) => onChange({ type: value === 'recruitment' ? null : value, page: null })}
            options={TYPES.map((item) => ({ value: item.value, label: <><item.icon className="h-4 w-4" aria-hidden />{item.label}</>, count: data?.counts?.[item.value]?.all }))}
          />
          <Segmented
            label="Filter reviews"
            size="sm"
            value={filter}
            onChange={(value) => onChange({ filter: value, page: null })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'needs_reply', label: <><MessageSquareReply className="h-3.5 w-3.5" aria-hidden />Needs reply</>, count: counts?.needs_reply, highlight: true },
              { value: 'disputed', label: <><Flag className="h-3.5 w-3.5" aria-hidden />Disputed</>, count: counts?.disputed },
            ]}
          />
        </div>

        <div className={cn('mt-5 transition-opacity', isFetching && isPlaceholderData && 'opacity-60')} aria-busy={isFetching}>
          {isLoading ? (
            <div className="space-y-4" aria-hidden="true">
              {[0, 1, 2].map((key) => <div key={key} className="h-48 animate-pulse rounded-3xl bg-slate-100" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Star className="h-6 w-6" aria-hidden /></span>
              <p className="mx-auto mt-3 max-w-sm text-sm text-slate-600">{empty}</p>
              {filter !== 'all' && <Button size="sm" variant="outline" className="mt-4" onClick={() => onChange({ filter: null, page: null })}>Show all reviews</Button>}
            </div>
          ) : (
            <ul className="space-y-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} onDispute={() => setDisputing(review)} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {paginator?.last_page > 1 && (
          <nav aria-label="Review pages" className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <Button size="sm" variant="ghost" icon={ArrowLeft} disabled={isFetching || page <= 1} onClick={() => goTo(page - 1)}>Newer</Button>
            <span className="text-xs font-semibold text-slate-500">Page {paginator.current_page} of {paginator.last_page}</span>
            <Button size="sm" variant="ghost" disabled={isFetching || page >= paginator.last_page} onClick={() => goTo(page + 1)}>Older <ArrowRight className="h-4 w-4" aria-hidden /></Button>
          </nav>
        )}
      </div>

      {disputing && <DisputeDialog review={disputing} reasons={data?.dispute_reasons ?? {}} onClose={() => setDisputing(null)} />}
    </div>
  )
}
