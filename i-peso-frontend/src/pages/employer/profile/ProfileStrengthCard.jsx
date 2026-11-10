import { motion as Motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, Circle, Sparkles } from 'lucide-react'
import CountUp from '@/components/motion/CountUp'

const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Animated completeness ring plus the list of what's still missing, each one a shortcut to fix it. */
export default function ProfileStrengthCard({ strength, onFix }) {
  const { items, percent, done, total } = strength
  const complete = done === total

  return (
    <section aria-labelledby="profile-strength" className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)]">
      <div className="flex items-center gap-5">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
            <Motion.circle
              cx="40" cy="40" r={RADIUS} fill="none" strokeWidth="8" strokeLinecap="round"
              className={complete ? 'stroke-emerald-500' : 'stroke-brand-gold'}
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - percent / 100) }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-900">
            <CountUp value={percent} suffix="%" />
          </span>
        </div>
        <div>
          <h2 id="profile-strength" className="text-base font-black text-slate-900">Profile strength</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {complete ? 'Complete. Job seekers see everything they need.' : `${done} of ${total} done. Complete profiles get more applicants.`}
          </p>
        </div>
      </div>

      {complete ? (
        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Sparkles className="h-4 w-4" aria-hidden /> Nice work. Keep your description up to date as things change.
        </p>
      ) : (
        <ul className="mt-5 space-y-1">
          {items.map((item, index) => (
            <Motion.li key={item.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + index * 0.05 }}>
              {item.done ? (
                <span className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-500">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
                  <span className="line-through decoration-slate-300">{item.label}</span>
                  <span className="sr-only">(done)</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onFix(item)}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <Circle className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-brand-gold" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">Add {item.label.toLowerCase()}</span>
                    <span className="block text-xs text-slate-500">{item.hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" aria-hidden />
                </button>
              )}
            </Motion.li>
          ))}
        </ul>
      )}
    </section>
  )
}
