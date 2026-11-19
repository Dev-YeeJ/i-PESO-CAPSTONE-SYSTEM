import { Fragment, createElement } from 'react'
import { featureIcon } from './siteContentDefaults'

/**
 * The editable pieces of the landing page, shared by the page itself and the
 * live preview in Site Content → Landing page, so the preview is exactly
 * what visitors will see.
 *
 * Hero pieces sit on the navy hero band (white text, gold highlight);
 * feature cards sit on a white section.
 */

const HIGHLIGHT_DOTS = ['bg-brand-gold', 'bg-white', 'bg-[#93c5fd]']

export function HeroBadgeIcon({ className = 'h-4 w-4 text-brand-gold' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}

/** "Find Your [Perfect Match] Powered by Smart Technology" — the highlight in gold. */
export function HeroHeadlineContent({ landing }) {
  return (
    <>
      {landing.headline_lead}{' '}
      <span className="text-brand-gold">{landing.headline_highlight}</span>
      {landing.headline_tail ? <><br />{landing.headline_tail}</> : null}
    </>
  )
}

/** The sub-headline, with every "i-PESO" picked out in white. */
export function HeroSubheadlineContent({ landing }) {
  const parts = String(landing.subheadline ?? '').split(/(i-PESO)/)
  return parts.map((part, index) =>
    part === 'i-PESO'
      ? <span key={index} className="font-semibold text-white">i-PESO</span>
      : <Fragment key={index}>{part}</Fragment>,
  )
}

export function HeroHighlights({ landing, className = 'flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/75' }) {
  return (
    <div className={className}>
      {(landing.highlights ?? []).map((text, index) => (
        <span key={index} className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${HIGHLIGHT_DOTS[index % HIGHLIGHT_DOTS.length]}`}></span> {text}
        </span>
      ))}
    </div>
  )
}

export function FeatureCardContent({ feature }) {
  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f0fc] text-brand-navy">
        {createElement(featureIcon(feature.icon), { className: 'h-5 w-5', 'aria-hidden': true })}
      </span>
      <h3 className="mt-5 text-lg font-semibold text-slate-900">{feature.title}</h3>
      <p className="mt-2 text-[15px] leading-6 text-slate-600">{feature.body}</p>
    </>
  )
}

export const FEATURE_CARD_CLASS = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:border-[#c4d9f7] hover:shadow-elevated'
