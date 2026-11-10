import { motion as Motion } from 'framer-motion'
import { Lock, ThumbsUp, TrendingDown, TrendingUp } from 'lucide-react'
import CountUp from '@/components/motion/CountUp'
import { Stars } from '@/components/reviews/StarRating'

const EASE = [0.16, 1, 0.3, 1]

function Bar({ percent, delay = 0, className = 'bg-amber-400' }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
      <Motion.span className={`block h-full rounded-full ${className}`} initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.9, delay, ease: EASE }} />
    </span>
  )
}

/**
 * Summary for one review type: the overall score, how many people gave each
 * star rating, the average per aspect, and what stands out. Below the
 * minimum number of reviewers it shows progress toward a public rating.
 */
export default function RatingOverview({ section, type, minReviews = 3 }) {
  const who = type === 'employment' ? 'employees' : 'applicants'

  if (!section) return null

  if (!section.enough) {
    const have = section.reviewers ?? 0
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Lock className="h-5 w-5" aria-hidden /></span>
        <h3 className="mt-4 text-base font-black text-slate-900">Rating not public yet</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Your average appears on your company page once {minReviews} verified {who} have reviewed you.
        </p>
        <div className="mt-5 flex justify-between text-xs font-semibold text-slate-600">
          <span>Verified reviewers</span>
          <span className="tabular-nums">{have} of {minReviews}</span>
        </div>
        <div className="mt-1.5"><Bar percent={Math.min(100, (have / minReviews) * 100)} className="bg-brand-navy" /></div>
      </div>
    )
  }

  const distribution = section.distribution ?? []
  const most = Math.max(1, ...distribution.map((row) => row.count))
  const aspects = Object.entries(section.aspects ?? {})
  const label = (key) => section.aspects?.[key]?.label ?? key

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)]">
      <div className="flex items-end gap-4">
        <p className="text-5xl font-black leading-none tracking-tight text-slate-950"><CountUp value={section.average} decimals={1} /></p>
        <div className="pb-0.5">
          <Stars value={section.average} size="lg" />
          <p className="mt-1 text-xs text-slate-500">from {section.reviewers} verified {who}</p>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
        <ThumbsUp className="h-4 w-4 shrink-0" aria-hidden />
        <span><strong className="font-black">{section.recommend_percent}%</strong> would recommend {type === 'employment' ? 'working here' : 'applying here'}</span>
      </p>

      {distribution.length > 0 && (
        <figure className="mt-6">
          <figcaption className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Overall ratings</figcaption>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">How many reviewers gave each overall star rating</caption>
            <tbody>
              {distribution.map((row, index) => (
                <tr key={row.stars} title={`${row.count} ${row.count === 1 ? 'person' : 'people'} rated ${row.stars} star${row.stars === 1 ? '' : 's'}`}>
                  <th scope="row" className="w-10 py-1 pr-3 text-left font-semibold tabular-nums text-slate-600">{row.stars} ★</th>
                  <td className="py-1"><Bar percent={(row.count / most) * 100} delay={0.1 + index * 0.05} /></td>
                  <td className="w-8 py-1 pl-3 text-right font-bold tabular-nums text-slate-800">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}

      {aspects.length > 0 && (
        <figure className="mt-6">
          <figcaption className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">By aspect</figcaption>
          <dl className="mt-3 space-y-3">
            {aspects.map(([key, aspect], index) => (
              <div key={key}>
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-slate-700">{aspect.label}</dt>
                  <dd className="font-bold tabular-nums text-slate-900">{aspect.average.toFixed(1)}<span className="sr-only"> out of 5</span></dd>
                </div>
                <div className="mt-1"><Bar percent={(aspect.average / 5) * 100} delay={0.2 + index * 0.05} className="bg-brand-navy" /></div>
              </div>
            ))}
          </dl>
        </figure>
      )}

      {(section.strengths?.length > 0 || section.to_improve?.length > 0) && (
        <div className="mt-6 space-y-2">
          {section.strengths?.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs">
              <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden /><span className="font-bold text-slate-700">Strengths:</span>
              {section.strengths.map((key) => <span key={key} className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 ring-1 ring-emerald-200">{label(key)}</span>)}
            </p>
          )}
          {section.to_improve?.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs">
              <TrendingDown className="h-4 w-4 text-amber-600" aria-hidden /><span className="font-bold text-slate-700">Could improve:</span>
              {section.to_improve.map((key) => <span key={key} className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-900 ring-1 ring-amber-200">{label(key)}</span>)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
