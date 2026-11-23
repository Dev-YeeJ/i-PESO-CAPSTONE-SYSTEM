/**
 * An editor's footer row: a note on the left (e.g. "Last saved …"), the editor's own
 * Save / Discard buttons on the right (children). With unsaved changes it sticks to
 * the bottom of the screen and says how many, so the changes and the way to save them
 * stay in view on long forms. Must be a direct child of the form's container so it
 * can stick within it.
 */
export default function UnsavedChangesBar({ count = 0, note = null, children, className = '' }) {
  const dirty = count > 0
  return (
    <div
      role={dirty ? 'region' : undefined}
      aria-label={dirty ? 'Unsaved changes' : undefined}
      className={`mt-6 flex flex-wrap items-center justify-between gap-3 ${dirty
        ? 'sticky bottom-4 z-20 rounded-xl border border-amber-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur'
        : 'border-t border-slate-100 pt-4'} ${className}`}
    >
      {dirty ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800" aria-live="polite">
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
          {count} unsaved {count === 1 ? 'change' : 'changes'}
        </p>
      ) : (
        note ?? <span />
      )}
      {children}
    </div>
  )
}
