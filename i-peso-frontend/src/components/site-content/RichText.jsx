import { Fragment } from 'react'
import { fillOfficeTokens } from './richTextUtils'

/**
 * Renders the plain text PESO staff write for FAQs and policy pages. It is
 * never treated as HTML (a pasted <script> shows as text). The format:
 *   - a blank line starts a new paragraph
 *   - a line starting with "- " is a bullet
 *   - **double asterisks** make text bold
 *   - https:// links and email addresses become links
 *   - {office.address}, {office.phone}, {office.email}, {office.facebook},
 *     {office.hours}, {office.name} are filled in from Office info
 */

const LINKISH = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi

function linkify(text, linkClass, keyPrefix) {
  const parts = text.split(LINKISH)
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      const isEmail = !/^https?:\/\//i.test(part)
      return (
        <a
          key={`${keyPrefix}-l${index}`}
          href={isEmail ? `mailto:${part}` : part}
          target={isEmail ? undefined : '_blank'}
          rel={isEmail ? undefined : 'noreferrer'}
          className={linkClass}
        >
          {part}
        </a>
      )
    }
    return <Fragment key={`${keyPrefix}-t${index}`}>{part}</Fragment>
  })
}

export function InlineText({ text, linkClass = '', keyPrefix = 'i' }) {
  const pieces = text.split(/\*\*(.+?)\*\*/g)
  return pieces.map((piece, index) =>
    index % 2 === 1
      ? <strong key={`${keyPrefix}-b${index}`} className="font-bold">{linkify(piece, linkClass, `${keyPrefix}-b${index}`)}</strong>
      : <Fragment key={`${keyPrefix}-p${index}`}>{linkify(piece, linkClass, `${keyPrefix}-p${index}`)}</Fragment>,
  )
}

/** Split one paragraph block into runs of plain lines and bullet lines. */
function runsOf(block) {
  const runs = []
  block.split('\n').forEach((line) => {
    const bullet = /^\s*[-•*]\s+/.test(line)
    const content = bullet ? line.replace(/^\s*[-•*]\s+/, '') : line
    const last = runs[runs.length - 1]
    if (last && last.bullet === bullet) last.lines.push(content)
    else runs.push({ bullet, lines: [content] })
  })
  return runs
}

export default function RichText({ text, office, className = '', linkClass = 'font-semibold text-brand-navy underline underline-offset-2', paragraphClass = '' }) {
  const filled = fillOfficeTokens(text ?? '', office).replace(/\r\n?/g, '\n').trim()
  if (!filled) return null

  const blocks = filled.split(/\n\s*\n/)

  return (
    <div className={className}>
      {blocks.map((block, b) =>
        runsOf(block).map((run, r) => {
          const key = `${b}-${r}`
          if (run.bullet) {
            return (
              <ul key={key} className="list-disc space-y-1.5 pl-5">
                {run.lines.map((line, l) => <li key={l}><InlineText text={line} linkClass={linkClass} keyPrefix={`${key}-${l}`} /></li>)}
              </ul>
            )
          }
          return (
            <p key={key} className={paragraphClass}>
              {run.lines.map((line, l) => (
                <Fragment key={l}>
                  {l > 0 && <br />}
                  <InlineText text={line} linkClass={linkClass} keyPrefix={`${key}-${l}`} />
                </Fragment>
              ))}
            </p>
          )
        }),
      )}
    </div>
  )
}
