import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ui'
import { clearUnsavedChanges, hasUnsavedChanges, useUnsavedEntries } from '@/hooks/useUnsavedChanges'

const listOf = (labels) => (labels.length <= 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`)

/**
 * Asks before unsaved changes are lost: leaving the page or switching a tab (both
 * are URL changes in the admin portal), and closing or reloading the browser tab.
 * Mounted once in the admin layout; editors report themselves with useUnsavedChanges().
 */
export default function UnsavedChangesGuard() {
  const entries = useUnsavedEntries()
  const dirty = entries.length > 0

  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    hasUnsavedChanges()
    && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search)
  ))

  // Closing or reloading the browser tab: the browser shows its own prompt.
  useEffect(() => {
    if (!dirty) return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const labels = [...new Set(entries.map((entry) => entry.label).filter(Boolean))]

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => { if (!open && blocker.state === 'blocked') blocker.reset() }}
      title="Discard unsaved changes?"
      description={`You have unsaved changes${labels.length ? ` in ${listOf(labels)}` : ''}. Leave without saving, or stay and save them first.`}
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      onConfirm={() => {
        clearUnsavedChanges()
        blocker.proceed()
      }}
    />
  )
}
