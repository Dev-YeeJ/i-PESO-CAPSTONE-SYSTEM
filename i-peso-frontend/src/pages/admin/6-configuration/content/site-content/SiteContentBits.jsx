import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, RotateCcw } from 'lucide-react'
import { Button, ErrorState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { adminSiteContentService } from '@/services/siteContentService'
import { describeValue, formatWhen, labelClass } from './formStyles'

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

/** "Phone: 0923… → 0917…" — shown before a save goes live. */
export function ChangesDialog({ open, onOpenChange, title, changes, busy, onConfirm, confirmLabel = 'Save and publish' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>These changes show on the site as soon as you save.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-80 space-y-3 overflow-y-auto text-sm">
          {changes.map((change) => (
            <li key={change.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{change.label}</p>
              <p className="mt-1 break-words text-slate-500 line-through decoration-slate-400">{describeValue(change.before)}</p>
              <p className="mt-0.5 break-words font-semibold text-slate-950">{describeValue(change.after)}</p>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Keep editing</Button>
          <Button variant="navy" loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                      {index === 0 && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Current</span>}
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
