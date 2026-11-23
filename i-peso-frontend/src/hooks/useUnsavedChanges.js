import { useEffect, useSyncExternalStore } from 'react'

// Which editors on screen hold unsaved changes. Each editor reports itself with
// useUnsavedChanges(); <UnsavedChangesGuard> (in the admin layout) reads the registry
// to stop a tab switch, page change or browser close from silently losing the edits,
// and tab bars read it to put a dot on tabs with pending changes.

const entries = new Map() // id → { label, count }
const listeners = new Set()
let snapshot = []

function emit() {
  snapshot = [...entries.entries()].map(([id, entry]) => ({ id, ...entry }))
  listeners.forEach((notify) => notify())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Report this editor's unsaved changes while it's on screen.
 * @param {string} id        stable id, e.g. 'content:about' (also used for tab dots)
 * @param {number|boolean} changes  how many fields changed (or simply dirty / not)
 * @param {string} label     what the reader would call it, e.g. 'About PESO'
 */
export function useUnsavedChanges(id, changes, label) {
  const count = typeof changes === 'boolean' ? Number(changes) : Number(changes) || 0
  useEffect(() => {
    if (count > 0) {
      entries.set(id, { label, count })
      emit()
    } else if (entries.delete(id)) {
      emit()
    }
    return () => {
      if (entries.delete(id)) emit()
    }
  }, [id, count, label])
}

/**
 * Forget unsaved changes right away: one editor's (after it saved, before it
 * navigates) or all of them (after the reader chose to discard).
 */
export function clearUnsavedChanges(id) {
  if (id === undefined) {
    if (entries.size) {
      entries.clear()
      emit()
    }
  } else if (entries.delete(id)) {
    emit()
  }
}

export const hasUnsavedChanges = () => entries.size > 0

/** [{ id, label, count }] for every editor with unsaved changes. */
export function useUnsavedEntries() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

/** True when the editor (or any editor whose id starts with `prefix`) has unsaved changes. */
export function useHasUnsaved(prefix) {
  const list = useUnsavedEntries()
  return list.some((entry) => entry.id === prefix || entry.id.startsWith(`${prefix}:`))
}
