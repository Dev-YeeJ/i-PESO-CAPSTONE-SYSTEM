import { Fragment, createElement } from 'react'
import { featureIcon } from './siteContentDefaults'

/**
 * The editable pieces of the landing page, shared by the page itself and the
 * live preview in Site Content → Landing page, so the preview is exactly
 * what visitors will see.
 */

const HIGHLIGHT_DOTS = ['bg-blue-400', 'bg-yellow-400', 'bg-emerald-400']

export function HeroBadgeIcon({ className = 'w-4 h-4 text-yellow-500' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}

/** "Find Your [Perfect Match] / Powered by Smart Technology" */
export function HeroHeadlineContent({ landing }) {
  return (
    <>
      {landing.headline_lead}{' '}
      <span className="relative inline-block text-yellow-400">
        {landing.headline_highlight}
        <svg className="absolute w-full h-4 -bottom-1 left-0 text-yellow-500/80" viewBox="0 0 200 9" fill="none" aria-hidden="true">
          <path d="M2.00035 7.15854C47.0142 3.12519 123.633 -1.25883 198.056 4.54226" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>{' '}
      <br />
      {landing.headline_tail}
    </>
  )
}

/** The sub-headline, with every "i-PESO" picked out in white as in the original design. */
export function HeroSubheadlineContent({ landing }) {
  const parts = String(landing.subheadline ?? '').split(/(i-PESO)/)
  return parts.map((part, index) =>
    part === 'i-PESO'
      ? <span key={index} className="text-white font-medium">i-PESO</span>
      : <Fragment key={index}>{part}</Fragment>,
  )
}

export function HeroHighlights({ landing, className = 'flex flex-wrap justify-center gap-6 md:gap-10 text-sm font-medium text-slate-400' }) {
  return (
    <div className={className}>
      {(landing.highlights ?? []).map((text, index) => (
        <span key={index} className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${HIGHLIGHT_DOTS[index % HIGHLIGHT_DOTS.length]}`}></span> {text}
        </span>
      ))}
    </div>
  )
}

export function FeatureCardContent({ feature }) {
  return (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
        {createElement(featureIcon(feature.icon), { className: 'h-5 w-5', 'aria-hidden': true })}
      </span>
      <h3 className="mt-4 font-bold text-white">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
    </>
  )
}

export const FEATURE_CARD_CLASS = 'rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-white/20 hover:bg-white/[0.05] hover:-translate-y-1'
