import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, History, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button, ErrorState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { adminSiteContentService } from '@/services/siteContentService'
import { formatWhen, labelClass } from './formStyles'

/** A labelled field with a character counter and an error line. */
export function Field({ label, hint, error, count, max, children, className = '' }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={labelClass}>{label}</span>
        {max ? <span className={`text-xs tabular-nums ${count > max ? 'font-bold text-red-600' : 'text-slate-400'}`}>{count ?? 0}/{max}</span> : null}
      </div>
      {children}
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

const ACTION_LABEL = { saved: 'Saved', reset: 'Reset to default', restored: 'Restored an earlier version', created: 'Created' }

/** The last 20 saves of a section, each restorable in one click. */
export function SectionHistoryDialog({ sectionKey, open, onOpenChange, canEdit, busy, onRestore }) {
  const [confirming, setConfirming] = useState(null)
  const query = useQuery({
    queryKey: ['admin-site-content-revisions', sectionKey],
    queryFn: () => adminSiteContentService.revisions(sectionKey),
    enabled: open,
  })
  const revisions = query.data?.revisions ?? []

  return (
    <Dialog open={open} onOpenChange={(next) => { setConfirming(null); onOpenChange(next) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5 text-slate-400" /> Version history</DialogTitle>
          <DialogDescription>The last 20 saves. Restoring is itself a save, so it can be undone too.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[26rem] overflow-y-auto">
          {query.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : revisions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
              Nothing saved yet — the site is showing the built-in default text.
            </p>
          ) : (
            <ol className="space-y-2">
              {revisions.map((revision, index) => (
                <li key={revision.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-slate-950">
                      {formatWhen(revision.created_at)}
                      {index === 0 && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">Current</span>}
                    </p>
                    {canEdit && index > 0 && (
                      confirming === revision.id ? (
                        <span className="flex items-center gap-2">
                          <Button size="sm" variant="navy" loading={busy} onClick={() => onRestore(revision)}>Restore this version</Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>Cancel</Button>
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" icon={RotateCcw} onClick={() => setConfirming(revision.id)}>Restore</Button>
                      )
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {ACTION_LABEL[revision.action] ?? 'Saved'} by {revision.author ?? 'a former staff member'}
                    {revision.changed_labels?.length ? ` — ${revision.changed_labels.join(', ')}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Small "Read-only" explainer for staff with View access. */
export function ReadOnlyNote({ children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      {children}
    </div>
  )
}

/**
 * Optional fields folded away so a form shows only what people change often.
 * Opens by itself when `forceOpen` (e.g. one of its fields has an error).
 */
export function MoreSection({ summary, forceOpen = false, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const shown = open || forceOpen

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={shown}
        className="flex w-full items-center justify-between text-left text-sm font-extrabold text-slate-700 hover:text-slate-950"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
          More options
          {summary && <span className="text-xs font-semibold text-slate-400">{summary}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${shown ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {shown && <div className="mt-4">{children}</div>}
    </div>
  )
}
