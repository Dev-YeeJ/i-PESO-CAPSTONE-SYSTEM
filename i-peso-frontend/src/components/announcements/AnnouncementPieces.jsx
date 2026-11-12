import { createElement } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Pin } from 'lucide-react'
import { categoryMeta, isInternalLink, priorityMeta } from './announcementMeta'

export function CategoryChip({ category, label, className = '' }) {
  const meta = categoryMeta(category)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.chip} ${className}`}>
      {createElement(meta.icon, { className: 'h-3 w-3', 'aria-hidden': true })}
      {label ?? meta.label}
    </span>
  )
}

export function PriorityPill({ priority, className = '' }) {
  if (!priority || priority === 'normal') return null
  const meta = priorityMeta(priority)
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${meta.pill} ${className}`}>{meta.label}</span>
}

export function PinnedMark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold text-brand-navy ${className}`} title="Pinned to the top">
      <Pin className="h-3 w-3" aria-hidden="true" />
      Pinned
    </span>
  )
}

/** Plain-text body with the author's line breaks kept. */
export function AnnouncementBody({ text, className = '' }) {
  return <div className={`whitespace-pre-line break-words text-sm leading-6 text-slate-700 ${className}`}>{text}</div>
}

/** The optional call-to-action: internal paths stay in the app, https links open a new tab. */
export function AnnouncementLink({ url, label, onNavigate, className = '' }) {
  if (!url) return null
  const classes = `inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 ${className}`
  const text = label || 'Learn more'

  if (isInternalLink(url)) {
    return <Link to={url} onClick={onNavigate} className={classes}>{text}</Link>
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={classes}>
      {text}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}
